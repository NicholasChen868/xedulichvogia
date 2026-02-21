// send-notification: Gửi thông báo SMS/Zalo khi match thành công
// POST /send-notification
// Body: { type, booking_id, phone, pickup, dropoff, driver_id }
//
// SETUP:
// supabase secrets set ESMS_API_KEY=xxx ESMS_SECRET_KEY=xxx ESMS_BRAND_NAME=TravelCar

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ESMS_API_KEY = Deno.env.get("ESMS_API_KEY") || ""
const ESMS_SECRET_KEY = Deno.env.get("ESMS_SECRET_KEY") || ""
const ESMS_BRAND_NAME = Deno.env.get("ESMS_BRAND_NAME") || "TravelCar"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface NotificationRequest {
  type: "booking_matched" | "booking_confirmed" | "booking_completed" | "driver_approved"
  booking_id?: string
  phone: string
  pickup?: string
  dropoff?: string
  driver_id?: string
}

function buildMessage(data: NotificationRequest, driverInfo?: Record<string, string>): string {
  switch (data.type) {
    case "booking_matched":
      return `[TravelCar] Don dat xe cua ban da duoc nhan! ` +
        `Tuyen: ${data.pickup} -> ${data.dropoff}. ` +
        `Tai xe: ${driverInfo?.full_name || "Dang cap nhat"}, ` +
        `Bien so: ${driverInfo?.license_plate || ""}. ` +
        `SDT tai xe: ${driverInfo?.phone || ""}. ` +
        `Cam on ban da su dung TravelCar!`

    case "booking_confirmed":
      return `[TravelCar] Tai xe da xac nhan chuyen di cua ban. ` +
        `Tuyen: ${data.pickup} -> ${data.dropoff}. ` +
        `Lien he: ${driverInfo?.phone || ""}. Chuc ban co chuyen di vui ve!`

    case "booking_completed":
      return `[TravelCar] Chuyen di ${data.pickup} -> ${data.dropoff} da hoan thanh. ` +
        `Cam on ban! Hay danh gia tai xe tai travelcar.vn`

    case "driver_approved":
      return `[TravelCar] Chuc mung! Tai khoan tai xe cua ban da duoc duyet. ` +
        `Truy cap travelcar.vn/driver-dashboard.html de bat dau nhan cuoc.`

    default:
      return `[TravelCar] Ban co thong bao moi. Truy cap travelcar.vn de xem chi tiet.`
  }
}

async function sendSmsEsms(phone: string, message: string) {
  if (!ESMS_API_KEY || !ESMS_SECRET_KEY) {
    // SECURITY: Mask phone, không log nội dung tin nhắn chứa PII
    console.log(`[send-notification] SMS not configured. TO: ${phone.slice(0, 4)}***`)
    return { success: true, error: "SMS provider not configured - logged only" }
  }

  try {
    // SECURITY: Sử dụng HTTPS để bảo vệ API credentials + nội dung SMS
    const response = await fetch("https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ApiKey: ESMS_API_KEY,
        Content: message,
        Phone: phone,
        SecretKey: ESMS_SECRET_KEY,
        Brandname: ESMS_BRAND_NAME,
        SmsType: "2",
      }),
    })

    const result = await response.json()
    if (result.CodeResult === "100") {
      console.log(`[send-notification] SMS sent to ${phone.slice(0, 4)}***`)
      return { success: true }
    } else {
      console.error(`[send-notification] SMS failed: ${result.ErrorMessage}`)
      return { success: false, error: result.ErrorMessage }
    }
  } catch (e) {
    console.error("[send-notification] SMS error:", e)
    return { success: false, error: e.message }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const data: NotificationRequest = await req.json()

    if (!data.phone) {
      return new Response(
        JSON.stringify({ success: false, error: "phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const db = createClient(supabaseUrl, serviceRoleKey)

    // Lấy thông tin tài xế nếu cần
    let driverInfo: Record<string, string> | undefined
    if (data.driver_id) {
      const { data: driver } = await db
        .from("drivers")
        .select("full_name, phone, license_plate, vehicle_brand")
        .eq("id", data.driver_id)
        .single()
      if (driver) driverInfo = driver as Record<string, string>
    }

    const message = buildMessage(data, driverInfo)
    const smsResult = await sendSmsEsms(data.phone, message)

    console.log(`[send-notification] Type: ${data.type} | Phone: ${data.phone.slice(0, 4)}*** | SMS: ${smsResult.success}`)

    return new Response(
      JSON.stringify({
        success: true,
        type: data.type,
        sms_sent: smsResult.success,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[send-notification] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
