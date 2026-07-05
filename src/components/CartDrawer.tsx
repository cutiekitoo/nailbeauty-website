import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2, ShoppingBag, AlertTriangle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/currency";

export function CartDrawer() {
  const { isOpen, close, detailed, subtotal, setQuantity, remove, hasOutOfStock, outOfStockItems } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  return (
    <>
      <div
        onClick={close}
        className={`fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-background border-l border-border shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-6 h-20 border-b border-border">
            <h2 className="font-display text-2xl">Your Bag</h2>
            <button
              onClick={close}
              aria-label="Close cart"
              className="grid place-items-center h-10 w-10 rounded-full bg-secondary hover:bg-accent transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {detailed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
                <div className="grid place-items-center h-20 w-20 rounded-full bg-secondary">
                  <ShoppingBag className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display text-xl">Your bag is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add some pretty things to get started.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-4">
                {detailed.map(({ product, quantity }) => {
                  const isOOS = product.stock <= 0;
                  return (
                  <li
                    key={product.id}
                    className={`flex gap-4 p-3 rounded-2xl border ${
                      isOOS ? "bg-destructive/5 border-destructive/40" : "bg-card border-border/60"
                    }`}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`h-20 w-20 rounded-xl object-cover ${isOOS ? "opacity-60 grayscale" : ""}`}
                    />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm leading-tight truncate">{product.name}</h3>
                        <button
                          onClick={() => remove(product.id)}
                          aria-label={`Remove ${product.name}`}
                          className="text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(product.price)}
                      </p>
                      {isOOS && (
                        <p className="text-xs font-semibold text-destructive mt-1 inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Out of stock — remove to continue
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-border bg-background">
                          <button
                            onClick={() => setQuantity(product.id, quantity - 1)}
                            aria-label="Decrease quantity"
                            className="h-8 w-8 grid place-items-center hover:bg-secondary rounded-l-full transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                          <button
                            onClick={() => setQuantity(product.id, quantity + 1)}
                            aria-label="Increase quantity"
                            disabled={isOOS}
                            className="h-8 w-8 grid place-items-center hover:bg-secondary rounded-r-full transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(product.price * quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          {detailed.length > 0 && (
            <div className="border-t border-border px-6 py-5 space-y-4 bg-card/50">
              {hasOutOfStock && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    {outOfStockItems.length} item{outOfStockItems.length > 1 ? "s" : ""} out of stock.
                    Remove {outOfStockItems.length > 1 ? "them" : "it"} to proceed to checkout.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-display text-2xl">{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping & taxes calculated at checkout.
              </p>
              {hasOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="block w-full h-12 text-center rounded-full bg-primary text-primary-foreground font-semibold opacity-50 cursor-not-allowed"
                >
                  Proceed to Checkout
                </button>
              ) : (
                <Link
                  to="/checkout"
                  onClick={close}
                  className="block w-full h-12 leading-[3rem] text-center rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-[0.98] transition"
                >
                  Proceed to Checkout
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
