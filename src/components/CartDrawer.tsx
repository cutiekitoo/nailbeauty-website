import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  AlertTriangle,
  Tag,
  Check,
  XCircle,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/currency";

export function CartDrawer() {
  const {
    isOpen,
    close,
    detailed,
    subtotal,
    setQuantity,
    remove,
    hasOutOfStock,
    outOfStockItems,
    ambassadorCode,
    applyAmbassadorCode,
    removeAmbassadorCode,
  } = useCart();
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  const handleApplyCode = async () => {
    setCodeError("");
    setCodeLoading(true);
    try {
      const applied = await applyAmbassadorCode(codeInput);
      if (applied) setCodeInput("");
      else setCodeError("Code invalide ou compte ambassadrice suspendu.");
    } finally {
      setCodeLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && close();

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
          isOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-label="Panier"
        className={`fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-background border-l border-border shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-6 h-20 border-b border-border">
            <h2 className="font-display text-2xl">
              Votre panier
            </h2>

            <button
              onClick={close}
              aria-label="Fermer le panier"
              className="grid place-items-center h-10 w-10 rounded-full bg-secondary hover:bg-accent transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {detailed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
                <div className="grid place-items-center h-20 w-20 rounded-full bg-secondary">
                  <ShoppingBag
                    className="h-8 w-8 text-primary"
                    strokeWidth={1.5}
                  />
                </div>

                <div>
                  <p className="font-display text-xl">
                    Votre panier est vide
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Ajoutez vos produits préférés pour commencer.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-4">
                {detailed.map(
                  ({ product, quantity, variant }) => {
                    const currentPrice =
                      variant?.price ?? product.price;

                    const currentStock =
                      variant?.stock ?? product.stock;

                    const currentImage =
                      variant?.image ?? product.image;

                    const isOOS = currentStock <= 0;

                    return (
                      <li
                        key={`${product.id}-${variant?.id ?? "default"}`}
                        className={`flex gap-4 p-3 rounded-2xl border ${
                          isOOS
                            ? "bg-destructive/5 border-destructive/40"
                            : "bg-card border-border/60"
                        }`}
                      >
                        <img
                          src={currentImage}
                          alt={product.name}
                          className={`h-20 w-20 rounded-xl object-cover ${
                            isOOS ? "opacity-60 grayscale" : ""
                          }`}
                        />

                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-medium text-sm leading-tight truncate">
                                {product.name}
                              </h3>

                              {variant && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {variant.name} · {variant.code}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() =>
                                remove(product.id, variant?.id)
                              }
                              aria-label={`Retirer ${product.name} du panier`}
                              className="text-muted-foreground hover:text-destructive transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <p className="text-sm text-muted-foreground mt-1">
                            {formatCurrency(currentPrice)}
                          </p>

                          {isOOS && (
                            <p className="text-xs font-semibold text-destructive mt-1 inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Rupture de stock — retirez ce produit pour continuer
                            </p>
                          )}

                          <div className="mt-auto flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-border bg-background">
                              <button
                                onClick={() =>
                                  setQuantity(
                                    product.id,
                                    quantity - 1,
                                    variant?.id
                                  )
                                }
                                aria-label="Diminuer la quantité"
                                className="h-8 w-8 grid place-items-center hover:bg-secondary rounded-l-full transition"
                              >
                                <Minus className="h-3 w-3" />
                              </button>

                              <span className="w-8 text-center text-sm font-semibold">
                                {quantity}
                              </span>

                              <button
                                onClick={() =>
                                  setQuantity(
                                    product.id,
                                    quantity + 1,
                                    variant?.id
                                  )
                                }
                                aria-label="Augmenter la quantité"
                                disabled={isOOS}
                                className="h-8 w-8 grid place-items-center hover:bg-secondary rounded-r-full transition disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="text-sm font-semibold">
                              {formatCurrency(currentPrice * quantity)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  }
                )}
              </ul>
            )}
          </div>

          {detailed.length > 0 && (
            <div className="border-t border-border px-6 py-5 space-y-4 bg-card/50">
              {hasOutOfStock && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />

                  <p>
                    {outOfStockItems.length}{" "}
                    {outOfStockItems.length > 1
                      ? "produits"
                      : "produit"}{" "}
                    en rupture de stock. Retirez{" "}
                    {outOfStockItems.length > 1
                      ? "ces produits"
                      : "ce produit"}{" "}
                    pour passer à la commande.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4 text-primary" />
                  Code ambassadrice
                </div>
                {ambassadorCode ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      <Check className="h-4 w-4" /> {ambassadorCode}
                    </span>
                    <button type="button" onClick={removeAmbassadorCode} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> Retirer
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={codeInput}
                        onChange={(event) => { setCodeInput(event.target.value.toUpperCase()); setCodeError(""); }}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleApplyCode(); } }}
                        placeholder="Saisir le code"
                        maxLength={24}
                        className="min-w-0 flex-1 h-10 px-3 rounded-xl bg-card border border-border text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Code ambassadrice"
                      />
                      <button type="button" onClick={() => void handleApplyCode()} disabled={codeLoading || !codeInput.trim()} className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                        {codeLoading ? "..." : "Appliquer"}
                      </button>
                    </div>
                    {codeError && <p className="text-xs text-destructive">{codeError}</p>}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Sous-total
                </span>

                <span className="font-display text-2xl">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Les frais de livraison seront calculés à l’étape suivante.
              </p>

              {hasOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="block w-full h-12 text-center rounded-full bg-primary text-primary-foreground font-semibold opacity-50 cursor-not-allowed"
                >
                  Passer à la commande
                </button>
              ) : (
                <Link
                  to="/checkout"
                  onClick={close}
                  className="block w-full h-12 leading-[3rem] text-center rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-[0.98] transition"
                >
                  Passer à la commande
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
