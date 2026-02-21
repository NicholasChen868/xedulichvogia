// tour-api: API cho dịch vụ tour (list, detail, book, custom tour)
// GET  /tour-api?action=list&tier=basic&lang=en
// GET  /tour-api?action=detail&slug=kham-pha-vung-tau-1-ngay&lang=vi
// POST /tour-api { action: "book", tour_id, customer_name, customer_phone, ... }
// POST /tour-api { action: "custom", customer_name, customer_phone, custom_idea, ... }

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY") || ""

async function verifyCaptcha(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY || !token) return false
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Dịch tên + mô tả theo ngôn ngữ
function localize(tour: Record<string, unknown>, lang: string) {
  if (lang === "vi") return tour

  const langSuffix = `_${lang}`
  const localizedName = tour[`name${langSuffix}`] || tour.name
  const localizedDesc = tour[`description${langSuffix}`] || tour.description

  return { ...tour, name: localizedName, description: localizedDesc }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const db = createClient(supabaseUrl, serviceRoleKey)
    const url = new URL(req.url)

    // GET requests (list, detail)
    if (req.method === "GET") {
      const action = url.searchParams.get("action") || "list"
      const lang = url.searchParams.get("lang") || "vi"

      if (action === "list") {
        const tier = url.searchParams.get("tier")
        const category = url.searchParams.get("category")

        let query = db
          .from("tour_packages")
          .select("id, name, slug, description, tier, category, destination, duration_days, max_guests, price_per_person, price_per_group, vehicle_type, languages, cover_image, featured, includes, name_en, name_zh, name_ja, name_ko, description_en, description_zh, description_ja, description_ko")
          .eq("is_active", true)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })

        if (tier) query = query.eq("tier", tier)
        if (category) query = query.eq("category", category)

        const { data: tours, error } = await query
        if (error) throw error

        // Localize
        const localizedTours = (tours || []).map(t => localize(t, lang))

        return new Response(
          JSON.stringify({ success: true, tours: localizedTours, total: localizedTours.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      if (action === "detail") {
        const slug = url.searchParams.get("slug")
        if (!slug) {
          return new Response(
            JSON.stringify({ success: false, error: "slug is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }

        const { data: tour, error } = await db
          .from("tour_packages")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .single()

        if (error || !tour) {
          return new Response(
            JSON.stringify({ success: false, error: "Tour không tồn tại" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, tour: localize(tour, lang) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    // POST requests (book, custom)
    if (req.method === "POST") {
      const body = await req.json()
      const { action, captcha_token } = body

      // SECURITY: Verify CAPTCHA if configured
      if (TURNSTILE_SECRET_KEY && captcha_token) {
        const captchaValid = await verifyCaptcha(captcha_token)
        if (!captchaValid) {
          return new Response(
            JSON.stringify({ success: false, error: "CAPTCHA verification failed" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }

      // === Đặt tour có sẵn ===
      if (action === "book") {
        const { tour_id, customer_name, customer_phone, customer_email, num_guests, tour_date, language, pickup_location, special_requests } = body

        if (!tour_id || !customer_name || !customer_phone || !tour_date) {
          return new Response(
            JSON.stringify({ success: false, error: "Thiếu thông tin bắt buộc: tour_id, customer_name, customer_phone, tour_date" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }

        // Lấy giá tour
        const { data: tour } = await db
          .from("tour_packages")
          .select("price_per_person, price_per_group, name")
          .eq("id", tour_id)
          .single()

        const guests = num_guests || 1
        const estimatedPrice = tour?.price_per_group || (tour?.price_per_person || 0) * guests

        const { data: booking, error } = await db
          .from("tour_bookings")
          .insert({
            tour_package_id: tour_id,
            customer_name,
            customer_phone,
            customer_email: customer_email || null,
            num_guests: guests,
            tour_date,
            language: language || "vi",
            pickup_location: pickup_location || null,
            special_requests: special_requests || null,
            estimated_price: estimatedPrice,
            is_custom: false,
            status: "pending",
          })
          .select()
          .single()

        if (error) throw error

        console.log(`[tour-api] Booked: ${tour?.name} | ${(customer_name as string).slice(0, 3)}*** | ${tour_date}`)

        return new Response(
          JSON.stringify({
            success: true,
            booking,
            message: `Đặt tour thành công! Chúng tôi sẽ liên hệ xác nhận qua SĐT ${customer_phone}.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // === Tour tùy chỉnh ===
      if (action === "custom") {
        const { customer_name, customer_phone, customer_email, custom_idea, num_guests, tour_date, language, pickup_location } = body

        if (!customer_name || !customer_phone || !custom_idea) {
          return new Response(
            JSON.stringify({ success: false, error: "Thiếu thông tin: customer_name, customer_phone, custom_idea" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }

        const { data: booking, error } = await db
          .from("tour_bookings")
          .insert({
            customer_name,
            customer_phone,
            customer_email: customer_email || null,
            num_guests: num_guests || 1,
            tour_date: tour_date || null,
            language: language || "vi",
            pickup_location: pickup_location || null,
            is_custom: true,
            custom_idea,
            status: "pending",
          })
          .select()
          .single()

        if (error) throw error

        console.log(`[tour-api] Custom tour request from ${(customer_name as string).slice(0, 3)}***`)

        return new Response(
          JSON.stringify({
            success: true,
            booking,
            message: "Yêu cầu tour tùy chỉnh đã được ghi nhận! Admin sẽ liên hệ báo giá và lịch trình trong 24h.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      return new Response(
        JSON.stringify({ success: false, error: "action phải là 'book' hoặc 'custom'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[tour-api] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Lỗi hệ thống. Vui lòng thử lại." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
