-- =============================================
-- 10: Security Hardening — Audit Logs + RLS Tightening
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

-- =============================================
-- 1. AUDIT LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,          -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID,                  -- Supabase Auth user (nếu có)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record
  ON audit_logs (table_name, record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_created
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_logs (action, table_name);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Chỉ admin đọc được audit logs
CREATE POLICY "Admin read audit"
  ON audit_logs
  FOR SELECT
  USING (is_admin());

-- =============================================
-- 2. AUDIT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_changed TEXT[];
  v_record_id TEXT;
  v_key TEXT;
BEGIN
  -- Xác định record ID
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE(OLD.id::TEXT, '');
  ELSE
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(NEW.id::TEXT, '');
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    -- Tìm các fields thay đổi
    FOR v_key IN SELECT jsonb_object_keys(v_new)
    LOOP
      IF v_old->v_key IS DISTINCT FROM v_new->v_key THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO audit_logs (
    table_name, record_id, action,
    old_data, new_data, changed_fields,
    user_id, created_at
  ) VALUES (
    TG_TABLE_NAME, v_record_id, TG_OP,
    v_old, v_new, v_changed,
    auth.uid(), now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. ATTACH AUDIT TRIGGERS
-- =============================================

-- Audit trên payments (quan trọng nhất — liên quan tiền)
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Audit trên bookings (thay đổi status, driver assignment)
DROP TRIGGER IF EXISTS audit_bookings ON bookings;
CREATE TRIGGER audit_bookings
  AFTER UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Audit trên drivers (approval, suspension, thay đổi thông tin)
DROP TRIGGER IF EXISTS audit_drivers ON drivers;
CREATE TRIGGER audit_drivers
  AFTER UPDATE OR DELETE ON drivers
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- =============================================
-- 4. RLS TIGHTENING — Thu hẹp quyền UPDATE
-- =============================================

-- 4a. Bookings: anon chỉ được update rating + rating_comment
-- Drop policy cũ nếu có
DROP POLICY IF EXISTS "Public update own booking" ON bookings;
DROP POLICY IF EXISTS "Allow customer update rating" ON bookings;

CREATE POLICY "Allow customer update rating"
  ON bookings
  FOR UPDATE
  USING (true)
  WITH CHECK (
    -- Chỉ cho update rating fields
    -- So sánh: các trường khác phải giữ nguyên
    (
      status = (SELECT status FROM bookings WHERE id = bookings.id)
      AND driver_id IS NOT DISTINCT FROM (SELECT driver_id FROM bookings WHERE id = bookings.id)
      AND pickup_location = (SELECT pickup_location FROM bookings WHERE id = bookings.id)
      AND dropoff_location = (SELECT dropoff_location FROM bookings WHERE id = bookings.id)
    )
    OR is_admin()
  );

-- 4b. Drivers: anon chỉ được update is_available
DROP POLICY IF EXISTS "Public update own driver" ON drivers;
DROP POLICY IF EXISTS "Driver update availability" ON drivers;

CREATE POLICY "Driver update availability"
  ON drivers
  FOR UPDATE
  USING (true)
  WITH CHECK (
    (
      -- Chỉ cho thay đổi is_available
      full_name = (SELECT full_name FROM drivers WHERE id = drivers.id)
      AND phone = (SELECT phone FROM drivers WHERE id = drivers.id)
      AND status = (SELECT status FROM drivers WHERE id = drivers.id)
    )
    OR is_admin()
  );

-- =============================================
-- 5. PAYMENT FRAUD DETECTION
-- =============================================

-- Function phát hiện thanh toán bất thường
CREATE OR REPLACE FUNCTION check_payment_anomaly()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag: thanh toán >10 triệu
  IF NEW.amount > 10000000 THEN
    INSERT INTO system_logs (event, details, created_at)
    VALUES (
      'payment_anomaly_high_amount',
      json_build_object(
        'payment_id', NEW.id,
        'booking_id', NEW.booking_id,
        'amount', NEW.amount,
        'provider', NEW.provider
      )::TEXT,
      now()
    );
  END IF;

  -- Flag: nhiều payments cùng phone trong 1 giờ
  IF (
    SELECT COUNT(*) FROM payments
    WHERE customer_phone = NEW.customer_phone
      AND created_at > now() - INTERVAL '1 hour'
  ) > 3 THEN
    INSERT INTO system_logs (event, details, created_at)
    VALUES (
      'payment_anomaly_rapid_transactions',
      json_build_object(
        'payment_id', NEW.id,
        'phone', NEW.customer_phone,
        'count_1hr', (
          SELECT COUNT(*) FROM payments
          WHERE customer_phone = NEW.customer_phone
            AND created_at > now() - INTERVAL '1 hour'
        )
      )::TEXT,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_payment_fraud ON payments;
CREATE TRIGGER check_payment_fraud
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION check_payment_anomaly();

-- =============================================
-- 6. BOOKING FRAUD DETECTION
-- =============================================

-- Phát hiện "lốc khách" — tài xế lấy khách riêng
CREATE OR REPLACE FUNCTION check_booking_anomaly()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag: booking bị cancel ngay sau khi matched (tài xế cancel để lấy khách riêng)
  IF NEW.status = 'cancelled' AND OLD.status = 'matched' THEN
    IF OLD.updated_at > now() - INTERVAL '2 minutes' THEN
      INSERT INTO system_logs (event, details, created_at)
      VALUES (
        'booking_anomaly_quick_cancel',
        json_build_object(
          'booking_id', NEW.id,
          'driver_id', OLD.driver_id,
          'matched_at', OLD.updated_at,
          'cancelled_at', now(),
          'seconds_to_cancel', EXTRACT(EPOCH FROM (now() - OLD.updated_at))
        )::TEXT,
        now()
      );
    END IF;
  END IF;

  -- Flag: cùng driver cancel >3 lần trong 24h
  IF NEW.status = 'cancelled' AND OLD.driver_id IS NOT NULL THEN
    IF (
      SELECT COUNT(*) FROM bookings
      WHERE driver_id = OLD.driver_id
        AND status = 'cancelled'
        AND updated_at > now() - INTERVAL '24 hours'
    ) > 3 THEN
      INSERT INTO system_logs (event, details, created_at)
      VALUES (
        'booking_anomaly_driver_many_cancels',
        json_build_object(
          'driver_id', OLD.driver_id,
          'booking_id', NEW.id,
          'cancels_24h', (
            SELECT COUNT(*) FROM bookings
            WHERE driver_id = OLD.driver_id
              AND status = 'cancelled'
              AND updated_at > now() - INTERVAL '24 hours'
          )
        )::TEXT,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_booking_fraud ON bookings;
CREATE TRIGGER check_booking_fraud
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_anomaly();

-- =============================================
-- 7. CLEANUP OLD AUDIT LOGS (>90 ngày)
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM audit_logs
    WHERE created_at < now() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup mỗi tuần (Chủ nhật 03:00 UTC)
-- Chạy sau khi đã setup pg_cron ở file 09
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 * * 0', $$SELECT cleanup_old_audit_logs()$$);

-- =============================================
-- 8. REVOKE UNNECESSARY PERMISSIONS
-- =============================================

-- Đảm bảo anon không truy cập trực tiếp các bảng nhạy cảm
REVOKE ALL ON audit_logs FROM anon;
REVOKE ALL ON system_logs FROM anon;
REVOKE ALL ON daily_stats FROM anon;
REVOKE ALL ON rate_limits FROM anon;
REVOKE ALL ON otp_codes FROM anon;

-- Chỉ cho phép qua SECURITY DEFINER functions
GRANT EXECUTE ON FUNCTION check_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION submit_booking_rated TO anon;
GRANT EXECUTE ON FUNCTION submit_driver_registration_rated TO anon;
GRANT EXECUTE ON FUNCTION system_health_check TO authenticated;
