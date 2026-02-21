// verify-otp: Xác thực OTP code
// POST /verify-otp { phone, code, action? }

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { phone, code, action = "driver_register" } = await req.json()

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "phone and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const db = createClient(supabaseUrl, serviceRoleKey)

    // Gọi function verify_otp trong DB
    const { data: result, error } = await db.rpc("verify_otp", {
      p_phone: phone,
      p_code: code,
      p_action: action,
    })

    if (error) throw error

    console.log(`[verify-otp] Phone: ${phone} | Result: ${result?.success}`)

    const status = result?.success ? 200 : 400
    return new Response(
      JSON.stringify(result),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[verify-otp] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
