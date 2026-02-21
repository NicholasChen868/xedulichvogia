-- =============================================
-- 11: Security Phase 1 — Critical Fixes
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================
-- Fixes:
--   1. REVOKE EXECUTE on SECURITY DEFINER functions from anon/public
--   2. Remove OTP code from create_otp() response
--   3. Use gen_random_bytes() for OTP generation (cryptographically secure)
--   4. Add driver_login_otp action support for driver authentication

-- =============================================
-- 1. REVOKE EXECUTE ON DANGEROUS FUNCTIONS FROM anon/public
-- =============================================
-- PostgreSQL grants EXECUTE to PUBLIC by default.
-- We must explicitly REVOKE and only GRANT to roles that need them.

-- Administrative/maintenance functions — ONLY service_role / authenticated (admin)
REVOKE EXECUTE ON FUNCTION match_driver(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION create_otp(TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION verify_otp(TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION cleanup_expired_otp() FROM anon, public;
REVOKE EXECUTE ON FUNCTION cleanup_rate_limits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION auto_reassign_stale_bookings() FROM anon, public;
REVOKE EXECUTE ON FUNCTION save_daily_stats_snapshot() FROM anon, public;
REVOKE EXECUTE ON FUNCTION auto_suspend_inactive_drivers() FROM anon, public;
REVOKE EXECUTE ON FUNCTION cleanup_old_audit_logs() FROM anon, public;
REVOKE EXECUTE ON FUNCTION log_audit_event() FROM anon, public;
REVOKE EXECUTE ON FUNCTION check_payment_anomaly() FROM anon, public;
REVOKE EXECUTE ON FUNCTION check_booking_anomaly() FROM anon, public;

-- match_driver: Only admin (authenticated) and service_role should call this
GRANT EXECUTE ON FUNCTION match_driver(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION match_driver(UUID) TO service_role;

-- OTP functions: Only service_role (Edge Functions call these)
GRANT EXECUTE ON FUNCTION create_otp(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION verify_otp(TEXT, TEXT, TEXT) TO service_role;

-- Cleanup/maintenance: Only service_role (called by cron/edge functions)
GRANT EXECUTE ON FUNCTION cleanup_expired_otp() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION auto_reassign_stale_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION save_daily_stats_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION auto_suspend_inactive_drivers() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;

-- Trigger functions: These are invoked by triggers, not by users directly
-- No explicit GRANT needed for trigger functions (they run as trigger owner)

-- system_health_check: Only authenticated admin
REVOKE EXECUTE ON FUNCTION system_health_check() FROM anon, public;
GRANT EXECUTE ON FUNCTION system_health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION system_health_check() TO service_role;

-- Functions that anon CAN call (explicitly confirm):
-- check_rate_limit: called inside submit_booking_rated (SECURITY DEFINER)
--   but also called directly, so keep for anon
-- submit_booking_rated: main booking endpoint for customers
-- submit_driver_registration_rated: driver registration endpoint
-- is_admin(): used in RLS policies, needs to be callable

-- =============================================
-- 2. FIX create_otp() — Remove OTP code from response
--    + Use gen_random_bytes() instead of random()
-- =============================================

CREATE OR REPLACE FUNCTION create_otp(
  p_phone TEXT,
  p_action TEXT DEFAULT 'driver_register'
)
RETURNS JSON AS $$
DECLARE
  v_code TEXT;
  v_rate_ok BOOLEAN;
BEGIN
  -- Rate limit: tối đa 5 OTP / SĐT / giờ
  v_rate_ok := check_rate_limit(p_phone, 'otp_' || p_action, 5, 3600);
  IF NOT v_rate_ok THEN
    RETURN json_build_object('success', false, 'error', 'Gửi OTP quá nhiều lần. Thử lại sau 1 giờ.');
  END IF;

  -- Hủy OTP cũ chưa dùng
  UPDATE otp_codes SET verified = true
  WHERE phone = p_phone AND action = p_action AND verified = false;

  -- Tạo OTP 6 số — cryptographically secure
  v_code := lpad((floor(('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');

  -- Lưu vào DB, hết hạn sau 5 phút
  INSERT INTO otp_codes (phone, code, action, expires_at)
  VALUES (p_phone, v_code, p_action, now() + INTERVAL '5 minutes');

  -- SECURITY: Chỉ trả success + thời gian hết hạn. KHÔNG trả code.
  -- OTP code chỉ được gửi qua SMS bởi Edge Function.
  RETURN json_build_object('success', true, 'expires_in', 300);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. FIX send-otp Edge Function phải lấy OTP code từ DB
-- =============================================
-- Vì create_otp() không còn trả code, Edge Function send-otp
-- cần query trực tiếp bảng otp_codes qua service_role.
-- Xem file: supabase/functions/send-otp/index.ts

-- =============================================
-- 4. Thêm verification cho action 'driver_login'
-- =============================================
-- verify_otp đã hỗ trợ action parameter, chỉ cần dùng action='driver_login'
-- khi gọi create_otp và verify_otp cho flow driver login.
-- Không cần thay đổi function verify_otp.
