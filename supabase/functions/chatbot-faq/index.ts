// chatbot-faq: Trả lời câu hỏi thường gặp tự động
// POST /chatbot-faq { question }
// Dùng keyword matching + knowledge base. Có thể nâng cấp thêm AI sau.

import "@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://travelcar.vn",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface FaqEntry {
  keywords: string[]
  question: string
  answer: string
  category: string
}

const FAQ_DATABASE: FaqEntry[] = [
  // === GIÁ CẢ ===
  {
    keywords: ["giá", "bao nhiêu", "phí", "cước", "tính tiền", "chi phí"],
    question: "Giá cước tính như thế nào?",
    answer: "Giá cước TravelCar tính theo km:\n" +
      "- 1-70km: 15.000đ/km\n" +
      "- 71-150km: 10.000đ/km\n" +
      "- 151-250km: 9.000đ/km\n" +
      "- Trên 250km: 8.000đ/km\n\n" +
      "Giá đã bao gồm xăng dầu, cầu đường. Có phụ thu cao điểm và giảm giá chiều về.",
    category: "pricing",
  },
  {
    keywords: ["đặt cọc", "cọc", "trả trước", "thanh toán trước"],
    question: "Cần đặt cọc bao nhiêu?",
    answer: "Quý khách đặt cọc 10% giá trị chuyến đi khi xác nhận booking. " +
      "Hỗ trợ thanh toán qua Momo, VNPay, ZaloPay. " +
      "Số tiền cọc sẽ được trừ vào tổng phí khi hoàn thành chuyến đi.",
    category: "payment",
  },
  {
    keywords: ["thanh toán", "trả tiền", "momo", "vnpay", "zalopay", "chuyển khoản"],
    question: "Thanh toán bằng cách nào?",
    answer: "TravelCar hỗ trợ:\n" +
      "- Đặt cọc online: Momo, VNPay, ZaloPay\n" +
      "- Thanh toán còn lại: Tiền mặt hoặc chuyển khoản cho tài xế khi kết thúc chuyến.\n" +
      "Hóa đơn điện tử được gửi qua SMS/email.",
    category: "payment",
  },

  // === ĐẶT XE ===
  {
    keywords: ["đặt xe", "book", "đặt chuyến", "cách đặt", "làm sao đặt"],
    question: "Cách đặt xe như thế nào?",
    answer: "Rất đơn giản:\n" +
      "1. Nhập điểm đón, điểm trả, ngày đi\n" +
      "2. Chọn loại xe phù hợp\n" +
      "3. Xem giá ước tính\n" +
      "4. Nhập SĐT và gửi đơn\n" +
      "5. Hệ thống tự động ghép tài xế phù hợp nhất\n" +
      "6. Nhận thông tin tài xế qua SMS",
    category: "booking",
  },
  {
    keywords: ["hủy", "cancel", "hủy đơn", "hủy chuyến", "không đi nữa"],
    question: "Hủy chuyến có mất phí không?",
    answer: "Chính sách hủy:\n" +
      "- Hủy trước 24h: Miễn phí, hoàn cọc 100%\n" +
      "- Hủy trước 12h: Hoàn cọc 50%\n" +
      "- Hủy dưới 12h: Không hoàn cọc\n" +
      "Liên hệ hotline 0xxx để hủy nhanh.",
    category: "booking",
  },
  {
    keywords: ["tra cứu", "kiểm tra", "xem đơn", "tình trạng đơn", "trạng thái"],
    question: "Làm sao tra cứu đơn đặt xe?",
    answer: "Tại trang chủ travelcar.vn, kéo xuống phần 'Tra Cứu Đơn Hàng', " +
      "nhập số điện thoại đã dùng khi đặt xe để xem tất cả đơn và trạng thái hiện tại.",
    category: "booking",
  },

  // === TÀI XẾ ===
  {
    keywords: ["tài xế", "lái xe", "đăng ký lái", "thành tài xế", "đối tác"],
    question: "Làm sao đăng ký làm tài xế?",
    answer: "Truy cập travelcar.vn/driver-register.html:\n" +
      "1. Điền thông tin cá nhân + xe\n" +
      "2. Upload giấy tờ xe + GPLX\n" +
      "3. Chờ admin duyệt (trong 24h)\n" +
      "4. Được duyệt → đăng nhập Driver Dashboard\n\n" +
      "Yêu cầu: GPLX hạng B2+, xe đời 2015 trở lên.",
    category: "driver",
  },
  {
    keywords: ["hoa hồng", "chiết khấu", "phần trăm", "thu nhập", "lương"],
    question: "Hoa hồng tài xế tính thế nào?",
    answer: "Tài xế nhận 90% giá cước, TravelCar giữ 10% hoa hồng.\n" +
      "Ví dụ: Chuyến 1.000.000đ → Tài xế nhận 900.000đ.\n" +
      "Thanh toán hoa hồng được tự động trừ, tài xế nhận phần còn lại trực tiếp từ khách.",
    category: "driver",
  },

  // === LOẠI XE ===
  {
    keywords: ["loại xe", "xe gì", "sedan", "suv", "7 chỗ", "4 chỗ", "16 chỗ"],
    question: "TravelCar có những loại xe nào?",
    answer: "Các loại xe hiện có:\n" +
      "- Sedan 4 chỗ (hệ số x1.0)\n" +
      "- SUV 7 chỗ (hệ số x1.3)\n" +
      "- Van 16 chỗ (hệ số x1.8)\n" +
      "- Limousine 9 chỗ (hệ số x2.2)\n" +
      "- Bus 29 chỗ (hệ số x2.5)\n" +
      "- Bus 45 chỗ (hệ số x3.0)\n" +
      "- Xe sang (hệ số x3.5)",
    category: "vehicle",
  },

  // === DOANH NGHIỆP ===
  {
    keywords: ["doanh nghiệp", "công ty", "b2b", "hợp đồng", "dài hạn", "cho thuê"],
    question: "TravelCar có dịch vụ cho doanh nghiệp không?",
    answer: "Có! TravelCar cung cấp:\n" +
      "- Cho thuê xe doanh nghiệp dài hạn (1-3 năm)\n" +
      "- Xe đưa đón nhân viên\n" +
      "- Xe phục vụ sự kiện, hội nghị\n" +
      "- Giá ưu đãi hợp đồng B2B\n\n" +
      "Liên hệ hotline hoặc email b2b@travelcar.vn để được tư vấn.",
    category: "b2b",
  },

  // === AN TOÀN ===
  {
    keywords: ["an toàn", "bảo hiểm", "tin cậy", "uy tín"],
    question: "TravelCar có an toàn không?",
    answer: "TravelCar cam kết:\n" +
      "- Tài xế được xác minh danh tính + giấy tờ xe\n" +
      "- Rating minh bạch từ khách hàng\n" +
      "- Bảo hiểm hành khách theo quy định\n" +
      "- Theo dõi chuyến đi realtime\n" +
      "- Hotline hỗ trợ 24/7",
    category: "safety",
  },

  // === LIÊN HỆ ===
  {
    keywords: ["liên hệ", "hotline", "số điện thoại", "hỗ trợ", "email", "gọi"],
    question: "Liên hệ TravelCar ở đâu?",
    answer: "Liên hệ TravelCar:\n" +
      "- Hotline: 0xxx xxx xxx (24/7)\n" +
      "- Email: support@travelcar.vn\n" +
      "- Facebook: fb.com/travelcar.vn\n" +
      "- Website: travelcar.vn",
    category: "contact",
  },
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findBestMatch(question: string): { entry: FaqEntry; score: number } | null {
  const normalized = normalize(question)
  const words = normalized.split(" ")

  let bestMatch: FaqEntry | null = null
  let bestScore = 0

  for (const entry of FAQ_DATABASE) {
    let score = 0
    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalize(keyword)
      if (normalized.includes(normalizedKeyword)) {
        score += 2 // Exact match trong câu
      } else {
        // Partial word match
        for (const word of words) {
          if (normalizedKeyword.includes(word) || word.includes(normalizedKeyword)) {
            score += 1
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = entry
    }
  }

  if (bestMatch && bestScore >= 2) {
    return { entry: bestMatch, score: bestScore }
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { question } = await req.json()

    if (!question || question.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Vui lòng nhập câu hỏi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const match = findBestMatch(question)

    if (match) {
      console.log(`[chatbot-faq] Q: "${question}" -> Match: "${match.entry.question}" (score: ${match.score})`)

      return new Response(
        JSON.stringify({
          success: true,
          matched_question: match.entry.question,
          answer: match.entry.answer,
          category: match.entry.category,
          confidence: Math.min(match.score / 6, 1), // 0-1
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Không tìm thấy câu trả lời phù hợp
    console.log(`[chatbot-faq] Q: "${question}" -> No match`)

    return new Response(
      JSON.stringify({
        success: true,
        matched_question: null,
        answer: "Xin lỗi, tôi chưa có câu trả lời cho câu hỏi này.\n\n" +
          "Bạn có thể:\n" +
          "- Gọi hotline: 0xxx xxx xxx\n" +
          "- Email: support@travelcar.vn\n" +
          "- Hoặc thử hỏi lại với từ khóa khác.",
        category: "unknown",
        confidence: 0,
        suggestions: [
          "Giá cước tính thế nào?",
          "Cách đặt xe?",
          "Đăng ký làm tài xế?",
          "Hủy chuyến có mất phí không?",
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[chatbot-faq] Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: "Lỗi hệ thống chatbot. Vui lòng thử lại." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
