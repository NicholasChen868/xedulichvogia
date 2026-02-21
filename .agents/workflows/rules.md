---
description: Quy tắc làm việc chung cho dự án TravelCar
---

# Quy tắc dự án TravelCar

## 🌐 Ngôn ngữ
- **LUÔN NÓI TIẾNG VIỆT** với anh (user). Tất cả câu trả lời, giải thích, commit message đều bằng tiếng Việt.
- Code comments có thể viết tiếng Anh hoặc Việt.
- Không trả lời bằng tiếng Anh trừ khi anh yêu cầu.

## 📝 Quy tắc Commit Message
Mỗi commit **BẮT BUỘC** phải ghi rõ **"Trước thì sao"** và **"Sau thì sao"**:

```
<loại>: <mô tả ngắn>

TRƯỚC: <trạng thái/tình trạng TRƯỚC khi sửa — mô tả vấn đề hoặc trạng thái cũ>
SAU: <trạng thái/tình trạng SAU khi sửa xong — kết quả đạt được>

Chi tiết:
- Thay đổi 1
- Thay đổi 2
```

**Ví dụ chuẩn:**
```
feat: thêm hệ thống matching tài xế

TRƯỚC: Khách đặt xe chỉ lưu vào DB, phải chờ admin ghép tài xế thủ công
SAU: Đặt xe xong tự động gọi match_driver() tìm tài xế phù hợp nhất,
     hiện tên + biển số tài xế cho khách ngay lập tức

Chi tiết:
- Tạo hàm match_driver() trong PostgreSQL
- Tạo trang driver-dashboard.html
- Cập nhật booking form gọi submitBookingWithMatch()
```

## 👥 Phân công AI
| AI | Nhiệm vụ |
|---|---|
| **Antigravity (em)** | Frontend (HTML/CSS/JS) + Database (Supabase schema, migrations, RLS, SQL functions) |
| **ClaudeCode** | Backend logic nâng cao (Edge Functions, API endpoints, authentication, payment integration, chatbot) |

## 🔧 Tech Stack
- Frontend: HTML + Vanilla CSS + Vanilla JS (static site)
- Database: Supabase (PostgreSQL)
- Auth: Supabase anon key + localStorage (admin password tạm thời)
- Hosting: Vercel (static deploy)
- CDN: Supabase JS v2 via jsDelivr

## 🔑 Supabase
- Project ID: `fjcobjsgcuzbruyoaotz`
- Khi cần chạy SQL dùng curl (nhanh hơn browser):
  ```
  curl --max-time 15 -s -X POST "https://api.supabase.com/v1/projects/fjcobjsgcuzbruyoaotz/database/query" \
    -H "Authorization: Bearer <TOKEN_MỚI_NHẤT>" \
    -H "Content-Type: application/json" \
    -d '{"query":"<SQL>"}'
  ```
- Token API: luôn dùng token mới nhất anh cung cấp

## 📁 Tài liệu quan trọng
- `/docs/founder-vision.md` — Tầm nhìn founder, mô hình kinh doanh, quyết định chiến lược
- `/.agents/workflows/tasks.md` — Danh sách tasks phân công
- `/.agents/workflows/rules.md` — File này
