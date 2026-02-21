-- =============================================
-- 13: Security Phase 4 — Production Hardening Notes
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

-- =============================================
-- 1. DATABASE NETWORK RESTRICTIONS
-- =============================================
-- Configure in Supabase Dashboard > Database > Network
-- - Restrict direct DB access to known IPs only
-- - Allow: CI/CD runner IPs, admin workstation IPs
-- - Block: All other public IPs
-- - Use connection string from Supabase Dashboard only
--
-- Go to: Settings > Database > Connection info
-- Enable: "Enforce SSL" for all connections
--
-- ALTER SYSTEM SET ssl = on;
-- ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.2';

-- =============================================
-- 2. CONNECTION POOLER
-- =============================================
-- Use Supabase's built-in PgBouncer for connection pooling
-- In Supabase Dashboard > Settings > Database > Connection Pooling
-- - Enable: Transaction mode (recommended for Edge Functions)
-- - Pool size: 15-25 (depending on plan)
-- - Use pooler connection string (port 6543) in Edge Functions
-- - Use direct connection (port 5432) for migrations only

-- =============================================
-- 3. ENVIRONMENT VARIABLES CHECKLIST (Production)
-- =============================================
-- Set via: supabase secrets set KEY=VALUE
--
-- Payment (SWITCH FROM SANDBOX TO PRODUCTION):
--   MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create
--   MOMO_PARTNER_CODE=<production_code>
--   MOMO_ACCESS_KEY=<production_key>
--   MOMO_SECRET_KEY=<production_secret>
--
--   VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
--   VNPAY_TMN_CODE=<production_code>
--   VNPAY_HASH_SECRET=<production_secret>
--
--   ZALOPAY_APP_ID=<production_id>
--   ZALOPAY_KEY1=<production_key1>
--   ZALOPAY_KEY2=<production_key2>
--
-- Health Check:
--   HEALTH_CHECK_KEY=<random_32_char_key>
--
-- SMS:
--   ESMS_API_KEY=<production_key>
--   ESMS_SECRET_KEY=<production_secret>

-- =============================================
-- 4. AUDIT LOG TABLE (recommended for compliance)
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  actor_type TEXT DEFAULT 'system', -- 'admin', 'driver', 'customer', 'system'
  actor_id TEXT, -- admin user ID, phone, etc.
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying recent activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- RLS: Only admin can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;
CREATE POLICY "Admin read audit logs"
  ON audit_logs
  FOR SELECT
  USING (is_admin());

-- Allow service_role to insert (Edge Functions log events)
DROP POLICY IF EXISTS "Service insert audit logs" ON audit_logs;
CREATE POLICY "Service insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 5. AUTO-CLEANUP EXPIRED DATA (pg_cron)
-- =============================================
-- Clean up expired OTP codes (run daily)
-- SELECT cron.schedule(
--   'cleanup-expired-otps',
--   '0 3 * * *',  -- 3 AM daily
--   $$DELETE FROM otp_codes WHERE expires_at < now() - interval '1 day'$$
-- );
--
-- Clean up old rate limit entries (run daily)
-- SELECT cron.schedule(
--   'cleanup-rate-limits',
--   '0 4 * * *',  -- 4 AM daily
--   $$DELETE FROM rate_limits WHERE window_start < now() - interval '24 hours'$$
-- );
