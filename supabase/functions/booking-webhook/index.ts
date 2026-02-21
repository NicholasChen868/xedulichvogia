// booking-webhook: Webhook khi booking status thay đổi
// Được gọi từ Database Webhook (Supabase Dashboard > Database > Webhooks)
// Trigger: UPDATE on bookings table

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface BookingRecord {
  id: string
  pickup_location: string
  dropoff_location: string
  customer_phone: string
  vehicle_type: string
  status: string
  driver_id: string | null
  estimated_fare: number | null
  matched_at: string | null
  updated_at: string | null
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE"
  table: string
  record: BookingRecord
  old_record: BookingRecord
  schema: string
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload: WebhookPayload = await req.json()
    const { type, record, old_record } = payload

    console.log(`[booking-webhook] ${type} | Booking ${record.id} | Status: ${old_record?.status} -> ${record.status}`)

    const db = createClient(supabaseUrl, serviceRoleKey)

    // Xử lý theo trạng thái mới
    switch (record.status) {
      case "matched": {
        // Booking vừa được match với tài xế
        console.log(`[booking-webhook] Matched: ${record.id} -> driver ${record.driver_id}`)

        // Gọi send-notification để thông báo cho khách
        if (record.customer_phone) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                type: "booking_matched",
                booking_id: record.id,
                phone: record.customer_phone,
                pickup: record.pickup_location,
                dropoff: record.dropoff_location,
                driver_id: record.driver_id,
              }),
            })
          } catch (e) {
            console.error("[booking-webhook] Failed to call send-notification:", e)
          }
        }
        break
      }

      case "confirmed": {
        // Tài xế đã nhận cuốc
        console.log(`[booking-webhook] Confirmed: ${record.id}`)
        break
      }

      case "completed": {
        // Chuyến đi hoàn thành
        console.log(`[booking-webhook] Completed: ${record.id} | Fare: ${record.estimated_fare}`)

        // Tính hoa hồng 10% platform
        if (record.estimated_fare && record.driver_id) {
          const commission = Math.round(record.estimated_fare * 0.10)
          const driverEarning = record.estimated_fare - commission

          // Log commission (future: insert vào bảng commissions)
          console.log(`[booking-webhook] Commission: ${commission} VND | Driver earning: ${driverEarning} VND`)

          // Cập nhật driver stats
          await db.rpc("increment_driver_trips", { p_driver_id: record.driver_id })
        }
        break
      }

      case "cancelled": {
        // Đơn bị hủy — giải phóng tài xế
        console.log(`[booking-webhook] Cancelled: ${record.id}`)
        if (record.driver_id && old_record?.status !== "cancelled") {
          await db
            .from("drivers")
            .update({ is_available: true, updated_at: new Date().toISOString() })
            .eq("id", record.driver_id)
        }
        break
      }

      default:
        console.log(`[booking-webhook] Unhandled status: ${record.status}`)
    }

    // Log event vào bảng webhook_logs (future)
    console.log(`[booking-webhook] Processed successfully`)

    return new Response(
      JSON.stringify({ success: true, status: record.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[booking-webhook] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
