// daily-report: Cron gửi báo cáo hàng ngày cho admin
// Gọi qua Supabase Cron Jobs hoặc external cron
// GET /daily-report hoặc POST /daily-report

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

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

    // Khoảng thời gian: hôm qua 00:00 -> 23:59
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0).toISOString()
    const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString()
    const dateStr = yesterday.toISOString().slice(0, 10)

    console.log(`[daily-report] Generating report for ${dateStr}`)

    // 1. Thống kê bookings
    const { data: bookings } = await db
      .from("bookings")
      .select("status, estimated_fare")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)

    const all = bookings || []
    const counts: Record<string, number> = {}
    let totalRevenue = 0
    for (const b of all) {
      counts[b.status] = (counts[b.status] || 0) + 1
      if (b.status === "completed" && b.estimated_fare) {
        totalRevenue += b.estimated_fare
      }
    }

    // 2. Tài xế mới
    const { count: newDrivers } = await db
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)

    // 3. Tài xế hoạt động
    const { count: activeDrivers } = await db
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")

    // 4. Rating trung bình
    const { data: ratingData } = await db
      .from("drivers")
      .select("average_rating")
      .eq("status", "active")
      .not("average_rating", "is", null)

    let avgRating = 5.0
    if (ratingData && ratingData.length > 0) {
      avgRating = Math.round(
        (ratingData.reduce((s, d) => s + (d.average_rating || 5), 0) / ratingData.length) * 100
      ) / 100
    }

    const platformCommission = Math.round(totalRevenue * 0.10)

    const stats = {
      date: dateStr,
      total_bookings: all.length,
      pending: counts["pending"] || 0,
      matched: counts["matched"] || 0,
      confirmed: counts["confirmed"] || 0,
      completed: counts["completed"] || 0,
      cancelled: counts["cancelled"] || 0,
      total_revenue: totalRevenue,
      platform_commission: platformCommission,
      new_drivers: newDrivers || 0,
      active_drivers: activeDrivers || 0,
      avg_rating: avgRating,
    }

    const report = `
BAO CAO NGAY ${dateStr}
========================

DON HANG: ${stats.total_bookings}
  Cho tai xe: ${stats.pending}
  Da ghep: ${stats.matched}
  Da nhan: ${stats.confirmed}
  Hoan thanh: ${stats.completed}
  Da huy: ${stats.cancelled}

DOANH THU:
  Tong: ${stats.total_revenue.toLocaleString()}d
  Hoa hong (10%): ${stats.platform_commission.toLocaleString()}d

TAI XE:
  Moi dang ky: ${stats.new_drivers}
  Dang hoat dong: ${stats.active_drivers}
  Rating TB: ${stats.avg_rating}
========================`.trim()

    console.log("[daily-report]", report)

    return new Response(
      JSON.stringify({ success: true, stats, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[daily-report] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
