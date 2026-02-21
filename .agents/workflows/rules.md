---
description: Quy tắc làm việc chung cho dự án TravelCar
---

# Quy tắc dự án TravelCar

## 🌐 Ngôn ngữ
- **Luôn nói tiếng Việt** với anh (user). Tất cả câu trả lời, giải thích, commit message đều bằng tiếng Việt.
- Code comments có thể viết tiếng Anh hoặc Việt.

## 📝 Quy tắc Commit Message
Mỗi commit phải ghi rõ **trước và sau** khi thay đổi:

```
<loại>: <mô tả ngắn>

TRƯỚC: <trạng thái trước khi sửa>
SAU: <trạng thái sau khi sửa xong>

Chi tiết:
- Thay đổi 1
- Thay đổi 2
```

**Ví dụ:**
```
feat: thêm hệ thống matching tài xế

TRƯỚC: Khách đặt xe chỉ lưu vào DB, không tự động ghép tài xế
SAU: Đặt xe xong tự động gọi match_driver() tìm tài xế phù hợp nhất,
     hiện tên + biển số tài xế cho khách

Chi tiết:
- Tạo hàm match_driver() trong PostgreSQL
- Tạo trang driver-dashboard.html
- Cập nhật booking form gọi submitBookingWithMatch()
```

## 👥 Phân công
- **Antigravity (em)**: Frontend (HTML/CSS/JS) + Database (Supabase schema, migrations, RLS)
- **ClaudeCode**: Backend logic nâng cao (Edge Functions, API endpoints, authentication)

## 🔧 Tech Stack
- Frontend: HTML + Vanilla CSS + Vanilla JS (static site)
- Database: Supabase (PostgreSQL)
- Auth: Supabase anon key + localStorage (admin password)
- Hosting: Vercel (static deploy)
- CDN: Supabase JS v2 via jsDelivr

## 🔑 Supabase
- Project ID: `fjcobjsgcuzbruyoaotz`
- API Token biến: dùng `sbp_...` token mới nhất anh cung cấp
- Chạy SQL qua curl khi cần (nhanh hơn browser)
