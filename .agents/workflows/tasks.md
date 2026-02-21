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
- [ ] **Hệ thống đánh giá tài xế** — sao + review sau mỗi chuyến
- [ ] **Biểu đồ thống kê Admin** — chart doanh thu, số đơn theo ngày
- [ ] **Trang blog/tin tức** — đăng bài tài xế, review khách hàng
- [ ] **Content du lịch theo mùa** — timeline bài viết theo tháng
- [ ] **Biểu mẫu góp ý tài xế** — tài xế góp ý dịch vụ
- [ ] **SEO meta tags** — OG tags, structured data

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
- [ ] **Xe 16, 29, 45 chỗ** + **Limousine 9, 16 chỗ**
- [ ] **Xe sang và siêu sang**
- [ ] **Xe tải vận chuyển hàng** — trái cây, đông lạnh
- [ ] **Dịch vụ dọn nhà** — đóng gói, tháo dỡ

---

## 🔴 CẦN LÀM — ClaudeCode (Backend) — Ưu tiên cao

### Edge Functions
- [ ] **send-notification** — gửi SMS/Zalo khi match thành công
- [ ] **booking-webhook** — webhook khi booking status thay đổi
- [ ] **auto-reassign** — tự động re-match nếu tài xế không phản hồi 5 phút
- [ ] **pricing-engine** — tính giá động theo cao điểm, chiều về giảm giá
- [ ] **daily-report** — cron gửi báo cáo hàng ngày cho admin

### Authentication & Security
- [ ] **Supabase Auth** cho admin (thay password cứng hiện tại)
- [ ] **API rate limiting** — chống spam booking/đăng ký
- [ ] **Xác thực SĐT** — OTP khi đăng ký tài xế

### Tích hợp
- [ ] **Google Maps API** — tính distance chính xác, hiện bản đồ
- [ ] **Payment gateway** — Momo, VNPay, ZaloPay (đặt cọc 10%)
- [ ] **Chatbot FAQ** — tự động trả lời câu hỏi thường gặp
- [ ] **Database triggers** — auto-update stats, auto-trừ hoa hồng

### Dịch vụ Tour
- [ ] **Tour guide đa ngôn ngữ** — Anh, Trung, Nhật, Hàn
- [ ] **3 mức tour**: tiết kiệm, cơ bản, nâng cao
- [ ] **Các loại tour**: trải nghiệm, khám phá, nghỉ dưỡng, sang chảnh
- [ ] **Tour tùy chỉnh** — khách đưa ý tưởng, mình sắp xếp lịch trình

---

## 🚀 DEPLOYMENT & KINH DOANH
- [ ] Deploy Vercel (static frontend)
- [ ] Custom domain (travelcar.vn)
- [ ] Tạo demo → quăng lên group xe gia lô thu thập đăng ký tài xế
- [ ] Tạo Facebook page + TikTok
- [ ] Video quảng cáo ngắn về dịch vụ
- [ ] Thành lập công ty → đăng ký bản quyền ứng dụng
- [ ] Quảng cáo trên ứng dụng đặt vé máy bay
