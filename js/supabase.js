/**
 * ============================================
 * SUPABASE CLIENT INITIALIZATION
 * ============================================
 * Frontend Supabase client using the anon key.
 * For static HTML sites, we load the Supabase JS library from CDN
 * and initialize with the public URL + anon key.
 *
 * NOTE: The anon key is safe to expose in frontend code.
 * It only grants access through RLS policies.
 */

const SUPABASE_URL = 'https://fjcobjsgcuzbruyoaotz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqY29ianNnY3V6YnJ1eW9hb3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTUzMDgsImV4cCI6MjA4NzIzMTMwOH0.fovLEr8YCCAQYigVPLF4IBgXVzhAKHsCd50-w2xXJbM';

// Initialize Supabase client (requires supabase-js CDN loaded in HTML)
let db = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase connected');
        return db;
    } else {
        console.warn('⚠️ Supabase JS library not loaded. Add CDN script to HTML.');
        return null;
    }
}

// ===== DATABASE OPERATIONS =====

/**
 * Submit a booking request (rate-limited: 5/SĐT/giờ)
 */
async function submitBooking(bookingData) {
    if (!db) return { error: 'Supabase not initialized' };

    const { data, error } = await db.rpc('submit_booking_rated', {
        p_pickup: bookingData.pickup,
        p_dropoff: bookingData.dropoff,
        p_date_go: bookingData.date_go,
        p_date_return: bookingData.date_return || null,
        p_vehicle_type: bookingData.vehicle_type,
        p_distance_km: parseInt(bookingData.distance_km) || null,
        p_estimated_fare: bookingData.estimated_fare || null,
        p_phone: bookingData.phone,
        p_customer_name: bookingData.customer_name || null
    });

    if (error) return { data: null, error };

    // RPC trả JSON — handle rate limit
    if (data && !data.success) {
        return { data: null, error: { message: data.error } };
    }

    return { data: data?.booking ? [data.booking] : null, error: null };
}

/**
 * Submit a driver registration (rate-limited: 3/SĐT/ngày)
 */
async function submitDriverRegistration(driverData) {
    if (!db) return { error: 'Supabase not initialized' };

    const { data, error } = await db.rpc('submit_driver_registration_rated', {
        p_full_name: driverData.full_name,
        p_phone: driverData.phone,
        p_email: driverData.email || null,
        p_vehicle_type: driverData.vehicle_type,
        p_license_plate: driverData.license_plate,
        p_vehicle_brand: driverData.vehicle_brand || null,
        p_operating_areas: driverData.areas || []
    });

    if (error) return { data: null, error };

    // RPC trả JSON — handle rate limit
    if (data && !data.success) {
        return { data: null, error: { message: data.error } };
    }

    return { data: data?.driver ? [data.driver] : null, error: null };
}

/**
 * Fetch pricing tiers from database
 * Falls back to config.js data if DB is empty
 */
async function fetchPricingTiers() {
    if (!db) return PRICING_TIERS;

    const { data, error } = await db
        .from('pricing_tiers')
        .select('*')
        .order('min_km', { ascending: true });

    if (error || !data || data.length === 0) {
        console.warn('Using local pricing config (DB empty or error)');
        return PRICING_TIERS;
    }

    return data.map(tier => ({
        minKm: tier.min_km,
        maxKm: tier.max_km,
        pricePerKm: tier.price_per_km,
        label: tier.label
    }));
}

/**
 * Fetch vehicle types from database
 */
async function fetchVehicleTypes() {
    if (!db) return VEHICLE_TYPES;

    const { data, error } = await db
        .from('vehicle_types')
        .select('*')
        .order('seats', { ascending: true });

    if (error || !data || data.length === 0) {
        console.warn('Using local vehicle config (DB empty or error)');
        return VEHICLE_TYPES;
    }

    return data;
}

/**
 * Fetch popular routes from database
 */
