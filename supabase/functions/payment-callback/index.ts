// payment-callback: Xử lý IPN callback từ Momo/VNPay/ZaloPay
// POST /payment-callback (gọi bởi payment provider)
// SECURITY: Verify HMAC signature trước khi xử lý

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Payment provider secrets for signature verification
const MOMO_SECRET_KEY = Deno.env.get("MOMO_SECRET_KEY") || ""
const MOMO_ACCESS_KEY = Deno.env.get("MOMO_ACCESS_KEY") || ""
const VNPAY_HASH_SECRET = Deno.env.get("VNPAY_HASH_SECRET") || ""
const ZALOPAY_KEY2 = Deno.env.get("ZALOPAY_KEY2") || ""

// CORS chỉ cho phép domain chính (callback từ provider là server-to-server, không cần CORS rộng)
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ===== HMAC HELPERS =====

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const msgData = encoder.encode(message)
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("")
}

async function hmacSha512(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const msgData = encoder.encode(message)
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("")
}

// ===== SIGNATURE VERIFICATION =====

async function verifyMomoSignature(body: Record<string, unknown>): Promise<boolean> {
  if (!MOMO_SECRET_KEY) {
    console.error("[payment-callback] MOMO_SECRET_KEY not configured")
    return false
  }
  const {
    accessKey, amount, extraData, message, orderId, orderInfo,
    orderType, partnerCode, payType, requestId, responseTime,
    resultCode, transId
  } = body
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`
  const expectedSignature = await hmacSha256(MOMO_SECRET_KEY, rawSignature)
  return expectedSignature === body.signature
}

async function verifyVnpaySignature(body: Record<string, unknown>): Promise<boolean> {
  if (!VNPAY_HASH_SECRET) {
    console.error("[payment-callback] VNPAY_HASH_SECRET not configured")
    return false
  }
  const receivedHash = body.vnp_SecureHash as string
  if (!receivedHash) return false

  // Build sorted query string excluding vnp_SecureHash and vnp_SecureHashType
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    if (key !== "vnp_SecureHash" && key !== "vnp_SecureHashType" && value != null) {
      params[key] = String(value)
    }
  }
  const sortedKeys = Object.keys(params).sort()
  const queryString = sortedKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join("&")
  const expectedHash = await hmacSha512(VNPAY_HASH_SECRET, queryString)
  return expectedHash === receivedHash
}

async function verifyZalopaySignature(body: Record<string, unknown>): Promise<boolean> {
  if (!ZALOPAY_KEY2) {
    console.error("[payment-callback] ZALOPAY_KEY2 not configured")
    return false
  }
  const receivedMac = body.mac as string
  if (!receivedMac) return false
  const dataStr = `${body.app_id}|${body.app_trans_id}|${body.app_user}|${body.amount}|${body.app_time}|${body.embed_data}|${body.item}`
  const expectedMac = await hmacSha256(ZALOPAY_KEY2, dataStr)
  return expectedMac === receivedMac
}

// ===== MAIN HANDLER =====

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const db = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()

    // Log WITHOUT sensitive data (no full body dump)
    console.log("[payment-callback] Received callback from:", req.headers.get("x-forwarded-for") || "unknown")

    let orderId = ""
    let isSuccess = false
    let provider = ""

    // === MOMO IPN ===
    if (body.partnerCode && body.orderId) {
      provider = "momo"

      // SECURITY: Verify HMAC-SHA256 signature
      const isValid = await verifyMomoSignature(body)
      if (!isValid) {
        console.error(`[payment-callback] Momo INVALID SIGNATURE for order: ${body.orderId}`)
        return new Response(null, { status: 403 })
      }

      orderId = body.orderId
      isSuccess = body.resultCode === 0
      console.log(`[payment-callback] Momo VERIFIED | Order: ${orderId} | Result: ${body.resultCode}`)
    }

    // === VNPAY IPN ===
    else if (body.vnp_TxnRef) {
      provider = "vnpay"

      // SECURITY: Verify HMAC-SHA512 signature
      const isValid = await verifyVnpaySignature(body)
      if (!isValid) {
        console.error(`[payment-callback] VNPay INVALID SIGNATURE for order: ${body.vnp_TxnRef}`)
        return new Response(
          JSON.stringify({ RspCode: "97", Message: "Invalid Checksum" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }

      orderId = body.vnp_TxnRef
      isSuccess = body.vnp_ResponseCode === "00"
      console.log(`[payment-callback] VNPay VERIFIED | Order: ${orderId} | Response: ${body.vnp_ResponseCode}`)
    }

    // === ZALOPAY IPN ===
    else if (body.app_trans_id) {
      provider = "zalopay"

      // SECURITY: Verify HMAC-SHA256 MAC
      const isValid = await verifyZalopaySignature(body)
      if (!isValid) {
        console.error(`[payment-callback] ZaloPay INVALID MAC for order: ${body.app_trans_id}`)
        return new Response(
          JSON.stringify({ return_code: -1, return_message: "mac not equal" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }

      orderId = body.app_trans_id
      isSuccess = body.return_code === 1
      console.log(`[payment-callback] ZaloPay VERIFIED | Order: ${orderId} | Return: ${body.return_code}`)
    }

    else {
      console.warn("[payment-callback] Unknown provider format")
      return new Response(
        JSON.stringify({ success: false, error: "Unknown provider" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    // Đã xử lý rồi thì bỏ qua (idempotent)
    if (payment.status === "paid") {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { headers: { "Content-Type": "application/json" } }
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
        { headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ return_code: 1, return_message: "success" }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[payment-callback] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
