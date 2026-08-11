import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/create-ziina-payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { orderId, tracking, amount, customerName, origin } = body ?? {};

          if (!orderId || !tracking || !amount || !customerName || !origin) {
            return new Response(JSON.stringify({ error: "Missing fields" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const apiKey = (process.env.ZIINA_API_KEY || process.env.VITE_ZIINA_API_KEY || "").trim();
          const testMode = (process.env.ZIINA_TEST_MODE || "true").trim() !== "false";
          const siteDomain = (process.env.SITE_DOMAIN || "").trim().replace(/\/+$/, "");
          const baseUrl = siteDomain || origin;

          if (!apiKey) {
            // Ziina API key is optional/not configured yet, return fallback success response
            return new Response(
              JSON.stringify({
                id: `ziina_mock_${Date.now()}`,
                redirect_url: null,
                message: "Ziina payment intent created (mock mode)",
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
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
            return new Response(JSON.stringify({ error: "ziina_error", status: res.status, detail: text }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          const json = await res.json();

          return new Response(JSON.stringify({ id: json.id, redirect_url: json.redirect_url }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[ziina] unexpected error", err);
          return new Response(JSON.stringify({ error: "unexpected", message: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
