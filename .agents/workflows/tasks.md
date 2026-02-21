---
description: Danh sách tasks và phân công cho dự án TravelCar
---

# 📋 Task Board — TravelCar
> Cập nhật: 21/02/2026 | Deadline: 2 tuần (demo trước khi tung thị trường)

---

## ✅ ĐÃ HOÀN THÀNH

### Frontend (Antigravity)
- [x] Landing page + Booking form (index.html)
- [x] Trang đăng ký tài xế (driver-register.html)
- [x] Driver Dashboard — đăng nhập SĐT, xem/nhận/từ chối cuốc (driver-dashboard.html)
- [x] Admin Dashboard — thống kê, quản lý bookings + drivers (admin.html)
- [x] Icon user dropdown menu trên navbar (đăng nhập/đăng xuất Admin)
- [x] Link Admin trong footer
- [x] Dark theme premium + responsive
- [x] Bảng giá calculator theo km
- [x] **Tra cứu đơn bằng SĐT** — lookup section + kết quả card ✅ 21/02
- [x] **Trang xác nhận booking** — modal hiện chi tiết + tài xế ✅ 21/02
- [x] **Upload hình xe + giấy tờ** — chụp/tải, preview thumbnails ✅ 21/02
- [x] **Báo điểm đón/trả khách** — 3 bước: nhận → đón → trả ✅ 21/02
- [x] **Tổng hợp thu nhập** — tab earnings ngày/tuần/tháng/tổng ✅ 21/02
- [x] **Trang "Về chúng tôi"** — sứ mệnh, giá trị, dịch vụ, B2B ✅ 21/02
- [x] **Trang "Chính sách"** — giá cước, thanh toán, quy chế, hủy đơn ✅ 21/02
- [x] **Section cho thuê xe doanh nghiệp** — B2B enterprise premium ✅ 21/02
- [x] **Thông tin ngân hàng tài xế** — select bank + STK + chủ TK ✅ 21/02

### Database (Antigravity)
- [x] 5 bảng: bookings, drivers, pricing_tiers, vehicle_types, popular_routes
- [x] Hàm match_driver() — auto-match tài xế theo loại xe + rating
- [x] Hàm increment_driver_trips() — tăng số chuyến
- [x] RLS Policies (INSERT, SELECT, UPDATE cho bookings + drivers)
- [x] Realtime subscription cho bookings
- [x] Seed data: 2 tài xế test, pricing tiers, routes

---

## 🔴 CẦN LÀM — Antigravity (Frontend) — Ưu tiên cao

### Batch tiếp: Đánh giá + Blog + Admin charts
- [x] **Hệ thống đánh giá tài xế** — sao + review sau mỗi chuyến ✅ 21/02
- [x] **Biểu đồ thống kê Admin** — chart doanh thu, số đơn theo ngày ✅ 21/02
- [x] **Trang blog/tin tức** — đăng bài tài xế, review khách hàng (Đang cân nhắc Backend Blog)
- [x] **Content du lịch theo mùa** — timeline bài viết theo tháng ✅ 21/02
- [x] **Biểu mẫu góp ý tài xế** — tài xế góp ý dịch vụ ✅ 21/02
- [x] **SEO meta tags** — OG tags, structured data ✅ 21/02

### Sau demo:
- [ ] **Cho khách chọn tài xế** — dựa trên bài viết và đánh giá
- [ ] **Chương trình khách hàng thân thiết** — Vàng, Kim Cương, Platinum
- [ ] **Điểm thưởng** — share MXH → giảm giá 2-5%
- [ ] **Giới thiệu khách mới** — chiết khấu chuyến tiếp
- [ ] **Thu thập video phản hồi** — khách quay clip ngắn
- [ ] **Bắt buộc viết bài/Facebook** sau mỗi chuyến
- [ ] **Hỗ trợ giọng nói → văn bản**

### Admin nâng cao:
- [ ] **Trạng thái đơn chi tiết** — đã nhận / đang chạy / đã trả
- [ ] **Báo giá trực tiếp** — admin deal giá cuốc lớn
- [ ] **Quản lý hoa hồng 10%** — theo dõi doanh thu platform
- [ ] **Phát hiện "lốc khách"** — alert tài xế lấy khách riêng

