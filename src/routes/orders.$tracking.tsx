import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, Circle, FileText, Loader2 } from "lucide-react";
import { CURRENCY } from "@/data/products";
import { findOrder, formatDateTime, getTimeline, isCancelled } from "@/lib/orders";
import { tiktokTrack } from "@/components/TikTokPixel";

export const Route = createFileRoute("/orders/$tracking")({
  head: () => ({
    meta: [
      { title: "تفاصيل الطلب — تين ليوا" },
      { name: "description", content: "تفاصيل الطلب والعناصر وحالة كل خطوة." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { tracking } = useParams({ from: "/orders/$tracking" });
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", tracking],
    queryFn: () => findOrder(tracking),
  });

  const firedRef = useRef(false);
  useEffect(() => {
    if (!order || firedRef.current) return;
    if (order.status === "paid") {
      firedRef.current = true;
      tiktokTrack("CompletePayment", {
        content_id: order.tracking,
        value: order.total,
        currency: "AED",
        contents: order.items.map((i) => ({
          content_id: i.id,
          content_name: i.name,
          quantity: i.qty,
          price: i.price,
        })),
      });
    }
  }, [order]);



  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <h1 className="mt-4 text-xl font-bold">لم نجد هذا الطلب</h1>
        <Link to="/orders" className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          العودة لطلباتي
        </Link>
      </main>
    );
  }

  const cancelled = isCancelled(order.status);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" /> طلباتي
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">تفاصيل الطلب</h1>
      <div className="mt-1 font-bold text-primary">{order.tracking}</div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="mb-3 font-bold">بيانات المستلم</h2>
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">الاسم: </span><span className="font-semibold">{order.name}</span></div>
            <div><span className="text-muted-foreground">الهاتف: </span><span className="font-semibold">{order.phone}</span></div>
            <div><span className="text-muted-foreground">العنوان: </span><span className="font-semibold">{order.address}</span></div>
            <div><span className="text-muted-foreground">الإمارة: </span><span className="font-semibold">{order.emirate}</span></div>
            <div><span className="text-muted-foreground">تاريخ الطلب: </span><span className="font-semibold">{formatDateTime(order.createdAt)}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="mb-3 font-bold">حالة الطلب</h2>
          <ol className="space-y-3">
            {getTimeline(order).map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                {step.reached ? (
                  <CheckCircle2 className={`h-5 w-5 shrink-0 ${cancelled ? "text-destructive" : "text-primary"}`} />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                )}
                <div>
                  <span className={`text-sm ${step.reached ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</span>
                  {step.at && <div className="text-xs text-muted-foreground">{formatDateTime(step.at)}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="mb-3 font-bold">العناصر</h2>
        <div className="space-y-2">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{i.name} × {i.qty}</span>
              <span className="font-semibold">{i.price * i.qty} {CURRENCY}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-border/60 pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>المجموع الفرعي</span>
            <span>{order.subtotal.toFixed(2)} {CURRENCY}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>رسوم التوصيل ({order.emirate})</span>
            <span>{order.deliveryFee.toFixed(2)} {CURRENCY}</span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 text-base font-bold">
            <span>الإجمالي</span>
            <span className="text-primary">{order.total.toFixed(2)} {CURRENCY}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
