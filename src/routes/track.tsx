import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, FileText, Package, Search } from "lucide-react";
import { CURRENCY } from "@/data/products";
import { findOrder, formatDateTime, getTimeline, isCancelled } from "@/lib/orders";

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تتبع الطلب — تين ليوا" },
      { name: "description", content: "تابع حالة طلبك من تين ليوا عبر رقم التتبع." },
    ],
  }),
  component: Track,
});

function Track() {
  const { code } = useSearch({ from: "/track" });
  const [query, setQuery] = useState(code ?? "");
  const [active, setActive] = useState(code ?? "");

  useEffect(() => {
    if (code) setActive(code);
  }, [code]);

  const { data: order, isFetching } = useQuery({
    queryKey: ["order", active],
    queryFn: () => findOrder(active),
    enabled: !!active,
  });

  const searched = !!active && !isFetching;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        <Package className="h-6 w-6 text-primary" /> تتبع الطلب
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">أدخل رقم التتبع الذي ظهر لك بعد إتمام الطلب.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setActive(query.trim());
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثال: TL-1234ABCDEF"
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          <Search className="h-4 w-4" /> تتبع
        </button>
      </form>

      {searched && !order && (
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          لم نجد طلباً بهذا الرقم. تأكد من رقم التتبع وحاول مجدداً.
        </div>
      )}

      {order && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">رقم التتبع</span>
              <span className="font-bold text-primary">{order.tracking}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">المستلم</span>
              <span className="font-semibold">{order.name}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="mb-4 font-bold">حالة الطلب</h2>
            <ol className="space-y-4">
              {getTimeline(order).map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  {step.reached ? (
                    <CheckCircle2 className={`h-6 w-6 shrink-0 ${isCancelled(order.status) ? "text-destructive" : "text-primary"}`} />
                  ) : (
                    <Circle className="h-6 w-6 shrink-0 text-muted-foreground/40" />
                  )}
                  <div>
                    <span className={step.reached ? "font-semibold" : "text-muted-foreground"}>{step.label}</span>
                    {step.at && <div className="text-xs text-muted-foreground">{formatDateTime(step.at)}</div>}
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/orders/$tracking"
              params={{ tracking: order.tracking }}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:bg-secondary"
            >
              <FileText className="h-4 w-4" /> تفاصيل الطلب
            </Link>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="mb-3 font-bold">ملخص الطلب</h2>
            <div className="space-y-2">
              {order.items.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{i.name} × {i.qty}</span>
                  <span className="font-semibold">{i.price * i.qty} {CURRENCY}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-border/60 pt-3 font-bold">
              <span>الإجمالي</span>
              <span className="text-primary">{order.total.toFixed(2)} {CURRENCY}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          العودة للمتجر
        </Link>
      </div>
    </main>
  );
}