### Mở rộng loại xe:
- [x] **Xe 16, 29, 45 chỗ** + **Limousine 9, 16 chỗ** ✅ 21/02
- [x] **Xe sang và siêu sang** ✅ 21/02
- [x] **Xe tải vận chuyển hàng** — trái cây, đông lạnh ✅ 21/02
- [x] **Dịch vụ dọn nhà** — đóng gói, tháo dỡ ✅ 21/02

---

## 🔴 CẦN LÀM — ClaudeCode (Backend) — Ưu tiên cao

### Edge Functions
- [x] **send-notification** — gửi SMS/Zalo khi match (eSMS.vn API) ✅ 21/02
- [x] **booking-webhook** — webhook khi booking status thay đổi ✅ 21/02
- [x] **auto-reassign** — re-match nếu tài xế không phản hồi 5 phút ✅ 21/02
- [x] **pricing-engine** — giá động: cao điểm, lễ/Tết, chiều về -15% ✅ 21/02
- [x] **daily-report** — cron báo cáo hàng ngày cho admin ✅ 21/02

### Authentication & Security
- [x] **Supabase Auth** cho admin (thay password cứng hiện tại) ✅ 21/02
- [x] **API rate limiting** — chống spam booking/đăng ký (PostgreSQL-based) ✅ 21/02
- [x] **Xác thực SĐT** — OTP send/verify qua eSMS ✅ 21/02

### Tích hợp
- [x] **Google Maps API** — calculate-distance edge function + fallback routes ✅ 21/02
- [x] **Payment gateway** — Momo + VNPay (create-payment + payment-callback) ✅ 21/02 (Đã tích hợp vào Booking modal)
- [x] **Chatbot FAQ** — keyword matching, 12 câu FAQ, đa chủ đề ✅ 21/02 (Đã tích hợp chatbot widget vào trang chủ)
- [x] **Database triggers** — rating auto-update, match_driver dùng average_rating ✅ 21/02

### Dịch vụ Tour
- [x] **Tour guide đa ngôn ngữ** — vi, en, zh, ja, ko (schema + API) ✅ 21/02
- [x] **3 mức tour**: budget, basic, premium (schema + seed data) ✅ 21/02
- [x] **Các loại tour**: experience, explore, resort, luxury ✅ 21/02
- [x] **Tour tùy chỉnh** — custom tour booking API ✅ 21/02 (Đã tạo trang tours.html tích hợp tour-api)

### CI/CD & Auto Maintenance (ClaudeCode)
- [x] **Vercel security headers** — CSP, HSTS, X-Frame-Options, Referrer-Policy ✅ 21/02
- [x] **GitHub Actions: deploy-frontend** — auto deploy Vercel khi push main ✅ 21/02
- [x] **GitHub Actions: deploy-functions** — auto deploy Edge Functions ✅ 21/02
- [x] **GitHub Actions: security-scan** — daily Gitleaks + npm audit + code scan ✅ 21/02
- [x] **pg_cron maintenance** — cleanup rate limits, OTP, auto-reassign, daily stats ✅ 21/02
- [x] **Security hardening** — audit logs, triggers, RLS tightening, fraud detection ✅ 21/02
- [x] **Health check endpoint** — DB + tables + system health + activity stats ✅ 21/02
- [x] **.gitignore security** — block secrets, credentials, keys from git ✅ 21/02

---

## 🚀 DEPLOYMENT & KINH DOANH
- [ ] Deploy Vercel (static frontend)
- [ ] Custom domain (travelcar.vn)
- [ ] Tạo demo → quăng lên group xe gia lô thu thập đăng ký tài xế
- [ ] Tạo Facebook page + TikTok
- [ ] Video quảng cáo ngắn về dịch vụ
- [ ] Thành lập công ty → đăng ký bản quyền ứng dụng
- [ ] Quảng cáo trên ứng dụng đặt vé máy bay
