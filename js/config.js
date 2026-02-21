/**
 * ============================================
 * XE DU LỊCH — CONFIGURATION
 * ============================================
 * All data is centralized here for easy Supabase migration.
 * When backend is ready, replace these with API calls.
 */

const APP_CONFIG = {
    name: 'TravelCar',
    tagline: 'Đặt Xe Du Lịch Nhanh Chóng & An Toàn',
    phone: '1900 xxxx',
    email: 'info@travelcar.vn',
    address: 'TP. Hồ Chí Minh, Việt Nam'
};

// Cloudflare Turnstile CAPTCHA
// Replace with your actual site key from https://dash.cloudflare.com/turnstile
const TURNSTILE_SITE_KEY = '0x4AAAAAAA_REPLACE_WITH_REAL_KEY';

/**
 * PRICING TIERS
 * Cơ cấu giá theo cự ly (VND/km)
 */
const PRICING_TIERS = [
    { minKm: 1, maxKm: 70, pricePerKm: 15000, label: '1 - 70 km' },
    { minKm: 71, maxKm: 150, pricePerKm: 10000, label: '70 - 150 km' },
    { minKm: 151, maxKm: 250, pricePerKm: 9000, label: '150 - 250 km' },
    { minKm: 251, maxKm: 99999, pricePerKm: 8000, label: 'Từ 250 km' }
];

/**
 * VEHICLE TYPES
 * Loại xe dịch vụ
 */
const VEHICLE_TYPES = [
    {
        id: 'sedan-4',
        name: 'Xe 4 chỗ',
        seats: 4,
        icon: 'fa-car',
        description: 'Sedan (Vios, Accent...), phù hợp 1-3 khách',
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&q=80',
        priceMultiplier: 1.0
    },
    {
        id: 'suv-7',
        name: 'Xe 7 chỗ',
        seats: 7,
        icon: 'fa-van-shuttle',
        description: 'SUV/MPV (Xpander, Innova), phù hợp 4-6 khách',
        image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&q=80',
        priceMultiplier: 1.3
    },
    {
        id: 'limousine-9',
        name: 'Limousine 9 chỗ',
        seats: 9,
        icon: 'fa-crown',
        description: 'Khoang hạng thương gia, VIP, rất êm ái',
        image: 'https://images.unsplash.com/photo-1596541671981-d93541178a57?w=600&q=80', // Hình nội thất VIP
        priceMultiplier: 2.2
    },
    {
        id: 'van-16',
        name: 'Xe 16 chỗ',
        seats: 16,
        icon: 'fa-shuttle-van',
        description: 'Ford Transit, Solati - Cho đại gia đình',
        image: 'https://images.unsplash.com/photo-1568285908226-0043c5b8e4e0?w=600&q=80', // Hình xe dài van
        priceMultiplier: 1.8
    },
    {
        id: 'bus-29',
        name: 'Xe 29 chỗ',
        seats: 29,
        icon: 'fa-bus-alt',
        description: 'Samco, Thaco - Cho đoàn du lịch cỡ trung',
        image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80', // Hình xe bus nhỏ
        priceMultiplier: 2.6
    },
    {
        id: 'bus-45',
        name: 'Xe 45 chỗ',
        seats: 45,
        icon: 'fa-bus',
        description: 'Universe - Dành cho tour, sự kiện lớn',
        image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80', // Hình xe bus lớn
        priceMultiplier: 3.5
    },
    {
        id: 'luxury-4',
        name: 'Xe Sang & VIP',
        seats: 4,
        icon: 'fa-gem',
        description: 'Mercedes, BMW, VinFast VF9... Sang trọng, đẳng cấp',
        image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&q=80',
        priceMultiplier: 3.0
    },
    {
        id: 'truck-500',
        name: 'Xe tải chở hàng',
        seats: 2,
        icon: 'fa-truck-fast',
        description: 'Xe tải 500kg - 1.5 tấn. Tủ đông lạnh, thiết bị',
        image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80',
        priceMultiplier: 1.5
    },
    {
        id: 'moving-service',
        name: 'Dịch vụ dọn nhà',
        seats: 2,
        icon: 'fa-boxes-packing',
        description: 'Xe tải lớn, bao gồm phí đóng gói & bốc xếp',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
        priceMultiplier: 5.0
    }
];

/**
 * POPULAR ROUTES
 * Data sẽ được load từ Supabase sau
 */
const POPULAR_ROUTES = [
    { from: 'TP.HCM', to: 'Đà Lạt', distance: 310, icon: 'fa-mountain' },
    { from: 'TP.HCM', to: 'Vũng Tàu', distance: 125, icon: 'fa-umbrella-beach' },
    { from: 'TP.HCM', to: 'Phan Thiết', distance: 200, icon: 'fa-water' },
    { from: 'TP.HCM', to: 'Nha Trang', distance: 430, icon: 'fa-sun' },
    { from: 'TP.HCM', to: 'Cần Thơ', distance: 170, icon: 'fa-leaf' },
    { from: 'Hà Nội', to: 'Hạ Long', distance: 165, icon: 'fa-ship' }
];

/**
 * TRUST STATS
 */
const TRUST_STATS = [
    { number: '12,000+', label: 'Đánh giá 5 sao', icon: 'fa-star' },
    { number: '500,000+', label: 'Khách hàng', icon: 'fa-users' },
    { number: '1,200+', label: 'Tài xế đối tác', icon: 'fa-id-badge' },
    { number: '24/7', label: 'Hỗ trợ', icon: 'fa-headset' }
];

/**
 * HOW IT WORKS STEPS
 */
const STEPS = [
    {
        number: 1,
        title: 'Nhập thông tin chuyến đi',
        description: 'Chọn điểm đón, điểm đến, ngày giờ và loại xe phù hợp.',
        icon: 'fa-location-dot'
    },
    {
        number: 2,
        title: 'Xác nhận và thanh toán',
        description: 'Xem báo giá tức thì, chọn phương thức thanh toán phù hợp.',
        icon: 'fa-credit-card'
    },
    {
        number: 3,
        title: 'Tài xế đón bạn',
        description: 'Tài xế gần nhất sẽ được ghép tự động và đón bạn đúng giờ.',
        icon: 'fa-car-side'
    }
];
