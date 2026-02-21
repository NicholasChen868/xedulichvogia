// pricing-engine: Tính giá động theo thời gian, khoảng cách, loại xe
// POST /pricing-engine
// Body: { distance_km, vehicle_type, pickup_time?, is_return_trip? }

import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Bảng giá cơ bản (VND/km)
const BASE_PRICING = [
  { min_km: 1, max_km: 70, price_per_km: 15000 },
  { min_km: 71, max_km: 150, price_per_km: 10000 },
  { min_km: 151, max_km: 250, price_per_km: 9000 },
  { min_km: 251, max_km: 99999, price_per_km: 8000 },
]

// Hệ số loại xe
const VEHICLE_MULTIPLIERS: Record<string, number> = {
  "sedan-4": 1.0,
  "suv-7": 1.3,
  "van-16": 1.8,
  "limousine-9": 2.2,
  "bus-29": 2.5,
  "bus-45": 3.0,
  "luxury": 3.5,
}

// Ngày lễ Việt Nam (MM-DD)
const HOLIDAYS = ["01-01", "04-30", "05-01", "09-02"]

// Tết Nguyên đán
const TET_RANGES = [
  { start: "2026-02-14", end: "2026-02-22" },
  { start: "2027-02-03", end: "2027-02-11" },
]

function calculateBaseFare(distanceKm: number) {
  let total = 0
  let remaining = distanceKm
  const breakdown: Array<{ label: string; value: number }> = []

  for (const tier of BASE_PRICING) {
    if (remaining <= 0) break
    const tierRange = tier.max_km - tier.min_km + 1
    const kmInTier = Math.min(remaining, tierRange)
    const tierCost = kmInTier * tier.price_per_km
    total += tierCost
    breakdown.push({
      label: `${tier.min_km}-${tier.max_km}km: ${kmInTier}km x ${tier.price_per_km.toLocaleString()}đ`,
      value: tierCost,
    })
    remaining -= kmInTier
  }

  return { total, breakdown }
}

function getTimeMultiplier(pickupTime: Date) {
  const hour = pickupTime.getHours()
  if (hour >= 6 && hour < 9) return { multiplier: 1.15, note: "Cao điểm sáng (+15%)" }
  if (hour >= 16 && hour < 19) return { multiplier: 1.15, note: "Cao điểm chiều (+15%)" }
  if (hour >= 22 || hour < 5) return { multiplier: 1.25, note: "Phụ thu đêm khuya (+25%)" }
  return { multiplier: 1.0, note: "Giờ bình thường" }
}

function getHolidaySurcharge(pickupTime: Date) {
  const dateStr = pickupTime.toISOString().slice(0, 10)
  const monthDay = dateStr.slice(5)

  for (const tet of TET_RANGES) {
    if (dateStr >= tet.start && dateStr <= tet.end) {
      return { surcharge: 0.50, note: "Phụ thu Tết Nguyên Đán (+50%)" }
    }
  }
  if (HOLIDAYS.includes(monthDay)) {
    return { surcharge: 0.30, note: "Phụ thu ngày lễ (+30%)" }
  }
  return { surcharge: 0, note: "" }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { distance_km, vehicle_type = "sedan-4", pickup_time, is_return_trip = false } = body

    if (!distance_km || distance_km <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "distance_km phải > 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Giá cơ bản
    const { total: baseFare, breakdown } = calculateBaseFare(distance_km)

    // 2. Hệ số loại xe
    const vehicleMultiplier = VEHICLE_MULTIPLIERS[vehicle_type] || 1.0

    // 3. Hệ số thời gian
    const pickupDate = pickup_time ? new Date(pickup_time) : new Date()
    const { multiplier: timeMultiplier, note: timeNote } = getTimeMultiplier(pickupDate)

    // 4. Phụ thu ngày lễ
    const { surcharge: holidaySurcharge, note: holidayNote } = getHolidaySurcharge(pickupDate)

    // 5. Giảm giá chiều về (-15%)
    const returnDiscount = is_return_trip ? 0.15 : 0

    // Tính giá cuối
    let finalFare = baseFare * vehicleMultiplier * timeMultiplier
    finalFare = finalFare * (1 + holidaySurcharge)
    finalFare = finalFare * (1 - returnDiscount)
    finalFare = Math.round(finalFare / 1000) * 1000 // Làm tròn 1000đ

    const notes: string[] = []
    if (timeMultiplier > 1) notes.push(timeNote)
    if (holidayNote) notes.push(holidayNote)
    if (is_return_trip) notes.push("Giảm giá chiều về (-15%)")

    return new Response(
      JSON.stringify({
        success: true,
        base_fare: baseFare,
        vehicle_multiplier: vehicleMultiplier,
        time_multiplier: timeMultiplier,
        return_discount: returnDiscount,
        holiday_surcharge: holidaySurcharge,
        final_fare: finalFare,
        breakdown,
        note: notes.length > 0 ? notes.join(" | ") : "Giá bình thường",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[pricing-engine] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
