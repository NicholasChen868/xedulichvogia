# Báo Cáo Backend — ClaudeCode
**Ngày:** 21/02/2026
**Trạng thái:** HOÀN THÀNH TẤT CẢ BACKEND TASKS

---

## Tổng Quan

Đã hoàn thành toàn bộ phần backend theo task board. Tổng cộng:
- **3 SQL migration files** mới (06, 07, 08)
- **12 Edge Functions** (Deno/TypeScript)
- **3 SQL files** nền tảng (03, 04, 05) từ batch trước

---

## 1. SQL Migrations (cần chạy trên Supabase SQL Editor)

| File | Nội dung |
|------|----------|
| `sql/03_update_match_fn.sql` | Update `match_driver()` dùng `average_rating` |
| `sql/04_admin_auth.sql` | Bảng `admin_users` + function `is_admin()` + RLS policies |
| `sql/05_rate_limiting.sql` | Bảng `rate_limits` + `check_rate_limit()` + `submit_booking_rated()` + `submit_driver_registration_rated()` |
| `sql/06_otp_table.sql` | Bảng `otp_codes` + `create_otp()` + `verify_otp()` |
| `sql/07_payments_table.sql` | Bảng `payments` + cột `deposit_status` trong bookings |
| `sql/08_tours_schema.sql` | Bảng `tour_packages` + `tour_bookings` + 3 tour mẫu seed |

**Thứ tự chạy:** 03 → 04 → 05 → 06 → 07 → 08 (có dependency)

---

## 2. Edge Functions (cần deploy lên Supabase)

### Nhóm 1: Core Business
| Function | Endpoint | Mô tả |
|----------|----------|-------|
| `booking-webhook` | POST | Webhook khi booking status thay đổi → notify, tính hoa hồng, giải phóng tài xế |
| `auto-reassign` | GET/POST | Tìm booking matched >5 phút chưa confirmed → giải phóng tài xế cũ → match lại |
| `pricing-engine` | POST | Giá động: cao điểm sáng/chiều +15%, đêm +25%, lễ +30%, Tết +50%, chiều về -15% |
| `daily-report` | GET/POST | Báo cáo ngày: đơn hàng, doanh thu, hoa hồng 10%, tài xế mới |

### Nhóm 2: Notification & Auth
| Function | Endpoint | Mô tả |
|----------|----------|-------|
| `send-notification` | POST | Gửi SMS qua eSMS.vn (4 loại: matched/confirmed/completed/driver_approved) |
| `send-otp` | POST | Tạo OTP 6 số, lưu DB, gửi SMS. Hết hạn 5 phút. Rate limit 5 OTP/giờ/SĐT |
| `verify-otp` | POST | Xác thực OTP. Tối đa 5 lần thử |

### Nhóm 3: Tích hợp
| Function | Endpoint | Mô tả |
|----------|----------|-------|
| `calculate-distance` | POST | Google Maps Distance Matrix API + fallback 14 tuyến phổ biến + cache 24h |
| `create-payment` | POST | Tạo link thanh toán đặt cọc 10% (Momo + VNPay). Lưu payment record |
| `payment-callback` | POST | Xử lý IPN callback từ Momo/VNPay/ZaloPay. Idempotent |
| `chatbot-faq` | POST | 12 câu FAQ, keyword matching, tự động gợi ý khi không tìm thấy |

### Nhóm 4: Tour
| Function | Endpoint | Mô tả |
|----------|----------|-------|
| `tour-api` | GET/POST | List tours (filter tier/category), detail by slug, book tour, custom tour request. Đa ngôn ngữ: vi/en/zh/ja/ko |

---

## 3. Secrets cần set trước khi deploy

```bash
# SMS (eSMS.vn)
supabase secrets set ESMS_API_KEY=xxx ESMS_SECRET_KEY=xxx ESMS_BRAND_NAME=TravelCar

# Google Maps
supabase secrets set GOOGLE_MAPS_API_KEY=xxx

# Momo
supabase secrets set MOMO_PARTNER_CODE=xxx MOMO_ACCESS_KEY=xxx MOMO_SECRET_KEY=xxx

# VNPay
supabase secrets set VNPAY_TMN_CODE=xxx VNPAY_HASH_SECRET=xxx
```

