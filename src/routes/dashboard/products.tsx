import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { CURRENCY, resolveProductImage } from "@/data/products";
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  type ProductRow,
  type ProductInput,
} from "@/lib/catalog";

export const Route = createFileRoute("/dashboard/products")({
  component: DashboardProducts,
});

const empty: ProductInput = {
  name: "",
  description: "",
  price: 0,
  image_url: null,
  available: true,
  category_id: null,
  sort_order: 0,
  minimum_order_quantity: 1,
  maximum_order_quantity: null,
};

function DashboardProducts() {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const [cat, setCat] = useState<string>("all");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["products"] });

  const removeMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("تم حذف المنتج");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر الحذف"),
  });

  const list = useMemo(
    () => (cat === "all" ? products : products.filter((p) => p.category_id === cat)),
    [cat, products],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">المنتجات</h1>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> منتج جديد
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">أضف المنتجات وعدّلها واحذفها.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setCat("all")} className={chip(cat === "all")}>
          الكل
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-8 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {list.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3"
            >
              <img
                src={resolveProductImage({
                  image_url: p.image_url,
                  seed_key: p.seed_key,
                })}
                alt={p.name}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {p.category || "بدون صنف"}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-primary">
                    {p.price} {CURRENCY}
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    أقل طلب: {p.minimum_order_quantity ?? 1}
                  </span>
                  {p.maximum_order_quantity && (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      أقصى طلب: {p.maximum_order_quantity}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    p.available
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {p.available ? "متوفر" : "غير متوفر"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(p)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`حذف المنتج "${p.name}"؟`)) removeMut.mutate(p.id);
                    }}
                    className="rounded-lg border border-destructive/40 p-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function chip(active: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
    active
      ? "bg-primary text-primary-foreground"
      : "bg-secondary text-muted-foreground hover:text-foreground"
  }`;
}

function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: ProductRow | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductInput>(
    product
      ? {
          name: product.name,
          description: product.description,
          price: product.price,
          image_url: product.image_url,
          available: product.available,
          category_id: product.category_id,
          sort_order: product.sort_order,
          minimum_order_quantity: product.minimum_order_quantity ?? 1,
        }
      : empty,
  );

  const mut = useMutation({
    mutationFn: async () => {
      if (product) await updateProduct(product.id, form);
      else await createProduct(form);
    },
    onSuccess: () => {
      toast.success(product ? "تم تحديث المنتج" : "تمت إضافة المنتج");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر الحفظ"),
  });

  const [uploading, setUploading] = useState(false);
  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("تم رفع الصورة");
    } catch (err: any) {
      toast.error(err?.message ?? "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const field =
    "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border/60 bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{product ? "تعديل منتج" : "منتج جديد"}</h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="mt-4 space-y-3"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">اسم المنتج *</label>
            <input
              className={field}
              placeholder="مثال: تين أحمر ملكي (صندوق 1 كجم)"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">وصف المنتج</label>
            <textarea
              className={field}
              placeholder="وصف تفصيلي عن جودة المنتج ومصدره وفوائده..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">السعر ({CURRENCY}) *</label>
              <input
                className={field}
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                required
                value={form.price || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">أقل كمية طلب (Min)</label>
              <input
                className={field}
                type="number"
                min={1}
                step={1}
                placeholder="1"
                value={form.minimum_order_quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minimum_order_quantity: Math.max(1, Number(e.target.value)),
                  })
                }
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-foreground">أقصى كمية طلب (Max)</label>
              <input
                className={field}
                type="number"
                min={form.minimum_order_quantity || 1}
                step={1}
                placeholder="غير محدد (اختياري)"
                value={form.maximum_order_quantity ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maximum_order_quantity: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">التصنيف</label>
              <select
                className={field}
                value={form.category_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category_id: e.target.value || null,
                  })
                }
              >
                <option value="">بدون صنف</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">ترتيب العرض</label>
              <input
                className={field}
                type="number"
                placeholder="1, 2, 3..."
                value={form.sort_order}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sort_order: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            {form.image_url && (
              <img
                src={form.image_url}
                alt="معاينة"
                className="h-28 w-full rounded-xl border border-border object-cover"
              />
            )}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary py-2.5 text-sm font-semibold hover:border-primary">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {uploading ? "جارٍ الرفع…" : form.image_url ? "تغيير الصورة" : "رفع صورة المنتج"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickImage}
                disabled={uploading}
              />
            </label>
            <input
              className={field}
              placeholder="أو ألصق رابط صورة"
              value={form.image_url ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  image_url: e.target.value || null,
                })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) =>
                setForm({
                  ...form,
                  available: e.target.checked,
                })
              }
            />
            متوفر للبيع
          </label>
          <button
            type="submit"
            disabled={mut.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ
          </button>
        </form>
      </div>
    </div>
  );
}
