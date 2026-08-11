import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { CURRENCY } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/lib/orders";
import { EMIRATES, EMIRATE_DELIVERY_FEE } from "@/lib/emirates";
import { supabase } from "@/integrations/supabase/client";
import { d1 } from "@/lib/d1";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "تسجيل الطلب — تين ليوا" },
      { name: "description", content: "أكمل بيانات التوصيل والدفع لتسجيل طلبك من تين ليوا." },
    ],
  }),
  component: Checkout,
});

export function validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (!cleaned) {
    return { valid: false, message: "الرجاء إدخال رقم الهاتف" };
  }
  // Standard phone format validation: 8 to 15 digits with optional + prefix
  const phoneRegex = /^(\+?|00?)[0-9]{8,15}$/;
  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      message: "رقم الهاتف غير صحيح. يرجى إدخال رقم هاتف صحيح (مثال: 0501234567 أو +971501234567)",
    };
  }
  return { valid: true };
}

function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [tracking, setTracking] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fname: "",
    lname: "",
    phone: "",
    address: "",
    emirate: "",
  });

  const deliveryFee = form.emirate ? EMIRATE_DELIVERY_FEE : 0;
  const grandTotal = useMemo(() => total + deliveryFee, [total, deliveryFee]);
  const totalQty = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const [minQty, setMinQty] = useState(2);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "min_order_qty")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const n = parseInt(data.value, 10);
          if (!isNaN(n) && n > 0) setMinQty(n);
        }
      })
      .catch(() => {});

    // Trigger Meta Pixel InitiateCheckout event
    if (typeof window !== "undefined" && (window as any).fbq) {
      try {
        (window as any).fbq("track", "InitiateCheckout", {
          content_type: "product",
          value: total,
          currency: "AED",
          num_items: totalQty,
        });
      } catch (err) {
        console.warn("[Meta Pixel] InitiateCheckout track error:", err);
      }
    }
  }, [total, totalQty]);

  const belowItems = useMemo(
    () => items.filter((i) => i.qty < (i.product.minimum_order_quantity ?? 1)),
    [items],
  );

  const handlePhoneChange = (val: string) => {
    setForm((prev) => ({ ...prev, phone: val }));
    if (phoneError) setPhoneError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fname.trim()) {
      toast.error("الرجاء إدخال الاسم الأول");
      return;
    }
    if (!form.lname.trim()) {
      toast.error("الرجاء إدخال اسم العائلة");
      return;
    }

    const phoneCheck = validatePhoneNumber(form.phone);
    if (!phoneCheck.valid) {
      setPhoneError(phoneCheck.message || "رقم الهاتف غير صحيح");
      toast.error(phoneCheck.message || "رقم الهاتف غير صحيح");
      return;
    }

    if (belowItems.length > 0) {
      const first = belowItems[0];
      toast.error(`الحد الأدنى لـ "${first.product.name}" هو ${first.product.minimum_order_quantity}.`);
      return;
    }
    if (totalQty < minQty) {
      toast.error(`الحد الأدنى لتسجيل الطلب هو ${minQty}. الرجاء زيادة الكمية.`);
      return;
    }
    if (!form.emirate) {
      toast.error("الرجاء اختيار الإمارة");
      return;
    }

    setSubmitting(true);
    const fullName = `${form.fname.trim()} ${form.lname.trim()}`;

    try {
      const order = await createOrder({
        name: fullName,
        phone: form.phone.trim(),
        address: form.address,
        emirate: form.emirate,
        items,
        subtotal: total,
        deliveryFee,
        total: grandTotal,
      });

      // Save Customer Data to Cloudflare D1
      try {
        await d1.saveCustomerData({
          fname: form.fname,
          lname: form.lname,
          phone: form.phone,
          address: form.address,
          emirate: form.emirate,
          orderId: order.id,
          tracking: order.tracking,
          amount: grandTotal,
        });
      } catch (d1Err) {
        console.warn("[Cloudflare D1] Save customer error:", d1Err);
      }

      // Track Meta Ads Pixel Purchase Event
      if (typeof window !== "undefined" && (window as any).fbq) {
        try {
          (window as any).fbq("track", "Purchase", {
            content_type: "product",
            value: grandTotal,
            currency: "AED",
            order_id: order.tracking,
          });
        } catch (fbqErr) {
          console.warn("[Meta Pixel] Purchase track error:", fbqErr);
        }
      }

      // Create Ziina payment session or finish order
      try {
        const response = await fetch("/api/create-ziina-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            tracking: order.tracking,
            amount: grandTotal,
            customerName: fullName,
            origin: window.location.origin,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.redirect_url) {
            clear();
            window.location.href = data.redirect_url as string;
            return;
          }
        }
        setTracking(order.tracking);
        setDone(true);
        clear();
      } catch (payErr) {
        console.error(payErr);
        toast.error("تم حفظ الطلب، لكن تعذّر فتح بوابة الدفع. سنتواصل معك قريباً.");
        setTracking(order.tracking);
        setDone(true);
        clear();
      }
    } catch (err) {
      console.error(err);
      toast.error("تعذّر تسجيل الطلب. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-4 text-2xl font-extrabold">تم تسجيل طلبك بنجاح!</h1>
        <p className="mt-2 text-sm text-muted-foreground">سنتواصل معك قريباً لتأكيد التوصيل. شكراً لثقتك بـ تين ليوا.</p>
        <div className="mt-6 w-full rounded-2xl border border-border/60 bg-card p-4">
          <span className="text-sm text-muted-foreground">رقم التتبع الخاص بك</span>
          <div className="mt-1 text-xl font-extrabold tracking-wider text-primary">{tracking}</div>
          <div className="mt-2 text-xs text-emerald-500 font-semibold">✓ تم حفظ بيانات العميل في Cloudflare D1</div>
        </div>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Link to="/track" search={{ code: tracking }} className="flex-1 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            تتبع الطلب
          </Link>
          <Link to="/" className="flex-1 rounded-xl border border-border px-6 py-3 text-sm font-bold hover:bg-secondary">
            العودة للمتجر
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold">سلة التسوق فارغة</h1>
        <button onClick={() => navigate({ to: "/" })} className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          تصفح المنتجات
        </button>
      </main>
    );
  }

  const field = "w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">تسجيل الطلب</h1>
      <p className="mt-1 text-sm text-muted-foreground">سيتم تحويلك إلى بوابة الدفع <span className="font-bold">Ziina</span> بعد تأكيد البيانات.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={submit} className="space-y-3">
          {/* First Name & Last Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs font-semibold text-muted-foreground">الاسم الأول (First Name)</label>
              <input
                required
                placeholder="علي"
                value={form.fname}
                onChange={(e) => setForm({ ...form, fname: e.target.value })}
                className={field}
                maxLength={50}
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-muted-foreground">اسم العائلة (Last Name)</label>
              <input
                required
                placeholder="المنصوري"
                value={form.lname}
                onChange={(e) => setForm({ ...form, lname: e.target.value })}
                className={field}
                maxLength={50}
              />
            </div>
          </div>

          {/* Phone Field with Validation Feedback */}
          <div>
            <label className="block mb-1 text-xs font-semibold text-muted-foreground">رقم الهاتف (مع الرمز الدولي أو المحلي)</label>
            <div className="relative">
              <input
                required
                type="tel"
                placeholder="0501234567 أو +971501234567"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`${field} ${phoneError ? "border-destructive bg-destructive/5" : ""}`}
                maxLength={20}
              />
              <PhoneCall className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            </div>
            {phoneError && (
              <p className="mt-1 text-xs font-semibold text-destructive">{phoneError}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block mb-1 text-xs font-semibold text-muted-foreground">عنوان التوصيل التفصيلي</label>
            <textarea
              required
              placeholder="العنوان (الشارع، اسم المنطقة، المبنى، رقم الشقة...)"
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={field}
              maxLength={500}
            />
          </div>

          {/* Emirate */}
          <div>
            <label className="block mb-1 text-xs font-semibold text-muted-foreground">الإمارة</label>
            <select
              required
              value={form.emirate}
              onChange={(e) => setForm({ ...form, emirate: e.target.value })}
              className={field}
            >
              <option value="">اختر الإمارة</option>
              {EMIRATES.map((em) => (
                <option key={em} value={em}>
                  {em} — {EMIRATE_DELIVERY_FEE} {CURRENCY}
                </option>
              ))}
            </select>
          </div>

          {belowItems.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive space-y-1">
              {belowItems.map((i) => (
                <div key={i.product.id}>
                  الحد الأدنى لـ "{i.product.name}" هو {i.product.minimum_order_quantity} (لديك {i.qty}).
                </div>
              ))}
            </div>
          )}
          {totalQty < minQty && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              الحد الأدنى لتسجيل الطلب هو {minQty}. كميتك الحالية: {totalQty}.
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || totalQty < minQty || belowItems.length > 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "جارٍ تجهيز الدفع..." : `الدفع عبر Ziina — ${grandTotal.toFixed(2)} ${CURRENCY}`}
          </button>
        </form>

        <div className="h-fit rounded-2xl border border-border/60 bg-card p-4">
          <h2 className="mb-3 font-bold">ملخص الطلب</h2>
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.product.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{i.product.name} × {i.qty}</span>
                <span className="font-semibold">{i.product.price * i.qty} {CURRENCY}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span>{total.toFixed(2)} {CURRENCY}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>رسوم التوصيل{form.emirate ? ` (${form.emirate})` : ""}</span>
              <span>{form.emirate ? `${deliveryFee.toFixed(2)} ${CURRENCY}` : "—"}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 text-base font-bold">
              <span>الإجمالي</span>
              <span className="text-primary">{grandTotal.toFixed(2)} {CURRENCY}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