---

## 4. Deploy Commands

```bash
supabase link --project-ref fjcobjsgcuzbruyoaotz

# Deploy tất cả
supabase functions deploy booking-webhook
supabase functions deploy auto-reassign
supabase functions deploy pricing-engine
supabase functions deploy daily-report
supabase functions deploy send-notification
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy calculate-distance
supabase functions deploy create-payment
supabase functions deploy payment-callback
supabase functions deploy chatbot-faq
supabase functions deploy tour-api
```

---

## 5. Những gì Gravity cần làm (Frontend)

### Ưu tiên cao — Kết nối Edge Functions:
1. **Pricing calculator** → gọi `pricing-engine` thay tính local (để có giá động)
2. **OTP flow** → driver-register.html thêm bước nhập OTP trước khi submit
3. **Payment** → sau khi booking, hiện nút "Đặt cọc" → gọi `create-payment` → redirect pay_url
4. **Chatbot widget** → floating button góc phải, gọi `chatbot-faq`
5. **Distance calculation** → booking form gọi `calculate-distance` khi chọn điểm đón/trả

### Ưu tiên trung bình:
6. **Tour page** → trang tour mới, gọi `tour-api?action=list` hiện packages
7. **Tour booking form** → form đặt tour + form tour tùy chỉnh
8. **Payment result page** → `payment-result.html` hiện trạng thái thanh toán

### API Endpoints cho Frontend gọi:

```javascript
// Pricing engine
const res = await fetch(`${SUPABASE_URL}/functions/v1/pricing-engine`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
  body: JSON.stringify({ distance_km: 150, vehicle_type: 'suv-7', pickup_time: '2026-03-01T08:00:00' })
});

// OTP
await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, { method: 'POST', body: JSON.stringify({ phone: '0901234567' }) });
await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, { method: 'POST', body: JSON.stringify({ phone: '0901234567', code: '123456' }) });

// Payment
const { pay_url } = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
  method: 'POST', body: JSON.stringify({ booking_id: 'xxx', provider: 'momo' })
}).then(r => r.json());
window.location.href = pay_url;

// Chatbot
const { answer } = await fetch(`${SUPABASE_URL}/functions/v1/chatbot-faq`, {
  method: 'POST', body: JSON.stringify({ question: 'giá cước tính thế nào' })
}).then(r => r.json());

// Tour
const { tours } = await fetch(`${SUPABASE_URL}/functions/v1/tour-api?action=list&tier=basic&lang=vi`)
  .then(r => r.json());
```

---

## 6. Trạng thái Backend Tasks

| Task | Trạng thái |
|------|-----------|
| Edge Functions (5) | ✅ Code xong, chưa deploy |
| Supabase Auth admin | ✅ Code + SQL xong |
| API Rate Limiting | ✅ SQL + JS xong |
| Database triggers (rating) | ✅ Đã chạy trên DB |
| OTP xác thực SĐT | ✅ SQL + Edge Functions xong |
| Google Maps API | ✅ Edge Function xong (cần API key) |
| Payment gateway | ✅ Edge Functions + SQL xong (cần Momo/VNPay credentials) |
| Chatbot FAQ | ✅ Edge Function xong |
| Tour service | ✅ SQL schema + Edge Function + seed data xong |

**100% backend tasks hoàn thành (code level). Cần deploy + set secrets để chạy production.**

---

## 7. CI/CD + Auto Maintenance + Security Hardening

### 7.1 Vercel Security Headers (`vercel.json`)
| Header | Giá trị |
|--------|---------|
| Content-Security-Policy | default-src 'self'; script-src Supabase + CDNs; connect-src Supabase + Maps + eSMS |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=(self), payment=(self) |

### 7.2 GitHub Actions (3 workflows)

