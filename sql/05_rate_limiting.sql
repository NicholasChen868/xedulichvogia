-- =============================================
-- 05: API Rate Limiting (PostgreSQL-based)
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

-- 1. Bảng rate_limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier, action)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits (identifier, action, window_start);

-- RLS: Không tạo policy cho anon → chỉ truy cập qua SECURITY DEFINER
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Function kiểm tra rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 3600
)
RETURNS BOOLEAN AS $$
DECLARE
  v_record RECORD;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;

  SELECT * INTO v_record
  FROM rate_limits
  WHERE identifier = p_identifier AND action = p_action;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (identifier, action, request_count, window_start)
    VALUES (p_identifier, p_action, 1, now());
    RETURN TRUE;
  END IF;

  -- Window hết hạn → reset
  IF v_record.window_start < v_window_start THEN
    UPDATE rate_limits
    SET request_count = 1, window_start = now()
    WHERE identifier = p_identifier AND action = p_action;
    RETURN TRUE;
  END IF;

  -- Vượt limit
  IF v_record.request_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Tăng counter
  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE identifier = p_identifier AND action = p_action;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Wrapper: Đặt xe có rate limit (5 lần/SĐT/giờ)
CREATE OR REPLACE FUNCTION submit_booking_rated(
  p_pickup TEXT,
  p_dropoff TEXT,
  p_date_go DATE,
  p_date_return DATE DEFAULT NULL,
  p_vehicle_type TEXT DEFAULT 'sedan-4',
  p_distance_km INTEGER DEFAULT NULL,
  p_estimated_fare BIGINT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_allowed BOOLEAN;
  v_booking RECORD;
BEGIN
  -- Rate limit: 5 bookings / SĐT / giờ
  IF p_phone IS NOT NULL THEN
    v_allowed := check_rate_limit(p_phone, 'booking', 5, 3600);
    IF NOT v_allowed THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Quý khách đã đặt quá nhiều đơn. Vui lòng thử lại sau 1 giờ.'
      );
    END IF;
  END IF;

  INSERT INTO bookings (
    pickup_location, dropoff_location, date_go, date_return,
    vehicle_type, distance_km, estimated_fare, customer_phone, status
  ) VALUES (
    p_pickup, p_dropoff, p_date_go, p_date_return,
    p_vehicle_type, p_distance_km, p_estimated_fare, p_phone, 'pending'
  )
  RETURNING * INTO v_booking;

  RETURN json_build_object('success', true, 'booking', row_to_json(v_booking));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Wrapper: Đăng ký tài xế có rate limit (3 lần/SĐT/ngày)
CREATE OR REPLACE FUNCTION submit_driver_registration_rated(
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_vehicle_type TEXT DEFAULT 'sedan-4',
  p_license_plate TEXT DEFAULT '',
  p_vehicle_brand TEXT DEFAULT NULL,
  p_operating_areas TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_allowed BOOLEAN;
  v_driver RECORD;
BEGIN
  -- Rate limit: 3 đăng ký / SĐT / ngày (86400s)
  v_allowed := check_rate_limit(p_phone, 'driver_register', 3, 86400);
  IF NOT v_allowed THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 24 giờ.'
    );
  END IF;

  INSERT INTO drivers (
    full_name, phone, email, vehicle_type,
    license_plate, vehicle_brand, operating_areas, status
  ) VALUES (
    p_full_name, p_phone, p_email, p_vehicle_type,
    p_license_plate, p_vehicle_brand, p_operating_areas, 'pending'
  )
  RETURNING * INTO v_driver;

  RETURN json_build_object('success', true, 'driver', row_to_json(v_driver));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cleanup function (chạy thủ công hoặc qua pg_cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