async function fetchPopularRoutes() {
    if (!db) return POPULAR_ROUTES;

    const { data, error } = await db
        .from('popular_routes')
        .select('*')
        .order('distance', { ascending: true });

    if (error || !data || data.length === 0) {
        console.warn('Using local routes config (DB empty or error)');
        return POPULAR_ROUTES;
    }

    return data.map(route => ({
        from: route.from_city,
        to: route.to_city,
        distance: route.distance,
        icon: route.icon
    }));
}

// ===== MATCHING SYSTEM =====

/**
 * Gọi hàm match_driver trong PostgreSQL
 * Tìm tài xế phù hợp nhất cho booking
 */
async function matchDriver(bookingId) {
    if (!db) return { error: 'Supabase not initialized' };

    const { data, error } = await db.rpc('match_driver', {
        p_booking_id: bookingId
    });

    return { data, error };
}

/**
 * Submit booking VÀ tự động match tài xế
 */
async function submitBookingWithMatch(bookingData) {
    const bookingResult = await submitBooking(bookingData);
    if (bookingResult.error || !bookingResult.data?.[0]) {
        return bookingResult;
    }

    const bookingId = bookingResult.data[0].id;
    const matchResult = await matchDriver(bookingId);

    return {
        booking: bookingResult.data[0],
        match: matchResult.data || { success: false, message: 'Match pending' },
        error: null
    };
}

// ===== DRIVER DASHBOARD =====

/**
 * Đăng nhập tài xế bằng số điện thoại
 */
async function driverLogin(phone) {
    if (!db) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await db
        .from('drivers')
        .select('*')
        .eq('phone', phone)
        .eq('status', 'active')
        .single();

    return { data, error };
}

/**
 * Lấy cuốc xe được gán cho tài xế
 */
async function getDriverRides(driverId, status) {
    if (!db) return { data: [], error: null };

    let query = db
        .from('bookings')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    return { data: data || [], error };
}

/**
 * Tài xế xác nhận cuốc xe
 */
async function confirmRide(bookingId, driverId) {
    if (!db) return { error: 'Supabase not initialized' };

    const { data, error } = await db
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('driver_id', driverId)
        .select();

    return { data, error };
}

/**
 * Tài xế từ chối cuốc xe → trả lại pool
 */
async function rejectRide(bookingId, driverId) {
    if (!db) return { error: 'Supabase not initialized' };

    // Trả booking về pending, bỏ driver_id
    const { error: bookingErr } = await db
        .from('bookings')
        .update({
            status: 'pending',
            driver_id: null,
            matched_at: null,
            updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .eq('driver_id', driverId);

    // Tài xế available lại
    await db
        .from('drivers')
        .update({ is_available: true, updated_at: new Date().toISOString() })
        .eq('id', driverId);

    return { error: bookingErr };
}

/**
 * Hoàn thành cuốc xe
 */
async function completeRide(bookingId, driverId) {
    if (!db) return { error: 'Supabase not initialized' };

    const { data, error } = await db
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('driver_id', driverId)
        .select();

    // Tài xế available lại + tăng trip count
    if (!error) {
        await db.rpc('increment_driver_trips', { p_driver_id: driverId }).catch(() => { });
        await db
            .from('drivers')
            .update({
                is_available: true,
                total_trips: db.raw ? undefined : undefined, // handled by rpc above
                updated_at: new Date().toISOString()
            })
            .eq('id', driverId);
    }

    return { data, error };
}

/**
 * Toggle trạng thái online/offline tài xế
 */
async function toggleDriverAvailability(driverId, isAvailable) {
    if (!db) return { error: 'Supabase not initialized' };

    const { data, error } = await db
        .from('drivers')
        .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
        .eq('id', driverId)
        .select();

    return { data, error };
}

/**
 * Theo dõi cuốc xe realtime cho tài xế
 */
function subscribeDriverRides(driverId, callback) {
    if (!db) return null;

    return db
        .channel('driver-rides-' + driverId)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: 'driver_id=eq.' + driverId
        }, payload => {
            callback(payload);
        })
        .subscribe();
}

// ===== ADMIN DASHBOARD =====

/** Lấy tất cả bookings (admin) */
async function adminGetBookings(status, limit = 50) {
    if (!db) return { data: [], error: null };
    let query = db.from('bookings').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    return { data: data || [], error };
}

