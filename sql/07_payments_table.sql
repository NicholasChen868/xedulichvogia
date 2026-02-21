-- =============================================
-- 07: Bảng payments cho đặt cọc + thanh toán
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  amount BIGINT NOT NULL,
  deposit_amount BIGINT NOT NULL,          -- 10% đặt cọc
  provider TEXT NOT NULL,                   -- 'momo', 'vnpay', 'zalopay'
  provider_order_id TEXT,                   -- Mã giao dịch từ provider
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, paid, failed, refunded
  pay_url TEXT,                             -- Link thanh toán
  callback_data JSONB,                      -- Dữ liệu IPN callback
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payments (provider, provider_order_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Cho phép anon đọc payment theo booking_id (khách check trạng thái)
CREATE POLICY "Public read own payment"
  ON payments
  FOR SELECT
  USING (true);

-- Chỉ SECURITY DEFINER functions mới INSERT/UPDATE
-- Admin full access
CREATE POLICY "Admin full payments"
  ON payments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Thêm cột deposit vào bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none';
-- none, pending, paid, refunded
