import { Hono } from "hono";
import { cors } from "hono/cors";
import { GoogleGenAI, Type } from "@google/genai";
import { todoApi } from "./todos";
import { authApi } from "./auth";
import { orderApi } from "./orders";

export const api = new Hono().basePath("/api");

// Mount Auth, Orders & Todo APIs
api.route("/auth", authApi);
api.route("/orders", orderApi);
api.route("/todos", todoApi);

// Enable CORS for all API routes
api.use("*", cors());

// Health check endpoint
api.get("/health", (c) => {
  return c.json({
    status: "ok",
    runtime: "cloudflare-workers",
    timestamp: new Date().toISOString(),
    store: "teenliwa",
  });
});

// Ziina payment gateway handler
api.post("/create-ziina-payment", async (c) => {
  try {
    const body = await c.req.json();
    const { orderId, tracking, amount, customerName, origin } = body ?? {};

    if (!orderId || !tracking || !amount || !customerName || !origin) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const env = (c.env as Record<string, string> | undefined) || {};
    const apiKey = (
      env.ZIINA_API_KEY ||
      process.env.ZIINA_API_KEY ||
      env.VITE_ZIINA_API_KEY ||
      process.env.VITE_ZIINA_API_KEY ||
      ""
    ).trim();
    const testMode =
      (env.ZIINA_TEST_MODE || process.env.ZIINA_TEST_MODE || "true").trim() !== "false";
    const siteDomain = (env.SITE_DOMAIN || process.env.SITE_DOMAIN || "")
      .trim()
      .replace(/\/+$/, "");
    const baseUrl = siteDomain || origin;

    if (!apiKey) {
      return c.json({
        id: `ziina_mock_${Date.now()}`,
        redirect_url: null,
        message: "Ziina payment intent created (mock mode)",
      });
    }

    const amountInFils = Math.round(Number(amount) * 100);
    const successUrl = `${baseUrl}/orders/${encodeURIComponent(tracking)}`;
    const cancelUrl = `${baseUrl}/checkout`;

    const res = await fetch("https://api-v2.ziina.com/api/payment_intent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInFils,
        currency_code: "AED",
        message: `Order ${tracking}`,
        success_url: successUrl,
        cancel_url: cancelUrl,
        failure_url: cancelUrl,
        test: testMode,
        transaction_source: "directApi",
        metadata: { order_id: orderId, tracking, customer_name: customerName },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[ziina] create payment failed", res.status, text);
      return c.json({ error: "ziina_error", status: res.status, detail: text }, 502);
    }

    const json = await res.json();
    return c.json({ id: json.id, redirect_url: json.redirect_url });
  } catch (err) {
    console.error("[ziina] unexpected error", err);
    return c.json({ error: "unexpected", message: String(err) }, 500);
  }
});

// Gemini AI Marketing & Ad Generator handler
api.post("/generate-ad", async (c) => {
  try {
    const body = await c.req.json();
    const {
      platform = "meta",
      productName = "تين أحمر وأصفر طازج",
      productPrice = 85,
      productCategory = "فواكه طازجة",
      objective = "conversions",
    } = body ?? {};

    const env = (c.env as Record<string, string> | undefined) || {};
    const geminiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();

    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `أنت خبير تسويق أداء وحملات إعلانية مدفوعة متقدمة لـ Meta Ads (Facebook & Instagram) و TikTok Ads في دولة الإمارات ودول الخليج العربي. 
أنت متخصص في تحويل الزوار إلى مشترين لمنتجات الأطعمة الفاخرة والتين والتمور (تين ليوا).
أولويتك إنتاج إعلانات عالية التحويل باللغة العربية مع التركيز على المزايا (التوصيل في نفس اليوم، الطزاجة من المزرعة للمنزل، جودة التغليف الفاخر، الدفع الآمن).`;

    const prompt = `أنشئ خطة إعلانية كاملة لـ ${platform === "meta" ? "إعلانات فيسبوك وإنستغرام (Meta Ads)" : "إعلانات تيك توك (TikTok Ads)"} للمنتج التالي:
اسم المنتج: ${productName}
التصنيف: ${productCategory}
السعر: ${productPrice} درهم إماراتي
الهدف الإعلاني: ${objective}

المطلوب إرجاع النتائج بتنسيق JSON دقيق يحتوي الأقسام التالية:
1. headline: عنوان جذاب قصير للإعلان (Headline)
2. primaryText: النص الرئيسي للإعلان (Primary Text) مكتوب بأسلوب إقناعي جذاب مع إيموجي مناسبة.
3. description: وصف فرعي مبسط (Description / Subtitle)
4. callToAction: زر اتخاذ الإجراء المقترح (e.g., "اطلب الآن", "تضع السلة", "تسوق الآن")
5. targetAudience: فئات الجمهور المستهدف والتوجيه الجغرافي والاهتمامات في الإمارات.
6. visualHook: فكرة الفيديو أو التصميم الإعلاني المميز (Visual Concept & Hook)
7. hashtags: هاشتاغات مشهورة وعالية الانتشار (Hashtags)
8. budgetAdvice: ميزانية يومية مقترحة وتوصية باستراتيجية المزايدة (Bidding Strategy)`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            primaryText: { type: Type.STRING },
            description: { type: Type.STRING },
            callToAction: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            visualHook: { type: Type.STRING },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            budgetAdvice: { type: Type.STRING },
          },
          required: [
            "headline",
            "primaryText",
            "description",
            "callToAction",
            "targetAudience",
            "visualHook",
            "hashtags",
            "budgetAdvice",
          ],
        },
      },
    });

    const rawText = response.text?.trim() || "{}";
    let adData;
    try {
      adData = JSON.parse(rawText);
    } catch {
      adData = {
        headline: `ذوق طعم الطزاجة الحقيقية مع ${productName}! 🍇✨`,
        primaryText: `قطف يومي طازج من مزارع ليوا الإنسانية مباشرة إلى باب منزلك في جميع إمارات الدولة. اطلب الآن واستمتع بطعم لا يُنسى!`,
        description: `توصيل سريع في نفس اليوم | دفع آمن 100%`,
        callToAction: "اطلب الآن",
        targetAudience:
          "رجال ونساء في الإمارات (25-55 سنة)، المهتمين بالفواكه الطازجة والتغذية الصحية والمنتجات الوطنية.",
        visualHook:
          "مشهد فيديو سريع يظهر فتح صندوق التين الفاخر واستعراض حبات التين الحمراء العصيرية.",
        hashtags: ["#تين_ليوا", "#فواكه_الإمارات", "#توصيل_سريع", "#MetaAds"],
        budgetAdvice:
          "ميزانية مبدئية: 50-100 درهم يومياً مع اختبار جمهور الإمارات واستراتيجية Highest Volume.",
      };
    }

    return c.json({ success: true, ad: adData });
  } catch (err) {
    console.error("[AI Ad Generator] Error:", err);
    return c.json(
      {
        success: false,
        error: "failed_to_generate_ad",
        details: String(err),
      },
      500,
    );
  }
});

export default api;
