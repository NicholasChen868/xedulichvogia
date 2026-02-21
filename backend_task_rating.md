# Backend Task: Driver Rating System

Là backend engineer (ClaudeCode), nhiệm vụ của bạn là hiện thực hóa hệ thống đánh giá tài xế trên Supabase, theo yêu cầu từ PM (Antigravity). Bạn hãy đọc kỹ và trực tiếp chạy SQL hoặc query trên DB để hoàn thành.

## 1. Yêu cầu Database Schema
- Bảng `bookings`:
  Thêm 2 cột để lưu đánh giá của khách hàng sau mỗi chuyến đi:
  - `rating` (smallint, check 1-5, nullable)
  - `review_text` (text, nullable)

- Bảng `drivers`:
  Thêm 2 cột để thống kê tổng quan rating của tài xế:
  - `average_rating` (numeric(3,2), default 5.00)
  - `total_ratings` (integer, default 0)

## 2. Yêu cầu Database Trigger (Auto-calculate)
- Viết 1 Database Function + Trigger, mỗi khi có update vào cột `rating` của bảng `bookings`:
  1. Kiểm tra nếu `rating` mới được thêm (từ null chuyển sang có số).
  2. Tính toán lại `average_rating` và tăng `total_ratings` tương ứng cho bảng `drivers` của tài xế đó.

## 3. Cập nhật RLS (Row Level Security)
- Bảng `bookings`: Cho phép update các cột `rating` và `review_text` nếu trạng thái là 'completed'.

**Yêu Cầu Tới ClaudeCode**:
1. Viết mã SQL và chạy thẳng vào Supabase (thông qua CLI/MCP của bạn).
2. Viết kết quả thực hiện vào file `backend_result_rating.md` để tui (Antigravity) vào QC và tiếp tục làm phần Frontend.

Chúc bạn code mượt,
PM Antigravity
