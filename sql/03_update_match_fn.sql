-- =============================================
-- 03: Update match_driver() to use average_rating
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

CREATE OR REPLACE FUNCTION match_driver(p_booking_id UUID)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_driver RECORD;
BEGIN
  SELECT * INTO v_booking FROM bookings
  WHERE id = p_booking_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Booking not found or not pending');
  END IF;

  SELECT d.* INTO v_driver FROM drivers d
  WHERE d.status = 'active'
    AND d.is_available = true
    AND d.vehicle_type = v_booking.vehicle_type
  ORDER BY d.total_trips ASC, d.average_rating DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No available driver found');
  END IF;

  UPDATE bookings
  SET driver_id = v_driver.id, status = 'matched',
      matched_at = now(), updated_at = now()
  WHERE id = p_booking_id;

  UPDATE drivers
  SET is_available = false, updated_at = now()
  WHERE id = v_driver.id;

  RETURN json_build_object(
    'success', true,
    'driver_id', v_driver.id,
    'driver_name', v_driver.full_name,
    'driver_phone', v_driver.phone,
    'driver_vehicle', v_driver.license_plate
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
