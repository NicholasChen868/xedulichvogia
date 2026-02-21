-- =============================================
-- 08: Schema cho Dịch vụ Tour
-- Run on: Supabase SQL Editor
-- Date: 2026-02-21
-- =============================================

-- 1. Bảng tour_packages: Các gói tour có sẵn
CREATE TABLE IF NOT EXISTS tour_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Phân loại
  tier TEXT NOT NULL DEFAULT 'basic',        -- 'budget', 'basic', 'premium'
  category TEXT NOT NULL DEFAULT 'explore',   -- 'experience', 'explore', 'resort', 'luxury'

  -- Thông tin
  destination TEXT NOT NULL,                  -- Địa điểm chính
  duration_days INTEGER NOT NULL DEFAULT 1,
  max_guests INTEGER DEFAULT 10,
  includes TEXT[],                             -- Bao gồm: ["Xe đưa đón", "Hướng dẫn viên", ...]
  itinerary JSONB,                            -- Lịch trình chi tiết [{day: 1, title: "", activities: []}]

  -- Giá
  price_per_person BIGINT,                    -- VND / người
  price_per_group BIGINT,                     -- VND / nhóm (nếu có)
  vehicle_type TEXT DEFAULT 'suv-7',

  -- Đa ngôn ngữ
  languages TEXT[] DEFAULT '{"vi"}',          -- ["vi", "en", "zh", "ja", "ko"]
  name_en TEXT,
  name_zh TEXT,
  name_ja TEXT,
  name_ko TEXT,
  description_en TEXT,
  description_zh TEXT,
  description_ja TEXT,
  description_ko TEXT,

  -- Media
  cover_image TEXT,
  gallery TEXT[],

  -- Trạng thái
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tour_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active tours" ON tour_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full tours" ON tour_packages FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 2. Bảng tour_bookings: Đặt tour
CREATE TABLE IF NOT EXISTS tour_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_package_id UUID REFERENCES tour_packages(id),

  -- Khách hàng
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  num_guests INTEGER NOT NULL DEFAULT 1,
  language TEXT DEFAULT 'vi',               -- Ngôn ngữ hướng dẫn

  -- Chi tiết
  tour_date DATE NOT NULL,
  special_requests TEXT,                     -- Yêu cầu đặc biệt
  pickup_location TEXT,
  estimated_price BIGINT,

  -- Tour tùy chỉnh (customer đưa ý tưởng)
  is_custom BOOLEAN DEFAULT false,
  custom_idea TEXT,                           -- Ý tưởng khách đưa
  custom_itinerary JSONB,                    -- Lịch trình admin tạo

  -- Trạng thái
  status TEXT NOT NULL DEFAULT 'pending',    -- pending, quoted, confirmed, completed, cancelled
  driver_id UUID REFERENCES drivers(id),
  guide_name TEXT,
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tour_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert tour booking" ON tour_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read own tour booking" ON tour_bookings FOR SELECT USING (true);
CREATE POLICY "Admin full tour bookings" ON tour_bookings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_tour_packages_tier ON tour_packages (tier, category);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_phone ON tour_bookings (customer_phone);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_date ON tour_bookings (tour_date);

-- 4. Seed data: Tour mẫu
INSERT INTO tour_packages (name, slug, description, tier, category, destination, duration_days, max_guests, includes, price_per_person, vehicle_type, languages, name_en, featured, itinerary) VALUES
(
  'Khám Phá Vũng Tàu 1 Ngày',
  'kham-pha-vung-tau-1-ngay',
  'Trải nghiệm biển Vũng Tàu, thưởng thức hải sản tươi sống, tham quan Tượng Chúa và ngọn hải đăng.',
  'budget',
  'explore',
  'Vũng Tàu',
  1, 7,
  '{"Xe đưa đón tận nơi", "Tài xế kinh nghiệm", "Nước uống trên xe", "Bảo hiểm hành khách"}',
  350000,
  'suv-7',
  '{"vi", "en"}',
  'Explore Vung Tau 1 Day',
  true,
  '[{"day":1,"title":"Vũng Tàu","activities":["Đón khách tại TPHCM 6:00","Bãi Sau tắm biển","Ăn trưa hải sản","Tượng Chúa Kitô","Ngọn hải đăng","Về TPHCM 18:00"]}]'
),
(
  'Đà Lạt Mộng Mơ 3 Ngày 2 Đêm',
  'da-lat-mong-mo-3n2d',
  'Tour Đà Lạt đầy đủ: thác, vườn hoa, café view, chợ đêm, đồi chè.',
  'basic',
  'resort',
  'Đà Lạt',
  3, 7,
  '{"Xe đưa đón", "Hướng dẫn viên", "Khách sạn 3 sao 2 đêm", "Bữa sáng", "Vé tham quan", "Bảo hiểm"}',
  2500000,
  'suv-7',
  '{"vi", "en", "ko"}',
  'Dalat Dreamy 3D2N',
  true,
  '[{"day":1,"title":"TPHCM - Đà Lạt","activities":["Khởi hành 6:00","Thác Datanla","Check-in khách sạn","Chợ đêm"]},{"day":2,"title":"Tham quan","activities":["Vườn hoa thành phố","Đồi chè Cầu Đất","Café Mê Linh","Thung lũng Tình Yêu"]},{"day":3,"title":"Đà Lạt - TPHCM","activities":["Làng Cù Lần","Mua quà","Về TPHCM 18:00"]}]'
),
(
  'Nha Trang Sang Chảnh 4 Ngày',
  'nha-trang-luxury-4d',
  'Tour VIP Nha Trang: resort 5 sao, du thuyền, lặn biển, spa.',
  'premium',
  'luxury',
  'Nha Trang',
  4, 4,
  '{"Xe Limousine", "Resort 5 sao", "Du thuyền riêng", "Lặn biển", "Spa", "Bữa ăn fine dining", "Hướng dẫn viên riêng"}',
  8500000,
  'limousine-9',
  '{"vi", "en", "zh", "ja", "ko"}',
  'Nha Trang Luxury 4 Days',
  true,
  '[{"day":1,"title":"Di chuyển","activities":["Bay/lái đến Nha Trang","Check-in resort 5 sao","Dinner hải sản"]},{"day":2,"title":"Biển đảo","activities":["Du thuyền Hòn Mun","Lặn biển san hô","BBQ trên đảo"]},{"day":3,"title":"Khám phá","activities":["Tháp Bà Ponagar","Vinpearl Land","Spa buổi tối"]},{"day":4,"title":"Về","activities":["Brunch tại resort","Shopping","Về TPHCM"]}]'
)
ON CONFLICT (slug) DO NOTHING;
