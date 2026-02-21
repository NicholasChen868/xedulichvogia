# Backend Result: Driver Rating System

**Thực hiện bởi:** ClaudeCode
**Ngày:** 2026-02-21
**Trạng thái:** HOÀN THÀNH

---

## 1. Schema Changes - Bảng `bookings`

**SQL đã chạy:**
```sql
ALTER TABLE bookings
  ADD COLUMN rating smallint CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN review_text text;
```

**Kết quả verify:**
| Cột | Kiểu | Nullable | Default | CHECK |
|-----|-------|----------|---------|-------|
| `rating` | smallint | YES | null | `rating >= 1 AND rating <= 5` |
| `review_text` | text | YES | null | - |

---

## 2. Schema Changes - Bảng `drivers`

**SQL đã chạy:**
```sql
ALTER TABLE drivers
  ADD COLUMN average_rating numeric(3,2) DEFAULT 5.00,
  ADD COLUMN total_ratings integer DEFAULT 0;
```

**Kết quả verify:**
| Cột | Kiểu | Nullable | Default |
|-----|-------|----------|---------|
| `average_rating` | numeric(3,2) | YES | 5.00 |
| `total_ratings` | integer | YES | 0 |

> **Lưu ý:** Bảng `drivers` đã có sẵn cột `rating` (decimal, default 5.0) từ trước dùng cho matching. Cột `average_rating` mới là cột chính thức tính từ feedback khách hàng.

---

## 3. Database Function + Trigger

**Function `update_driver_rating()`:**
```sql
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id uuid;
  v_avg numeric(3,2);
  v_count integer;
BEGIN
  -- Chi khi rating chuyen tu NULL sang co gia tri
  IF OLD.rating IS NULL AND NEW.rating IS NOT NULL AND NEW.driver_id IS NOT NULL THEN
    v_driver_id := NEW.driver_id;

    SELECT COUNT(*), ROUND(AVG(rating)::numeric, 2)
    INTO v_count, v_avg
    FROM bookings
    WHERE driver_id = v_driver_id AND rating IS NOT NULL;

    UPDATE drivers
    SET average_rating = v_avg, total_ratings = v_count
    WHERE id = v_driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger:**
```sql
CREATE TRIGGER trigger_update_driver_rating
  AFTER UPDATE OF rating ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_rating();
```

**Logic hoat dong:**
1. Trigger chi chay khi cot `rating` trong `bookings` bi UPDATE.
2. Function kiem tra: chi xu ly khi `rating` chuyen tu `NULL` -> co gia tri (tranh tinh lai khi sua rating).
3. Tinh `AVG(rating)` va `COUNT(*)` tu tat ca bookings co rating cua tai xe do.
4. Cap nhat `average_rating` va `total_ratings` trong bang `drivers`.
5. Function dung `SECURITY DEFINER` de dam bao co quyen UPDATE drivers du nguoi dung binh thuong goi.

---

## 4. RLS Policy

**SQL đã chạy:**
```sql
CREATE POLICY "Allow rating update on completed bookings"
  ON bookings
  FOR UPDATE
  USING (status = 'completed')
  WITH CHECK (status = 'completed');
```

**Kết quả verify:**
| Policy Name | Command | Condition |
|-------------|---------|-----------|
| `Allow rating update on completed bookings` | UPDATE | `status = 'completed'` |

> **Lưu ý:** Bảng `bookings` đã có sẵn policy `Allow public update bookings` (cho admin/driver operations). Policy mới bổ sung ràng buộc cụ thể cho use case rating.

---

## 5. Tong ket Verification

| Hang muc | Trang thai |
|----------|-----------|
| Cot `bookings.rating` (smallint, CHECK 1-5) | OK |
| Cot `bookings.review_text` (text, nullable) | OK |
| Cot `drivers.average_rating` (numeric(3,2), default 5.00) | OK |
| Cot `drivers.total_ratings` (integer, default 0) | OK |
| Function `update_driver_rating()` | OK |
| Trigger `trigger_update_driver_rating` (AFTER UPDATE) | OK |
| RLS Policy `Allow rating update on completed bookings` | OK |

---

## 6. Huong dan cho Frontend (Antigravity)

### Khi khach danh gia tai xe:
```javascript
// Update rating + review cho booking da hoan thanh
const { error } = await supabase
  .from('bookings')
  .update({
    rating: 5,           // 1-5
    review_text: 'Tai xe rat tot!'  // optional
  })
  .eq('id', bookingId)
  .eq('status', 'completed');
```

### Doc average rating cua tai xe:
```javascript
const { data } = await supabase
  .from('drivers')
  .select('average_rating, total_ratings')
  .eq('id', driverId)
  .single();
// data.average_rating = 4.75
// data.total_ratings = 12
```

> Trigger se tu dong cap nhat `average_rating` va `total_ratings` trong bang `drivers` moi khi co rating moi.

---

Chuc anh Antigravity code frontend muot,
ClaudeCode
