// send-otp: Tạo + gửi OTP qua SMS cho xác thực SĐT tài xế
// POST /send-otp { phone, action? }
// SECURITY: OTP code không trả về cho client. Chỉ gửi qua SMS.

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

async function sendSms(phone: string, message: string) {
  if (!ESMS_API_KEY || !ESMS_SECRET_KEY) {
    console.log(`[send-otp] SMS not configured. TO: ${phone.slice(0, 4)}***`)
    return { success: true, note: "SMS not configured - logged only" }
  }

  // SECURITY: Sử dụng HTTPS
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
  return { success: result.CodeResult === "100", error: result.ErrorMessage }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { phone, action = "driver_register" } = await req.json()

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: "phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate action whitelist
    const allowedActions = ["driver_register", "driver_login"]
    if (!allowedActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const db = createClient(supabaseUrl, serviceRoleKey)

    // Gọi function create_otp trong DB (không còn trả code)
    const { data: otpResult, error } = await db.rpc("create_otp", {
      p_phone: phone,
      p_action: action,
    })

    if (error) throw error

    if (!otpResult?.success) {
      return new Response(
        JSON.stringify({ success: false, error: otpResult?.error || "Failed to create OTP" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Query OTP code trực tiếp từ DB qua service_role (create_otp không trả code nữa)
    const { data: otpRecord, error: queryErr } = await db
      .from("otp_codes")
      .select("code")
      .eq("phone", phone)
      .eq("action", action)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (queryErr || !otpRecord) {
      console.error("[send-otp] Could not retrieve OTP code from DB")
      return new Response(
        JSON.stringify({ success: false, error: "Internal error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const otpCode = otpRecord.code

    // Gửi SMS với OTP code
    const smsMessage = `[TravelCar] Ma xac thuc cua ban la: ${otpCode}. Het han sau 5 phut. Khong chia se ma nay.`
    const smsResult = await sendSms(phone, smsMessage)

    // SECURITY: Không log OTP code
    console.log(`[send-otp] Phone: ${phone.slice(0, 4)}*** | SMS sent: ${smsResult.success}`)

    return new Response(
      JSON.stringify({
        success: true,
        expires_in: 300,
        sms: smsResult.success,
        // SECURITY: Không trả OTP code cho client
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[send-otp] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
