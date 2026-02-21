// auto-reassign: Tự động re-match nếu tài xế không phản hồi 5 phút
// Gọi qua pg_cron, external cron, hoặc Supabase Cron Jobs mỗi phút
// GET /auto-reassign hoặc POST /auto-reassign

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const TIMEOUT_MINUTES = 5

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const db = createClient(supabaseUrl, serviceRoleKey)

    // Tìm bookings đã matched nhưng chưa confirmed quá 5 phút
    const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000).toISOString()

    const { data: staleBookings, error: fetchError } = await db
      .from("bookings")
      .select("id, driver_id, vehicle_type, matched_at")
      .eq("status", "matched")
      .lt("matched_at", cutoff)

    if (fetchError) {
      throw new Error(`Fetch stale bookings failed: ${fetchError.message}`)
    }

    if (!staleBookings || staleBookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No stale bookings found", reassigned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`[auto-reassign] Found ${staleBookings.length} stale bookings`)

    const results: Array<{ booking_id: string; result: string }> = []

    for (const booking of staleBookings) {
      const oldDriverId = booking.driver_id

      // 1. Giải phóng tài xế cũ
      if (oldDriverId) {
        await db
          .from("drivers")
          .update({ is_available: true, updated_at: new Date().toISOString() })
          .eq("id", oldDriverId)
      }

      // 2. Reset booking về pending
      await db
        .from("bookings")
        .update({
          status: "pending",
          driver_id: null,
          matched_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)

      // 3. Thử match lại với tài xế khác
      const { data: matchResult, error: matchError } = await db.rpc("match_driver", {
        p_booking_id: booking.id,
      })

      if (matchError) {
        console.error(`[auto-reassign] Re-match failed for ${booking.id.slice(0, 8)}...`)
        results.push({ booking_id: booking.id, result: "failed" })
      } else if (matchResult?.success) {
        console.log(`[auto-reassign] Re-matched ${booking.id.slice(0, 8)}...`)
        results.push({ booking_id: booking.id, result: "re-matched" })
      } else {
        console.log(`[auto-reassign] No driver available for ${booking.id.slice(0, 8)}...`)
        results.push({ booking_id: booking.id, result: "no driver available" })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reassigned: results.filter((r) => r.result.startsWith("re-matched")).length,
        total: staleBookings.length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[auto-reassign] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Lỗi hệ thống. Vui lòng thử lại." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
