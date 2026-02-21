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

### Database (Antigravity)
- [x] 5 bảng: bookings, drivers, pricing_tiers, vehicle_types, popular_routes
- [x] Hàm match_driver() — auto-match tài xế theo loại xe + rating
- [x] Hàm increment_driver_trips() — tăng số chuyến
- [x] RLS Policies (INSERT, SELECT, UPDATE cho bookings + drivers)
- [x] Realtime subscription cho bookings
- [x] Seed data: 2 tài xế test, pricing tiers, routes

---

## 🔴 CẦN LÀM — Antigravity (Frontend + DB) — Ưu tiên cao

### Trang khách hàng
- [ ] **Tra cứu đơn bằng SĐT** — khách nhập SĐT để xem trạng thái booking
- [ ] **Trang xác nhận booking** — sau đặt xe, hiện confirm + info tài xế
- [ ] **Hệ thống đặt cọc 10%** — tích hợp thanh toán (Momo/VNPay/ZaloPay)
- [ ] **Cho khách chọn tài xế** — dựa trên bài viết và đánh giá trên website
- [ ] **Hệ thống đánh giá tài xế** — sao + review sau mỗi chuyến
- [ ] **Thu thập video phản hồi** — khách quay clip ngắn sau chuyến đi
- [ ] **Chương trình khách hàng thân thiết** — hạng Vàng, Kim Cương, Platinum
- [ ] **Điểm thưởng** — share/tương tác MXH → tích điểm → giảm giá 2-5%
- [ ] **Giới thiệu khách mới** — chiết khấu cho chuyến đi tiếp theo

### Trang tài xế
- [ ] **Upload hình xe + giấy tờ** — chụp trực tiếp hoặc tải ảnh lên app
- [ ] **Báo điểm đón/trả khách** — tài xế bấm khi đón + khi trả
- [ ] **Tổng hợp thu nhập** — xem doanh thu theo ngày/tuần/tháng
- [ ] **Biểu mẫu góp ý** — tài xế góp ý giá cả, chất lượng dịch vụ
- [ ] **Bắt buộc viết bài/đăng Facebook** sau mỗi chuyến (tăng lực tương tác)
- [ ] **Hỗ trợ chuyển giọng nói → văn bản** — giúp tài xế viết bài dễ hơn

### Trang Admin
- [ ] **Biểu đồ thống kê** — chart doanh thu, số đơn theo ngày
- [ ] **Bản đồ realtime** — xem vị trí xe đang chạy trên Google Maps
- [ ] **Trạng thái đơn chi tiết** — đã nhận khách / đang chạy / đã trả khách
- [ ] **Báo giá trực tiếp** — admin deal giá cho cuốc >150km, xe lớn
- [ ] **Quản lý hoa hồng 10%** — theo dõi tiền đặt cọc = doanh thu platform
- [ ] **Phát hiện "lốc khách"** — alert khi tài xế lấy khách riêng

### Mở rộng loại xe
- [ ] **Xe 16 chỗ, 29 chỗ, 45 chỗ**
- [ ] **Limousine 9 chỗ, 16 chỗ**
- [ ] **Xe sang và siêu sang**
- [ ] **Xe tải vận chuyển hàng** — trái cây, đông lạnh, hàng thông thường
- [ ] **Dịch vụ dọn nhà** — đóng gói, tháo dỡ, sắp xếp

### Content & Marketing
- [ ] **Trang "Về chúng tôi"** + "Chính sách"
- [ ] **Content du lịch theo mùa** — timeline bài viết theo tháng, địa điểm
- [ ] **Bài quảng cáo + CTA đặt xe** — link vào booking form
- [ ] **Trang blog/tin tức** — đăng bài tài xế, review khách hàng
- [ ] **SEO meta tags** — OG tags, structured data

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
