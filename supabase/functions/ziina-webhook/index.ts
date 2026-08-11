// Supabase Edge Function: ziina-webhook
// Receives Ziina payment status updates, updates the corresponding order,
// and (when paid) fires a server-side TikTok Events API Purchase event.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

async function sendTikTokPurchase(opts: {
  pixelId: string;
  accessToken: string;
  order: any;
}) {
  const { pixelId, accessToken, order } = opts;
  const body = {
    event_source: "web",
    event_source_id: pixelId,
    data: [
      {
        event: "CompletePayment",
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.tracking,
        user: { phone: order.phone ? [order.phone] : undefined },
        properties: {
          currency: "AED",
          value: Number(order.total ?? 0),
          contents: Array.isArray(order.items)
            ? order.items.map((i: any) => ({
                content_id: i.id,
                content_name: i.name,
                quantity: i.qty,
                price: i.price,
              }))
            : [],
        },
      },
    ],
  };

  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[tiktok] events api failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("[tiktok] events api error", err);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const data = payload?.data ?? payload;
  const paymentId: string | undefined = data?.id;
  const status: string | undefined = data?.status;
  const tracking: string | undefined = data?.metadata?.tracking;

  if (!paymentId) {
    return new Response("missing payment id", { status: 400 });
  }

  let update: { status?: string; paid_at?: string | null } | null = null;
  let paid = false;
  if (status === "completed" || status === "paid" || status === "successful") {
    update = { status: "paid", paid_at: new Date().toISOString() };
    paid = true;
  } else if (
    status === "failed" || status === "cancelled" ||
    status === "canceled" || status === "expired"
  ) {
    update = { status: "cancelled" };
  }

  if (!update) return new Response("ok", { status: 200 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let { data: updated, error } = await admin
    .from("orders")
    .update(update)
    .eq("ziina_payment_id", paymentId)
    .select()
    .maybeSingle();

  if ((error || !updated) && tracking) {
    const r = await admin.from("orders").update(update).eq("tracking", tracking).select().maybeSingle();
    updated = r.data;
  }

  if (paid && updated) {
    const { data: rows } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", ["tiktok_pixel_id", "tiktok_access_token"]);
    const s = Object.fromEntries((rows ?? []).map((r: any) => [r.key, (r.value ?? "").trim()]));
    if (s.tiktok_pixel_id && s.tiktok_access_token) {
      await sendTikTokPurchase({
        pixelId: s.tiktok_pixel_id,
        accessToken: s.tiktok_access_token,
        order: updated,
      });
    }
  }

  return new Response("ok", { status: 200 });
});
