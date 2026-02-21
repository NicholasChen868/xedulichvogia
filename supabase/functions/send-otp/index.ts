// send-otp: Tạo + gửi OTP qua SMS cho xác thực SĐT tài xế
// POST /send-otp { phone, action? }

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const ESMS_API_KEY = Deno.env.get("ESMS_API_KEY") || ""
const ESMS_SECRET_KEY = Deno.env.get("ESMS_SECRET_KEY") || ""
const ESMS_BRAND_NAME = Deno.env.get("ESMS_BRAND_NAME") || "TravelCar"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function sendSms(phone: string, message: string) {
  if (!ESMS_API_KEY || !ESMS_SECRET_KEY) {
    console.log(`[send-otp] SMS not configured. TO: ${phone} | MSG: ${message}`)
    return { success: true, note: "SMS not configured - logged only" }
  }

  const response = await fetch("http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/", {
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

    const db = createClient(supabaseUrl, serviceRoleKey)

    // Gọi function create_otp trong DB
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

    // Gửi SMS với OTP code
    const otpCode = otpResult.code
    const smsMessage = `[TravelCar] Ma xac thuc cua ban la: ${otpCode}. Het han sau 5 phut. Khong chia se ma nay.`
    const smsResult = await sendSms(phone, smsMessage)

    console.log(`[send-otp] Phone: ${phone} | Code: ${otpCode} | SMS: ${smsResult.success}`)

    return new Response(
      JSON.stringify({
        success: true,
        expires_in: otpResult.expires_in,
        sms: smsResult.success,
        // Không trả code trong production! Chỉ log.
        // code: otpCode, // DEV ONLY
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[send-otp] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
