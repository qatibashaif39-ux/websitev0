import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { CURRENCY, type Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

export function ProductCard({ product }: { product: Product }) {
    const { add } = useCart();
    const { t } = useLanguage();
    const minQty = product.minimum_order_quantity ?? 1;
    const [qty, setQty] = useState(minQty);

    return (
        <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-black/30">
            <div className="relative aspect-square overflow-hidden">
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    width={800}
                    height={800}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {!product.available && (
                    <span className="absolute right-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-bold text-muted-foreground">
                        {t("product.upcoming")}
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-4">
                <h3 className="text-base font-bold text-foreground">
                    {product.name}
                </h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {product.description}
                </p>

                <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-primary">
                        {product.price}{" "}
                        <span className="text-sm">{CURRENCY}</span>
                    </span>
                    <div className="flex items-center gap-2 rounded-full bg-secondary p-1">
                        <button
                            onClick={() => setQty(q => q + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                            aria-label="زيادة"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">
                            {qty}
                        </span>
                        <button
                            onClick={() => setQty(q => Math.max(minQty, q - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                            aria-label="إنقاص"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <button
                    disabled={!product.available}
                    onClick={() => add(product, qty)}
                    className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
                >
                    {product.available
                        ? t("product.add")
                        : t("product.upcoming")}
                </button>
            </div>
        </article>
    );
}
