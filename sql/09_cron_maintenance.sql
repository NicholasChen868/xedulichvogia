-- =============================================
-- 09: Cron Jobs Auto Maintenance (pg_cron)
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- Yêu cầu: Enable pg_cron extension trong Supabase Dashboard
--   → Database → Extensions → pg_cron → Enable
-- =============================================

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant cron schema usage
GRANT USAGE ON SCHEMA cron TO postgres;

-- =============================================
-- MAINTENANCE FUNCTIONS
-- =============================================

-- 2. Cleanup rate limits (đã có trong 05, gọi lại qua cron)
-- cleanup_rate_limits() đã tạo ở sql/05

-- 3. Cleanup expired OTP (đã có trong 06, gọi lại qua cron)
-- cleanup_expired_otp() đã tạo ở sql/06

-- 4. Auto reassign stale bookings (SQL version)
-- Bookings matched >5 phút mà tài xế không confirm → reset về pending
CREATE OR REPLACE FUNCTION auto_reassign_stale_bookings()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH stale AS (
    UPDATE bookings
    SET
      status = 'pending',
      driver_id = NULL,
      updated_at = now()
    WHERE
      status = 'matched'
      AND updated_at < now() - INTERVAL '5 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM stale;

  -- Log nếu có reassign
  IF v_count > 0 THEN
    INSERT INTO system_logs (event, details, created_at)
    VALUES (
      'auto_reassign',
      json_build_object('count', v_count, 'timestamp', now())::TEXT,
      now()
    );
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Daily stats snapshot — lưu thống kê mỗi ngày
CREATE TABLE IF NOT EXISTS daily_stats (
  id BIGSERIAL PRIMARY KEY,
  stat_date DATE NOT NULL UNIQUE,
  total_bookings INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  total_revenue BIGINT DEFAULT 0,
  platform_commission BIGINT DEFAULT 0,
  new_drivers INTEGER DEFAULT 0,
  active_drivers INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_payments_received BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read stats"
  ON daily_stats
  FOR SELECT
  USING (is_admin());

CREATE OR REPLACE FUNCTION save_daily_stats_snapshot()
RETURNS void AS $$
DECLARE
  v_date DATE := CURRENT_DATE - INTERVAL '1 day';
  v_total INTEGER;
  v_completed INTEGER;
  v_cancelled INTEGER;
  v_revenue BIGINT;
  v_commission BIGINT;
  v_new_drivers INTEGER;
  v_active_drivers INTEGER;
  v_avg_rating NUMERIC;
  v_payments BIGINT;
BEGIN
  -- Đếm bookings ngày hôm qua
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_total, v_completed, v_cancelled
  FROM bookings
  WHERE created_at::DATE = v_date;

  -- Doanh thu (từ bookings completed)
  SELECT COALESCE(SUM(estimated_fare), 0) INTO v_revenue
  FROM bookings
  WHERE status = 'completed' AND created_at::DATE = v_date;

  v_commission := v_revenue * 10 / 100;

  -- Tài xế mới đăng ký
  SELECT COUNT(*) INTO v_new_drivers
  FROM drivers
  WHERE created_at::DATE = v_date;

  -- Tài xế active (có chuyến trong 7 ngày)
  SELECT COUNT(*) INTO v_active_drivers
  FROM drivers
  WHERE status = 'approved'
    AND total_trips > 0
    AND updated_at > now() - INTERVAL '7 days';

  -- Rating trung bình
  SELECT COALESCE(AVG(average_rating), 0) INTO v_avg_rating
  FROM drivers
  WHERE status = 'approved' AND total_ratings > 0;

  -- Thanh toán đã nhận
  SELECT COALESCE(SUM(deposit_amount), 0) INTO v_payments
  FROM payments
  WHERE status = 'paid' AND paid_at::DATE = v_date;

  -- Upsert
  INSERT INTO daily_stats (
    stat_date, total_bookings, completed_bookings, cancelled_bookings,
    total_revenue, platform_commission, new_drivers, active_drivers,
    average_rating, total_payments_received
  ) VALUES (
    v_date, v_total, v_completed, v_cancelled,
    v_revenue, v_commission, v_new_drivers, v_active_drivers,
    v_avg_rating, v_payments
  )
  ON CONFLICT (stat_date) DO UPDATE SET
    total_bookings = EXCLUDED.total_bookings,
    completed_bookings = EXCLUDED.completed_bookings,
    cancelled_bookings = EXCLUDED.cancelled_bookings,
    total_revenue = EXCLUDED.total_revenue,
    platform_commission = EXCLUDED.platform_commission,
    new_drivers = EXCLUDED.new_drivers,
    active_drivers = EXCLUDED.active_drivers,
    average_rating = EXCLUDED.average_rating,
    total_payments_received = EXCLUDED.total_payments_received;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Auto suspend tài xế inactive >30 ngày
CREATE OR REPLACE FUNCTION auto_suspend_inactive_drivers()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH suspended AS (
    UPDATE drivers
    SET
      status = 'suspended',
      updated_at = now()
    WHERE
      status = 'approved'
      AND updated_at < now() - INTERVAL '30 days'
      AND total_trips = 0
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM suspended;

  IF v_count > 0 THEN
    INSERT INTO system_logs (event, details, created_at)
    VALUES (
      'auto_suspend_inactive',
      json_build_object('count', v_count, 'timestamp', now())::TEXT,
      now()
    );
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. System health check function
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS JSON AS $$
DECLARE
  v_pending_bookings INTEGER;
  v_stale_bookings INTEGER;
  v_pending_payments INTEGER;
  v_online_idle_drivers INTEGER;
  v_alerts JSON[];
BEGIN
  -- Bookings pending >1 giờ
  SELECT COUNT(*) INTO v_pending_bookings
  FROM bookings
  WHERE status = 'pending' AND created_at < now() - INTERVAL '1 hour';

  IF v_pending_bookings > 0 THEN
    v_alerts := array_append(v_alerts,
      json_build_object('level', 'warning', 'message',
        v_pending_bookings || ' booking(s) pending hơn 1 giờ')
    );
  END IF;

  -- Bookings matched >10 phút (should have been auto-reassigned)
  SELECT COUNT(*) INTO v_stale_bookings
  FROM bookings
  WHERE status = 'matched' AND updated_at < now() - INTERVAL '10 minutes';

  IF v_stale_bookings > 0 THEN
    v_alerts := array_append(v_alerts,
      json_build_object('level', 'error', 'message',
        v_stale_bookings || ' booking(s) stuck ở matched >10 phút')
    );
  END IF;

  -- Payments pending >30 phút
  SELECT COUNT(*) INTO v_pending_payments
  FROM payments
  WHERE status = 'pending' AND created_at < now() - INTERVAL '30 minutes';

  IF v_pending_payments > 0 THEN
    v_alerts := array_append(v_alerts,
      json_build_object('level', 'warning', 'message',
        v_pending_payments || ' payment(s) pending hơn 30 phút')
    );
  END IF;

  -- Tài xế online nhưng 0 trips (potential issues)
  SELECT COUNT(*) INTO v_online_idle_drivers
  FROM drivers
  WHERE status = 'approved'
    AND is_available = true
    AND total_trips = 0
    AND created_at < now() - INTERVAL '7 days';

  RETURN json_build_object(
    'status', CASE
      WHEN v_alerts IS NULL OR array_length(v_alerts, 1) IS NULL THEN 'healthy'
      ELSE 'warning'
    END,
    'timestamp', now(),
    'metrics', json_build_object(
      'pending_bookings_stale', v_pending_bookings,
      'stuck_matched_bookings', v_stale_bookings,
      'pending_payments_stale', v_pending_payments,
      'idle_available_drivers', v_online_idle_drivers
    ),
    'alerts', COALESCE(to_json(v_alerts), '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. System logs table (cho cron jobs ghi log)
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_event ON system_logs (event, created_at DESC);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read logs"
  ON system_logs
  FOR SELECT
  USING (is_admin());

-- =============================================
-- SCHEDULE CRON JOBS
-- =============================================

-- Cleanup rate limits — mỗi giờ
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  $$SELECT cleanup_rate_limits()$$
);

-- Cleanup expired OTP — mỗi 30 phút
SELECT cron.schedule(
  'cleanup-expired-otp',
  '*/30 * * * *',
  $$SELECT cleanup_expired_otp()$$
);

-- Auto reassign stale bookings — mỗi phút
SELECT cron.schedule(
  'auto-reassign-stale',
  '* * * * *',
  $$SELECT auto_reassign_stale_bookings()$$
);

-- Daily stats snapshot — 23:59 mỗi ngày (UTC, = 06:59 VN)
SELECT cron.schedule(
  'daily-stats-snapshot',
  '59 23 * * *',
  $$SELECT save_daily_stats_snapshot()$$
);

-- Auto suspend inactive drivers — 02:00 UTC mỗi ngày (09:00 VN)
SELECT cron.schedule(
  'auto-suspend-inactive',
  '0 2 * * *',
  $$SELECT auto_suspend_inactive_drivers()$$
);

-- System health check — mỗi 5 phút (ghi log nếu có vấn đề)
SELECT cron.schedule(
  'system-health-check',
  '*/5 * * * *',
  $$
  DO $$
  DECLARE
    v_result JSON;
  BEGIN
    v_result := system_health_check();
    IF v_result->>'status' != 'healthy' THEN
      INSERT INTO system_logs (event, details, created_at)
      VALUES ('health_check_alert', v_result::TEXT, now());
    END IF;
  END $$;
  $$
);

-- =============================================
-- VERIFY: Liệt kê tất cả cron jobs
-- =============================================
-- SELECT * FROM cron.job ORDER BY jobid;