| Workflow | Trigger | Chức năng |
|----------|---------|-----------|
| `deploy-frontend.yml` | Push main (*.html, css/**, js/**) | Auto deploy Vercel + verify security headers |
| `deploy-functions.yml` | Push main (supabase/functions/**) | Auto deploy Edge Functions + health check |
| `security-scan.yml` | Daily 6:00 UTC + mỗi PR | Gitleaks scan + npm audit + code pattern scan + header check |

**Secrets cần set trong GitHub repo Settings > Secrets:**
```
VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_ANON_KEY
```

### 7.3 pg_cron Auto Maintenance (`sql/09_cron_maintenance.sql`)

| Cron Job | Schedule | Chức năng |
|----------|----------|-----------|
| `cleanup-rate-limits` | Mỗi giờ | Xóa rate limit records >24h |
| `cleanup-expired-otp` | Mỗi 30 phút | Xóa OTP hết hạn |
| `auto-reassign-stale` | Mỗi phút | Reset bookings matched >5 phút |
| `daily-stats-snapshot` | 23:59 UTC hàng ngày | Lưu thống kê ngày vào `daily_stats` |
| `auto-suspend-inactive` | 02:00 UTC hàng ngày | Suspend tài xế 0 trips + offline >30 ngày |
| `system-health-check` | Mỗi 5 phút | Log alert nếu có booking/payment stuck |

**Yêu cầu:** Enable pg_cron extension trong Supabase Dashboard > Database > Extensions.

**Bảng mới:** `daily_stats` (thống kê tự động mỗi ngày), `system_logs` (log cron + alerts)

### 7.4 Security Hardening (`sql/10_security_hardening.sql`)

**Audit Logs:**
- Bảng `audit_logs` — ghi lại mọi INSERT/UPDATE/DELETE trên payments, bookings, drivers
- Trigger tự động: `audit_payments`, `audit_bookings`, `audit_drivers`
- Ghi lại: old_data, new_data, changed_fields, user_id, timestamp
- Auto cleanup >90 ngày

**Fraud Detection:**
- `check_payment_anomaly()` — flag thanh toán >10 triệu hoặc >3 payments/giờ cùng SĐT
- `check_booking_anomaly()` — phát hiện "lốc khách" (cancel nhanh sau match, >3 cancels/24h cùng driver)

**RLS Tightening:**
- Bookings: anon chỉ được update rating fields (không đổi status/driver_id)
- Drivers: anon chỉ được update is_available (không đổi phone/name/status)
- REVOKE ALL trên audit_logs, system_logs, daily_stats, rate_limits, otp_codes cho anon

### 7.5 Health Check Endpoint (`supabase/functions/health-check/index.ts`)

```
GET /functions/v1/health-check
```

Response:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2026-02-21T...",
  "response_time_ms": 45,
  "checks": {
    "database": { "status": "ok" },
    "tables": { "bookings": "ok", "drivers": "ok", ... },
    "system_health": { "pending_bookings_stale": 0, ... },
    "edge_functions": { "status": "ok", "runtime": "deno" },
    "activity": { "bookings_24h": 5, "drivers_online": 3 }
  }
}
```

Dùng UptimeRobot/Pingdom để monitor. Returns 503 nếu unhealthy.

### 7.6 .gitignore Security

Đã chặn commit: `*.pem`, `*.key`, `*.cert`, `credentials*`, `secrets*`, `service-account*.json`, `.env.*`

### 7.7 SQL Migration Order (cập nhật)

**Thứ tự chạy:** 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10

| File | Nội dung |
|------|----------|
| `sql/09_cron_maintenance.sql` | pg_cron extension + 6 scheduled jobs + daily_stats + system_logs |
| `sql/10_security_hardening.sql` | audit_logs + triggers + fraud detection + RLS tightening + REVOKE |

---

## Tổng kết

**Backend:** 100% hoàn thành — 12 Edge Functions + 8 SQL migrations
**CI/CD:** 100% hoàn thành — 3 GitHub Actions + Vercel security headers
**Auto Maintenance:** 100% hoàn thành — 6 pg_cron jobs
**Security:** 100% hoàn thành — Audit logs + Fraud detection + RLS hardening + .gitignore

**Còn lại để go-live:**
1. Set GitHub Secrets (Vercel + Supabase tokens)
2. Enable pg_cron extension trên Supabase Dashboard
3. Chạy SQL migrations 03-10 theo thứ tự
4. Deploy Edge Functions (`supabase functions deploy`)
5. Set Edge Function secrets (eSMS, Google Maps, Momo, VNPay)

---

Chúc anh Gravity code frontend mượt mà!
— ClaudeCode
