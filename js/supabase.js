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
let supabase = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase connected');
        return supabase;
    } else {
        console.warn('⚠️ Supabase JS library not loaded. Add CDN script to HTML.');
        return null;
    }
}

// ===== DATABASE OPERATIONS =====

/**
 * Submit a booking request
 */
async function submitBooking(bookingData) {
    if (!supabase) return { error: 'Supabase not initialized' };

    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            pickup_location: bookingData.pickup,
            dropoff_location: bookingData.dropoff,
            date_go: bookingData.date_go,
            date_return: bookingData.date_return || null,
            vehicle_type: bookingData.vehicle_type,
            distance_km: parseInt(bookingData.distance_km) || null,
            estimated_fare: bookingData.estimated_fare || null,
            customer_phone: bookingData.phone,
            status: 'pending'
        }])
        .select();

    return { data, error };
}

/**
 * Submit a driver registration
 */
async function submitDriverRegistration(driverData) {
    if (!supabase) return { error: 'Supabase not initialized' };

    const { data, error } = await supabase
        .from('drivers')
        .insert([{
            full_name: driverData.full_name,
            phone: driverData.phone,
            email: driverData.email || null,
            vehicle_type: driverData.vehicle_type,
            license_plate: driverData.license_plate,
            vehicle_brand: driverData.vehicle_brand || null,
            operating_areas: driverData.areas || [],
            status: 'pending'
        }])
        .select();

    return { data, error };
}

/**
 * Fetch pricing tiers from database
 * Falls back to config.js data if DB is empty
 */
async function fetchPricingTiers() {
    if (!supabase) return PRICING_TIERS;

    const { data, error } = await supabase
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
    if (!supabase) return VEHICLE_TYPES;

    const { data, error } = await supabase
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
    if (!supabase) return POPULAR_ROUTES;

    const { data, error } = await supabase
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
