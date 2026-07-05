import { Link } from "@tanstack/react-router";
import { Star, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/products-service";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/currency";
import { useTranslation } from "@/i18n/useTranslation";

export function ProductCard({ product }: { product: Product }) {
  const { add, open } = useCart();
  const outOfStock = product.stock <= 0;
  const { t } = useTranslation();

  return (
    <Link
      to="/products/$id"
      params={{ id: product.id }}
      className="group relative flex flex-col rounded-3xl bg-card border border-border/70 overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-500 hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
            outOfStock ? "opacity-70 grayscale" : ""
          }`}
        />

        {outOfStock ? (
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-destructive text-destructive-foreground shadow-sm">
            {t("outOfStock")}
          </span>
        ) : (
          product.tag && (
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-accent text-accent-foreground shadow-sm">
              {product.tag}
            </span>
          )
        )}

        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 p-3 bg-gradient-to-t from-background/95 via-background/80 to-transparent">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-foreground/80">
            <Eye className="h-3.5 w-3.5" />
            {t("quickView")}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-center gap-1 text-amber-500">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="text-xs font-semibold text-foreground/80">
            {product.rating}
          </span>
        </div>

        <h3 className="font-display text-lg leading-tight text-foreground truncate">
          {product.name}
        </h3>

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-lg font-semibold text-foreground">
            {formatCurrency(product.price)}
          </span>

          <button
            disabled={outOfStock}
            aria-disabled={outOfStock}
            onClick={async (e) => {
              e.preventDefault();

              if (outOfStock) {
                toast.error(`${product.name} is out of stock`);
                return;
              }

              const ok = await add(product.id);

              if (ok) {
                open();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            <Plus className="h-3.5 w-3.5" />
            {outOfStock ? t("unavailable") : t("add")}
          </button>
        </div>
      </div>
    </Link>
  );
}