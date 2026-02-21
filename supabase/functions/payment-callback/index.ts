// payment-callback: Xử lý IPN callback từ Momo/VNPay/ZaloPay
// POST /payment-callback (gọi bởi payment provider)

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
    const db = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()

    console.log("[payment-callback] Received:", JSON.stringify(body))

    let orderId = ""
    let isSuccess = false
    let provider = ""

    // === MOMO IPN ===
    if (body.partnerCode && body.orderId) {
      provider = "momo"
      orderId = body.orderId
      isSuccess = body.resultCode === 0
      console.log(`[payment-callback] Momo | Order: ${orderId} | Result: ${body.resultCode}`)
    }

    // === VNPAY IPN ===
    else if (body.vnp_TxnRef) {
      provider = "vnpay"
      orderId = body.vnp_TxnRef
      isSuccess = body.vnp_ResponseCode === "00"
      console.log(`[payment-callback] VNPay | Order: ${orderId} | Response: ${body.vnp_ResponseCode}`)
    }

    // === ZALOPAY IPN ===
    else if (body.app_trans_id) {
      provider = "zalopay"
      orderId = body.app_trans_id
      isSuccess = body.return_code === 1
      console.log(`[payment-callback] ZaloPay | Order: ${orderId} | Return: ${body.return_code}`)
    }

    else {
      console.warn("[payment-callback] Unknown provider format")
      return new Response(
        JSON.stringify({ success: false, error: "Unknown provider" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Tìm payment record
    const { data: payment, error: findErr } = await db
      .from("payments")
      .select("id, booking_id, status")
      .eq("provider_order_id", orderId)
      .single()

    if (findErr || !payment) {
      console.error(`[payment-callback] Payment not found for order: ${orderId}`)
      return new Response(
        JSON.stringify({ success: false, error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Đã xử lý rồi thì bỏ qua (idempotent)
    if (payment.status === "paid") {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const newStatus = isSuccess ? "paid" : "failed"

    // Cập nhật payment
    await db
      .from("payments")
      .update({
        status: newStatus,
        callback_data: body,
        paid_at: isSuccess ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)

    // Cập nhật booking deposit status
    await db
      .from("bookings")
      .update({
        deposit_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.booking_id)

    console.log(`[payment-callback] ${provider} | Order: ${orderId} | Status: ${newStatus}`)

    // Momo yêu cầu trả 204, VNPay cần RspCode
    if (provider === "momo") {
      return new Response(null, { status: 204 })
    }
    if (provider === "vnpay") {
      return new Response(
        JSON.stringify({ RspCode: "00", Message: "Confirm Success" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ return_code: 1, return_message: "success" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[payment-callback] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