/** Lấy tất cả drivers (admin) */
async function adminGetDrivers(status, limit = 50) {
    if (!db) return { data: [], error: null };
    let query = db.from('drivers').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    return { data: data || [], error };
}

/** Thống kê tổng quan */
async function adminGetStats() {
    if (!db) return {};
    const [bookings, drivers] = await Promise.all([
        db.from('bookings').select('status, estimated_fare'),
        db.from('drivers').select('status, is_available')
    ]);
    const b = bookings.data || [];
    const d = drivers.data || [];
    return {
        totalBookings: b.length,
        pendingBookings: b.filter(x => x.status === 'pending').length,
        matchedBookings: b.filter(x => x.status === 'matched').length,
        confirmedBookings: b.filter(x => x.status === 'confirmed').length,
        completedBookings: b.filter(x => x.status === 'completed').length,
        totalRevenue: b.filter(x => x.status === 'completed').reduce((s, x) => s + (x.estimated_fare || 0), 0),
        totalDrivers: d.length,
        activeDrivers: d.filter(x => x.status === 'active').length,
        onlineDrivers: d.filter(x => x.status === 'active' && x.is_available).length,
        pendingDrivers: d.filter(x => x.status === 'pending').length
    };
}

/** Duyệt tài xế */
async function adminApproveDriver(driverId) {
    if (!db) return { error: 'Not initialized' };
    const { data, error } = await db.from('drivers')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', driverId).select();
    return { data, error };
}

/** Khóa tài xế */
async function adminSuspendDriver(driverId) {
    if (!db) return { error: 'Not initialized' };
    const { data, error } = await db.from('drivers')
        .update({ status: 'suspended', is_available: false, updated_at: new Date().toISOString() })
        .eq('id', driverId).select();
    return { data, error };
}

/** Hủy booking */
async function adminCancelBooking(bookingId) {
    if (!db) return { error: 'Not initialized' };
    const { data, error } = await db.from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId).select();
    return { data, error };
}

/** Match thủ công */
async function adminManualMatch(bookingId) {
    if (!db) return { error: 'Not initialized' };
    const { data, error } = await db.rpc('match_driver', { p_booking_id: bookingId });
    return { data, error };
}

// ===== TRA CỨU ĐƠN =====

/** Tra cứu booking theo SĐT */
async function lookupBookingsByPhone(phone) {
    if (!db) return { data: [], error: null };
    const { data, error } = await db.from('bookings')
        .select('*')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false })
        .limit(10);

    // Nếu có driver_id, lấy thêm thông tin tài xế
    if (data && data.length > 0) {
        const driverIds = [...new Set(data.filter(b => b.driver_id).map(b => b.driver_id))];
        if (driverIds.length > 0) {
            const { data: drivers } = await db.from('drivers')
                .select('id, full_name, phone, license_plate, vehicle_brand, average_rating, total_ratings')
                .in('id', driverIds);
            const driverMap = {};
            (drivers || []).forEach(d => driverMap[d.id] = d);
            data.forEach(b => {
                if (b.driver_id && driverMap[b.driver_id]) {
                    b._driver = driverMap[b.driver_id];
                }
            });
        }
    }
    return { data: data || [], error };
}

// ===== ADMIN AUTHENTICATION =====

/** Đăng nhập admin bằng email + password (Supabase Auth) */
async function signInAdmin(email, password) {
    if (!db) return { data: null, error: 'Supabase not initialized' };
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    return { data, error };
}

/** Đăng xuất admin */
async function signOutAdmin() {
    if (!db) return { error: 'Supabase not initialized' };
    const { error } = await db.auth.signOut();
    return { error };
}

/** Kiểm tra session admin hiện tại */
async function checkAdminSession() {
    if (!db) return { session: null };
    const { data: { session }, error } = await db.auth.getSession();
    return { session, error };
}

/** Lắng nghe thay đổi auth state */
function onAdminAuthChange(callback) {
    if (!db) return null;
    return db.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
