-- =============================================
-- 06: OTP verification cho đăng ký tài xế
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

-- 1. Bảng lưu OTP codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'driver_register',
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_action
  ON otp_codes (phone, action, expires_at);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
-- Không tạo policy cho anon → chỉ truy cập qua SECURITY DEFINER

-- 2. Function gửi OTP (tạo code, lưu DB)
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

  -- Tạo OTP 6 số
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Lưu vào DB, hết hạn sau 5 phút
  INSERT INTO otp_codes (phone, code, action, expires_at)
  VALUES (p_phone, v_code, p_action, now() + INTERVAL '5 minutes');

  RETURN json_build_object('success', true, 'code', v_code, 'expires_in', 300);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function verify OTP
CREATE OR REPLACE FUNCTION verify_otp(
  p_phone TEXT,
  p_code TEXT,
  p_action TEXT DEFAULT 'driver_register'
)
RETURNS JSON AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Tìm OTP mới nhất chưa verify, chưa hết hạn
  SELECT * INTO v_record
  FROM otp_codes
  WHERE phone = p_phone
    AND action = p_action
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'OTP không tồn tại hoặc đã hết hạn.');
  END IF;

  -- Kiểm tra số lần thử (tối đa 5)
  IF v_record.attempts >= 5 THEN
    UPDATE otp_codes SET verified = true WHERE id = v_record.id;
    RETURN json_build_object('success', false, 'error', 'Nhập sai quá nhiều lần. Vui lòng gửi OTP mới.');
  END IF;

  -- Tăng attempts
  UPDATE otp_codes SET attempts = attempts + 1 WHERE id = v_record.id;

  -- So sánh code
  IF v_record.code = p_code THEN
    UPDATE otp_codes SET verified = true WHERE id = v_record.id;
    RETURN json_build_object('success', true, 'message', 'Xác thực thành công!');
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Mã OTP không đúng. Còn ' || (5 - v_record.attempts) || ' lần thử.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Cleanup OTP hết hạn
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
