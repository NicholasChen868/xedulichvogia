// create-payment: Tạo link thanh toán đặt cọc 10%
// POST /create-payment { booking_id, provider, return_url? }
// Hỗ trợ: momo, vnpay, zalopay
//
// SETUP:
// supabase secrets set MOMO_PARTNER_CODE=xxx MOMO_ACCESS_KEY=xxx MOMO_SECRET_KEY=xxx
// supabase secrets set VNPAY_TMN_CODE=xxx VNPAY_HASH_SECRET=xxx
// supabase secrets set ZALOPAY_APP_ID=xxx ZALOPAY_KEY1=xxx ZALOPAY_KEY2=xxx

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Momo config
const MOMO_PARTNER_CODE = Deno.env.get("MOMO_PARTNER_CODE") || ""
const MOMO_ACCESS_KEY = Deno.env.get("MOMO_ACCESS_KEY") || ""
const MOMO_SECRET_KEY = Deno.env.get("MOMO_SECRET_KEY") || ""
// Payment URLs: production by default, override with env vars for testing
const MOMO_ENDPOINT = Deno.env.get("MOMO_ENDPOINT") || "https://payment.momo.vn/v2/gateway/api/create"

// VNPay config
const VNPAY_TMN_CODE = Deno.env.get("VNPAY_TMN_CODE") || ""
const VNPAY_HASH_SECRET = Deno.env.get("VNPAY_HASH_SECRET") || ""
const VNPAY_URL = Deno.env.get("VNPAY_URL") || "https://pay.vnpay.vn/vpcpay.html"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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

// === MOMO ===
async function createMomoPayment(
  orderId: string, amount: number, orderInfo: string, returnUrl: string, notifyUrl: string
) {
  if (!MOMO_PARTNER_CODE) {
    return { success: false, error: "Momo chưa được cấu hình" }
  }

  const requestId = orderId
  const extraData = ""
  const requestType = "payWithMethod"

  const rawSignature = `accessKey=${MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_PARTNER_CODE}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`
  const signature = await hmacSha256(MOMO_SECRET_KEY, rawSignature)

  const body = {
    partnerCode: MOMO_PARTNER_CODE,
    partnerName: "TravelCar",
    storeId: "TravelCarStore",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: returnUrl,
    ipnUrl: notifyUrl,
    lang: "vi",
    requestType,
    extraData,
    signature,
  }

  const response = await fetch(MOMO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const result = await response.json()

  if (result.resultCode === 0) {
    return { success: true, pay_url: result.payUrl, provider_order_id: orderId }
  }
  return { success: false, error: result.message || "Momo error" }
}

// === VNPAY ===
async function createVnpayPayment(
  orderId: string, amount: number, orderInfo: string, returnUrl: string, ipAddr: string
) {
  if (!VNPAY_TMN_CODE) {
    return { success: false, error: "VNPay chưa được cấu hình" }
  }

  const date = new Date()
  const createDate = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)

  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Amount: (amount * 100).toString(), // VNPay tính theo đồng * 100
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: createDate,
  }

  // Sort params và tạo query string
  const sortedKeys = Object.keys(params).sort()
  const queryString = sortedKeys.map(k => `${k}=${encodeURIComponent(params[k])}`).join("&")

  const secureHash = await hmacSha512(VNPAY_HASH_SECRET, queryString)
  const payUrl = `${VNPAY_URL}?${queryString}&vnp_SecureHash=${secureHash}`

  return { success: true, pay_url: payUrl, provider_order_id: orderId }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { booking_id, provider = "momo", return_url } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ success: false, error: "booking_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const db = createClient(supabaseUrl, serviceRoleKey)

    // Lấy thông tin booking
    const { data: booking, error: bookingErr } = await db
      .from("bookings")
      .select("id, estimated_fare, customer_phone, pickup_location, dropoff_location")
      .eq("id", booking_id)
      .single()

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking không tồn tại" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Tính đặt cọc 10%
    const totalFare = booking.estimated_fare || 0
    const depositAmount = Math.round(totalFare * 0.10)

    if (depositAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Giá chuyến đi chưa được tính" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const orderId = `TC${Date.now()}_${booking_id.slice(0, 8)}`
    const orderInfo = `Dat coc TravelCar: ${booking.pickup_location} -> ${booking.dropoff_location}`
    const defaultReturnUrl = return_url || "https://travelcar.vn/payment-result.html"
    const notifyUrl = `${supabaseUrl}/functions/v1/payment-callback`

    let paymentResult

    switch (provider) {
      case "momo":
        paymentResult = await createMomoPayment(orderId, depositAmount, orderInfo, defaultReturnUrl, notifyUrl)
        break
      case "vnpay":
        paymentResult = await createVnpayPayment(orderId, depositAmount, orderInfo, defaultReturnUrl, req.headers.get("x-forwarded-for") || "")
        break
      case "zalopay":
        // ZaloPay tương tự, thêm sau khi có credentials
        paymentResult = { success: false, error: "ZaloPay đang được tích hợp" }
        break
      default:
        paymentResult = { success: false, error: `Provider '${provider}' không hỗ trợ` }
    }

    if (!paymentResult.success) {
      return new Response(
        JSON.stringify(paymentResult),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Lưu payment record
    await db.from("payments").insert({
      booking_id: booking.id,
      amount: totalFare,
      deposit_amount: depositAmount,
      provider,
      provider_order_id: paymentResult.provider_order_id,
      status: "pending",
      pay_url: paymentResult.pay_url,
      customer_phone: booking.customer_phone,
    })

    // Update booking deposit status
    await db
      .from("bookings")
      .update({ deposit_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", booking_id)

    console.log(`[create-payment] ${provider} | Booking: ${booking_id.slice(0, 8)}... | Deposit: ${depositAmount}đ`)

    return new Response(
      JSON.stringify({
        success: true,
        pay_url: paymentResult.pay_url,
        deposit_amount: depositAmount,
        total_fare: totalFare,
        provider,
        order_id: orderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[create-payment] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Lỗi hệ thống thanh toán. Vui lòng thử lại." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
