// calculate-distance: Tính khoảng cách + thời gian di chuyển qua Google Maps
// POST /calculate-distance { origin, destination }
//
// SETUP: supabase secrets set GOOGLE_MAPS_API_KEY=xxx

import "@supabase/functions-js/edge-runtime.d.ts"

const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") || ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Cache popular routes để giảm API calls
const ROUTE_CACHE: Record<string, { distance_km: number; duration_min: number; cached_at: number }> = {}
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 giờ

// Fallback khoảng cách phổ biến (km) khi không có API key
const FALLBACK_DISTANCES: Record<string, number> = {
  "ho chi minh_vung tau": 125,
  "ho chi minh_da lat": 310,
  "ho chi minh_nha trang": 430,
  "ho chi minh_phan thiet": 200,
  "ho chi minh_can tho": 170,
  "ho chi minh_long an": 50,
  "ho chi minh_binh duong": 30,
  "ho chi minh_dong nai": 35,
  "ha noi_hai phong": 120,
  "ha noi_ha long": 165,
  "ha noi_ninh binh": 95,
  "ha noi_sa pa": 315,
  "da nang_hoi an": 30,
  "da nang_hue": 100,
}

function getCacheKey(origin: string, destination: string): string {
  return `${origin.toLowerCase().trim()}_${destination.toLowerCase().trim()}`
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { origin, destination } = await req.json()

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ success: false, error: "origin and destination are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const cacheKey = getCacheKey(origin, destination)

    // 1. Check cache
    if (ROUTE_CACHE[cacheKey] && Date.now() - ROUTE_CACHE[cacheKey].cached_at < CACHE_TTL) {
      const cached = ROUTE_CACHE[cacheKey]
      return new Response(
        JSON.stringify({
          success: true,
          distance_km: cached.distance_km,
          duration_min: cached.duration_min,
          source: "cache",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Gọi Google Maps Distance Matrix API
    if (GOOGLE_MAPS_KEY) {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
      url.searchParams.set("origins", origin)
      url.searchParams.set("destinations", destination)
      url.searchParams.set("key", GOOGLE_MAPS_KEY)
      url.searchParams.set("language", "vi")
      url.searchParams.set("units", "metric")

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === "OK" && data.rows?.[0]?.elements?.[0]?.status === "OK") {
        const element = data.rows[0].elements[0]
        const distanceKm = Math.round(element.distance.value / 1000)
        const durationMin = Math.round(element.duration.value / 60)

        // Cache kết quả
        ROUTE_CACHE[cacheKey] = { distance_km: distanceKm, duration_min: durationMin, cached_at: Date.now() }

        console.log(`[calculate-distance] ${origin} -> ${destination}: ${distanceKm}km, ${durationMin}min`)

        return new Response(
          JSON.stringify({
            success: true,
            distance_km: distanceKm,
            duration_min: durationMin,
            duration_text: element.duration.text,
            distance_text: element.distance.text,
            origin_address: data.origin_addresses?.[0] || origin,
            destination_address: data.destination_addresses?.[0] || destination,
            source: "google_maps",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      } else {
        console.warn(`[calculate-distance] Google Maps error: ${data.status}`, data.error_message)
      }
    }

    // 3. Fallback: dùng bảng khoảng cách phổ biến
    const normalOrigin = normalizeName(origin)
    const normalDest = normalizeName(destination)

    // Thử cả 2 chiều
    const fallbackKey1 = `${normalOrigin}_${normalDest}`
    const fallbackKey2 = `${normalDest}_${normalOrigin}`
    const fallbackDistance = FALLBACK_DISTANCES[fallbackKey1] || FALLBACK_DISTANCES[fallbackKey2]

    if (fallbackDistance) {
      const estDuration = Math.round(fallbackDistance * 1.2) // ~50km/h trung bình
      return new Response(
        JSON.stringify({
          success: true,
          distance_km: fallbackDistance,
          duration_min: estDuration,
          source: "fallback",
          note: "Khoảng cách ước tính. Kết quả chính xác hơn khi cấu hình Google Maps API.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 4. Không tìm được
    return new Response(
      JSON.stringify({
        success: false,
        error: "Không tìm được khoảng cách. Vui lòng nhập khoảng cách thủ công.",
        note: GOOGLE_MAPS_KEY ? "Google Maps không trả kết quả cho tuyến đường này." : "Google Maps API chưa được cấu hình.",
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[calculate-distance] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Lỗi tính khoảng cách. Vui lòng thử lại." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
