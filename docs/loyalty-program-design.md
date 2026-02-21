# 🏆 TravelCar Miles — Chương Trình Khách Hàng Thân Thiết

## Tổng Quan
Chương trình "TravelCar Miles" lấy cảm hứng từ mô hình **Frequent Flyer** của hàng không —
tích lũy km theo mỗi chuyến xe, thăng hạng tự động, nhận ưu đãi ngày càng hấp dẫn.

---

## 🎯 5 Hạng Thẻ Thành Viên

| Hạng | Tên | Icon | KM tích lũy | Màu thẻ |
|------|-----|------|-------------|---------|
| 1 | **Bạn Đồng Hành** | 🛣️ | 0 – 500 km | Xám bạc |
| 2 | **Khám Phá** | 🧭 | 500 – 2.000 km | Xanh dương |
| 3 | **Phiêu Lưu** | ⛰️ | 2.000 – 5.000 km | Xanh lá |
| 4 | **Tinh Tú** | ⭐ | 5.000 – 15.000 km | Vàng gold |
| 5 | **Triệu Dặm** | 💎 | 15.000+ km | Tím diamond |

---

## 💰 Ưu Đãi Theo Hạng

### Hạng 1: Bạn Đồng Hành (0-500 km)
- Tích 1 điểm/km
- Nhận mã giảm 5% cho chuyến thứ 2
- Miễn phí nước uống trên xe

### Hạng 2: Khám Phá (500-2.000 km)
- Tích 1.2 điểm/km (x1.2 bonus)
- Giảm 8% mọi chuyến xe
- Ưu tiên ghép xe nhanh
- Free upgrade 4 chỗ → 7 chỗ (khi còn xe, 1 lần/tháng)
- Quà sinh nhật: voucher 200.000đ

### Hạng 3: Phiêu Lưu (2.000-5.000 km)
- Tích 1.5 điểm/km (x1.5 bonus)
- Giảm 12% mọi chuyến xe
- Free cancel trước 2 tiếng
- Ưu tiên tài xế 5 sao
- Tặng 1 chuyến sân bay/quý
- Quà sinh nhật: voucher 500.000đ

### Hạng 4: Tinh Tú (5.000-15.000 km)
- Tích 2 điểm/km (x2 bonus)
- Giảm 18% mọi chuyến xe
- Hotline VIP riêng, ưu tiên tuyệt đối
- Free upgrade xe sang (khi có sẵn)
- Tặng 2 chuyến sân bay/quý
- Mời tham gia sự kiện exclusive
- Quà sinh nhật: voucher 1.000.000đ + quà tặng

### Hạng 5: Triệu Dặm (15.000+ km)
- Tích 3 điểm/km (x3 bonus)
- Giảm 25% mọi chuyến xe
- Xe VIP chuyên dụng, tài xế riêng
- Free cancel bất kì lúc nào
- Concierge service cá nhân
- Mời du lịch trải nghiệm miễn phí 1 lần/năm
- Quà sinh nhật: voucher 2.000.000đ + quà tặng cao cấp
- Vé sự kiện VIP + đối tác

---

## 🧠 Logic Kích Cầu Tiêu Dùng

### 1. Hiệu ứng "Gần chạm mốc" (Near-Miss Effect)
```
"Bạn chỉ còn 127 km nữa để lên hạng Khám Phá! 🧭"
"Thêm 1 chuyến Sài Gòn - Vũng Tàu là đủ!"
```
→ Hiển thị progress bar trực quan, tạo cảm giác "gần tới rồi, đi thêm 1 chuyến nữa thôi"

### 2. Ưu đãi tăng tốc (Accelerator)
```
"🔥 Tuần này: x2 km cho mọi chuyến xe!"
"Đặt xe trước 15/3 nhận x3 km tích lũy"
```
→ Flash sale điểm vào dịp lễ, cuối tuần, mùa thấp điểm → kích cầu off-peak

### 3. Điểm sắp hết hạn (Point Expiration)
```
"⚠️ 1.200 km của bạn sẽ hết hạn trong 30 ngày!"
"Đặt 1 chuyến xe để gia hạn tự động"
```
→ KM hết hạn sau 12 tháng không hoạt động → tạo urgency quay lại

### 4. Quà giới thiệu (Referral Bonus)
```
"Giới thiệu bạn bè: +200 km cho cả 2!"
```
→ Viral loop: khách cũ giới thiệu khách mới, cả 2 đều nhận km

### 5. Thử thách hàng tháng (Monthly Challenge)
```
"🏆 Hoàn thành 3 chuyến trong tháng 3 → +500 km bonus!"
```
→ Gamification: tạo thói quen đặt xe đều đặn

### 6. Ưu đãi chặng cụ thể (Route Incentive)
```
"Chuyến đi Đà Lạt tuần này được x2 km + giảm 15%"
```
→ Kích cầu các tuyến có xe trống, cân bằng cung-cầu

### 7. Đổi điểm linh hoạt (Point Redemption)
- 1.000 điểm = Giảm 100.000đ
- 3.000 điểm = 1 chuyến sân bay miễn phí
- 5.000 điểm = Upgrade VIP trọn ngày
- 10.000 điểm = Tour du lịch trọn gói (đối tác)
→ Cho khách hàng thấy giá trị cụ thể của việc tích lũy

### 8. Status Anxiety (Sợ mất hạng)
```
"Hạng Tinh Tú ⭐ của bạn cần 500 km trong 3 tháng tới để duy trì"
```
→ Duy trì hạng yêu cầu hoạt động, không phải chỉ đạt một lần

---

## 📊 Bảng Quy Đổi Điểm

| Hành động | Điểm nhận |
|-----------|-----------|
| 1 km di chuyển | 1-3 điểm (theo hạng) |
| Đánh giá 5 sao | +50 điểm |
| Giới thiệu bạn bè | +200 điểm |
| Sinh nhật | +100 điểm |
| Chia sẻ story MXH | +30 điểm |
| Hoàn thành challenge | +500 điểm |

---

## 🗄️ Database Schema (Supabase)

### Bảng `loyalty_members`
```sql
CREATE TABLE loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  tier TEXT DEFAULT 'companion' CHECK (tier IN ('companion','explorer','adventurer','star','diamond')),
  total_km DECIMAL DEFAULT 0,
  current_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier_expires_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Bảng `loyalty_transactions`
```sql
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES loyalty_members(id),
  type TEXT CHECK (type IN ('earn','redeem','expire','bonus','referral')),
  points INTEGER NOT NULL,
  km DECIMAL DEFAULT 0,
  description TEXT,
  booking_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
