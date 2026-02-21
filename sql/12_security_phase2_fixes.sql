-- =============================================
-- 12: Security Phase 2 — RLS Fixes + IDOR Protection
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

-- =============================================
-- 1. FIX PAYMENTS RLS: Scope reads by customer_phone
-- =============================================
-- Old policy: USING(true) → anyone reads ALL payments
-- New: customer can only read their own payments by phone

DROP POLICY IF EXISTS "Public read own payment" ON payments;

CREATE POLICY "Customer read own payment"
  ON payments
  FOR SELECT
  USING (
    -- Customer can read by matching phone from request header
    customer_phone = current_setting('request.header.x-customer-phone', true)
    -- Or via booking_id from query params
    OR booking_id IN (
      SELECT id FROM bookings
      WHERE customer_phone = current_setting('request.header.x-customer-phone', true)
    )
    -- Admin full access
    OR is_admin()
  );

-- =============================================
-- 2. FIX TOUR_BOOKINGS RLS: Scope reads by customer_phone
-- =============================================
-- Old policy: USING(true) for SELECT → anyone reads ALL tour bookings
-- New: customer can only read their own

DROP POLICY IF EXISTS "Public read own tour booking" ON tour_bookings;

CREATE POLICY "Customer read own tour booking"
  ON tour_bookings
  FOR SELECT
  USING (
    customer_phone = current_setting('request.header.x-customer-phone', true)
    OR is_admin()
  );

-- =============================================
-- 3. FIX BOOKINGS UPDATE POLICY
-- Replace broken self-referencing subquery with SECURITY DEFINER function
-- =============================================

DROP POLICY IF EXISTS "Allow customer update rating" ON bookings;

-- Strict policy: anon can ONLY update via the secure function below
-- Admin can update anything
CREATE POLICY "Admin update bookings"
  ON bookings
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Secure function for customer rating (called from frontend)
CREATE OR REPLACE FUNCTION submit_customer_rating(
  p_booking_id UUID,
  p_customer_phone TEXT,
  p_rating INTEGER,
  p_review_text TEXT DEFAULT ''
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Validate rating range
  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN json_build_object('success', false, 'error', 'Rating phải từ 1 đến 5');
  END IF;

  -- Find booking and verify ownership
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
    AND customer_phone = p_customer_phone
    AND status = 'completed';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy chuyến đi hoặc chưa hoàn thành');
  END IF;

  -- Check if already rated
  IF v_booking.rating IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Chuyến đi đã được đánh giá');
  END IF;

  -- Update rating
  UPDATE bookings
  SET rating = p_rating,
      review_text = p_review_text,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Update driver average rating
  IF v_booking.driver_id IS NOT NULL THEN
    UPDATE drivers
    SET average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM bookings
      WHERE driver_id = v_booking.driver_id AND rating IS NOT NULL
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM bookings
      WHERE driver_id = v_booking.driver_id AND rating IS NOT NULL
    )
    WHERE id = v_booking.driver_id;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Đánh giá thành công!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to anon (customers call this from frontend)
GRANT EXECUTE ON FUNCTION submit_customer_rating(UUID, TEXT, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_customer_rating(UUID, TEXT, INTEGER, TEXT) TO service_role;

-- =============================================
-- 4. FIX DRIVERS UPDATE POLICY
-- Replace broken self-referencing subquery with SECURITY DEFINER function
-- =============================================

DROP POLICY IF EXISTS "Driver update availability" ON drivers;

-- Only admin can directly UPDATE drivers
CREATE POLICY "Admin update drivers"
  ON drivers
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Secure function for driver toggling their own availability
CREATE OR REPLACE FUNCTION toggle_driver_availability(
  p_driver_id UUID,
  p_phone TEXT,
  p_is_available BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_driver RECORD;
BEGIN
  -- Verify driver owns this record
  SELECT * INTO v_driver
  FROM drivers
  WHERE id = p_driver_id
    AND phone = p_phone
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tài xế không tồn tại hoặc chưa được duyệt');
  END IF;

  UPDATE drivers
  SET is_available = p_is_available,
      updated_at = now()
  WHERE id = p_driver_id;

  RETURN json_build_object('success', true, 'is_available', p_is_available);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION toggle_driver_availability(UUID, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION toggle_driver_availability(UUID, TEXT, BOOLEAN) TO service_role;

-- =============================================
-- 5. FIX BOOKINGS: Secure reportPickup function
-- Prevents IDOR — driver can only update their own assigned bookings
-- =============================================

CREATE OR REPLACE FUNCTION driver_report_pickup(
  p_booking_id UUID,
  p_driver_id UUID,
  p_driver_phone TEXT
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Verify driver owns this booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
    AND driver_id = p_driver_id
    AND status = 'confirmed';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Không tìm thấy chuyến đi hoặc chưa được xác nhận');
  END IF;

  -- Verify driver identity
  IF NOT EXISTS (
    SELECT 1 FROM drivers WHERE id = p_driver_id AND phone = p_driver_phone AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Xác thực tài xế thất bại');
  END IF;

  UPDATE bookings
  SET status = 'in_progress',
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN json_build_object('success', true, 'message', 'Đã báo đón khách');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION driver_report_pickup(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION driver_report_pickup(UUID, UUID, TEXT) TO service_role;

-- =============================================
-- 6. FIX RATE LIMITING: Atomic + Require phone
-- =============================================

-- Replace check_rate_limit with atomic INSERT ON CONFLICT (no TOCTOU)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 3600
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Atomic upsert: INSERT or UPDATE in one statement (no TOCTOU race)
  INSERT INTO rate_limits (identifier, action, request_count, window_start)
  VALUES (p_identifier, p_action, 1, now())
  ON CONFLICT (identifier, action) DO UPDATE
  SET
    request_count = CASE
      WHEN rate_limits.window_start < v_window_start THEN 1  -- Window expired, reset
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < v_window_start THEN now()  -- Reset window
      ELSE rate_limits.window_start
    END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix submit_booking_rated: Require phone (no NULL bypass)
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
  -- SECURITY: Phone is required for rate limiting
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Số điện thoại là bắt buộc.'
    );
  END IF;

  -- Rate limit: 5 bookings / SĐT / giờ (atomic, no TOCTOU)
  v_allowed := check_rate_limit(p_phone, 'booking', 5, 3600);
  IF NOT v_allowed THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Quý khách đã đặt quá nhiều đơn. Vui lòng thử lại sau 1 giờ.'
    );
  END IF;

  INSERT INTO bookings (
    pickup_location, dropoff_location, date_go, date_return,
    vehicle_type, distance_km, estimated_fare, customer_phone, customer_name, status
  ) VALUES (
    p_pickup, p_dropoff, p_date_go, p_date_return,
    p_vehicle_type, p_distance_km, p_estimated_fare, p_phone, p_customer_name, 'pending'
  )
  RETURNING * INTO v_booking;

  RETURN json_build_object('success', true, 'booking', row_to_json(v_booking));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
