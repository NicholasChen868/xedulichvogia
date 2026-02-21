---
description: Danh sách tasks và phân công cho dự án TravelCar
---

# 📋 Task Board — TravelCar

## ✅ ĐÃ HOÀN THÀNH

### Frontend (Antigravity)
- [x] Landing page + Booking form (index.html)
- [x] Trang đăng ký tài xế (driver-register.html)
- [x] Driver Dashboard — đăng nhập SĐT, xem/nhận/từ chối cuốc (driver-dashboard.html)
- [x] Admin Dashboard — thống kê, quản lý bookings + drivers (admin.html)
- [x] Icon user dropdown menu trên navbar (đăng nhập/đăng xuất Admin)
- [x] Link Admin trong footer
- [x] Dark theme premium + responsive

### Database (Antigravity)
- [x] 5 bảng: bookings, drivers, pricing_tiers, vehicle_types, popular_routes
- [x] Hàm match_driver() — auto-match tài xế theo loại xe + rating
- [x] Hàm increment_driver_trips() — tăng số chuyến
- [x] RLS Policies (INSERT, SELECT, UPDATE cho bookings + drivers)
- [x] Realtime subscription cho bookings
- [x] Seed data: 2 tài xế test, pricing tiers, routes

---

## 🔧 CẦN LÀM — Antigravity (Frontend + DB)

### Ưu tiên cao
- [ ] **Responsive mobile** — test + fix tất cả trang trên mobile
- [ ] **Form validation** — validate SĐT, ngày tháng, required fields
- [ ] **Loading states** — skeleton/spinner khi fetch data
- [ ] **Error handling UI** — hiện thông báo lỗi thân thiện cho user
- [ ] **Trang xác nhận booking** — sau khi đặt xe, hiện trang confirm chi tiết

### Ưu tiên trung bình
- [ ] **Notifications realtime** — tài xế nhận push khi có cuốc mới (web notification)
- [ ] **Bộ lọc tuyến đường** — search + filter trên trang chủ
- [ ] **Hiển thị trạng thái booking** cho khách — tra cứu đơn bằng SĐT
- [ ] **Admin: biểu đồ thống kê** — chart doanh thu, số đơn theo ngày
- [ ] **Trang "Về chúng tôi"** + "Chính sách"

### Ưu tiên thấp
- [ ] **SEO meta tags** — OG tags, structured data
- [ ] **PWA** — manifest.json, service worker, offline support
- [ ] **Dark/Light mode toggle**
- [ ] **Đa ngôn ngữ** (VI/EN)

---

## 🔧 CẦN LÀM — ClaudeCode (Backend)

### Ưu tiên cao
- [ ] **Supabase Edge Function: send-notification** — gửi SMS/Zalo khi match thành công
- [ ] **Supabase Edge Function: booking-webhook** — webhook khi booking status thay đổi
- [ ] **Authentication flow** — Supabase Auth cho admin (thay password cứng)
- [ ] **API rate limiting** — chống spam booking/đăng ký

### Ưu tiên trung bình
- [ ] **Edge Function: auto-reassign** — tự động re-match nếu tài xế không phản hồi trong 5 phút
- [ ] **Edge Function: pricing-engine** — tính giá động theo giờ cao điểm, ngày lễ
- [ ] **Cron job: daily-report** — gửi báo cáo hàng ngày cho admin
- [ ] **Database triggers** — auto-update stats khi booking hoàn thành

### Ưu tiên thấp
- [ ] **Payment integration** — Momo, VNPay, ZaloPay
- [ ] **Google Maps API** — tính distance chính xác
- [ ] **Driver location tracking** — realtime GPS
- [ ] **Rating system** — khách đánh giá tài xế sau chuyến

---

## 🚀 DEPLOYMENT
- [ ] Deploy Vercel (static frontend)
- [ ] Custom domain setup
- [ ] SSL certificate
- [ ] Environment variables trên Vercel
