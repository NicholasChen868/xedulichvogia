-- =============================================
-- 04: Admin Authentication via Supabase Auth
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================
-- PREREQUISITE: Create admin user via Supabase Dashboard
--   Authentication > Users > Add User
--   Email: admin@travelcar.vn | Password: (strong password)
--   Mark email as confirmed
-- Then insert UUID below.
-- =============================================

-- 1. Bảng admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin chỉ đọc được record của mình
CREATE POLICY "Admin can read own record"
  ON admin_users
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Helper function kiểm tra admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. RLS policies cho admin trên bookings và drivers
-- (Bổ sung song song với policies anon hiện có)
CREATE POLICY "Admin full access on bookings"
  ON bookings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin full access on drivers"
  ON drivers
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Insert admin user (THAY UUID sau khi tạo user trên Dashboard)
-- INSERT INTO admin_users (id, email) VALUES ('<AUTH_USER_UUID>', 'admin@travelcar.vn');
