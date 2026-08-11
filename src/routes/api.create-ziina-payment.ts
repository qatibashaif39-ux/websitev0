import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

          const { data: rows, error: settingsErr } = await supabaseAdmin
            .from("app_settings")
            .select("key, value")
            .in("key", ["ziina_api_key", "ziina_test_mode", "site_domain"]);

          if (settingsErr) {
            console.error("[ziina] settings read failed", settingsErr);
            return new Response(JSON.stringify({ error: "settings_read_failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const settings = Object.fromEntries((rows ?? []).map((r: any) => [r.key, r.value]));
          const apiKey = (settings.ziina_api_key ?? "").trim();
          const testMode = (settings.ziina_test_mode ?? "true").trim() !== "false";
          const siteDomain = (settings.site_domain ?? "").trim().replace(/\/+$/, "");
          const baseUrl = siteDomain || origin;

          if (!apiKey) {
            return new Response(JSON.stringify({ error: "ZIINA_API_KEY_MISSING" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
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
            return new Response(JSON.stringify({ error: "ziina_error", status: res.status, detail: text }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          const json = await res.json();

          await supabaseAdmin.from("orders").update({ ziina_payment_id: json.id }).eq("id", orderId);

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
