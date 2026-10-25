import { useState, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Eye, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/products-service";
import { productsService } from "@/lib/products-service";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/currency";
import { useTranslation } from "@/i18n/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProductCard({ product }: { product: Product }) {
  const { add, open } = useCart();
  const hasVariants = Boolean(product.variants?.length);
  const allVariantsOutOfStock =
    hasVariants &&
    product.variants!.every((variant) => variant.stock <= 0);
  const outOfStock = hasVariants
    ? allVariantsOutOfStock
    : product.stock <= 0;
  const { t } = useTranslation();

  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [isResolvingAdd, setIsResolvingAdd] = useState(false);
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  const variants = variantProduct?.variants ?? [];
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const hasAvailableVariants = variants.some((variant) => variant.stock > 0);

  const handleQuickAdd = async (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (isResolvingAdd) return;

    setIsResolvingAdd(true);

    try {
      // The first product batch is intentionally loaded without variants for
      // speed. Fetch complete data only when the customer clicks "Ajouter".
      const currentProduct =
        product.variants && product.variants.length > 0
          ? product
          : await productsService.getStorefront(product.id);

      if (!currentProduct) {
        toast.error("Ce produit n’est plus disponible.");
        return;
      }

      const currentVariants = currentProduct.variants ?? [];

      if (currentVariants.length > 0) {
        if (!currentVariants.some((variant) => variant.stock > 0)) {
          toast.error("Toutes les variantes de ce produit sont en rupture de stock.");
          return;
        }

        // Ask the customer to choose explicitly instead of showing only
        // "Veuillez sélectionner une variante".
        setVariantProduct(currentProduct);
        setSelectedVariantId("");
        return;
      }

      if (currentProduct.stock <= 0) {
        toast.error(`${currentProduct.name} est en rupture de stock.`);
        return;
      }

      const success = await add(currentProduct.id);

      if (success) {
        open();
      }
    } catch (error) {
      console.error("Unable to prepare quick add", error);
      toast.error("Impossible de charger les variantes. Réessayez.");
    } finally {
      setIsResolvingAdd(false);
    }
  };

  const handleAddSelectedVariant = async () => {
    if (!variantProduct || !selectedVariant || isAddingVariant) return;

    if (selectedVariant.stock <= 0) {
      toast.error("Cette variante est en rupture de stock.");
      return;
    }

    setIsAddingVariant(true);

    try {
      const success = await add(
        variantProduct.id,
        1,
        selectedVariant.id,
      );

      if (success) {
        toast.success(
          `${variantProduct.name} — ${selectedVariant.name} ajouté au panier`,
          {
            description: `${selectedVariant.code} · ${formatCurrency(selectedVariant.price)}`,
          },
        );
        setVariantProduct(null);
        setSelectedVariantId("");
        open();
      }
    } catch (error) {
      console.error("Unable to add selected variant", error);
      toast.error("Impossible d’ajouter cette variante. Réessayez.");
    } finally {
      setIsAddingVariant(false);
    }
  };

  return (
    <>
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
              type="button"
              aria-disabled={isResolvingAdd || allVariantsOutOfStock}
              onClick={handleQuickAdd}
              disabled={isResolvingAdd || allVariantsOutOfStock}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              {isResolvingAdd ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {isResolvingAdd ? "Vérification…" : t("add")}
            </button>
          </div>
        </div>
      </Link>

      <Dialog
        open={Boolean(variantProduct)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isAddingVariant) {
            setVariantProduct(null);
            setSelectedVariantId("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-border/70 sm:max-w-md sm:p-7">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Choisissez une variante
            </DialogTitle>
            <DialogDescription>
              Sélectionnez la variante souhaitée parmi celles disponibles avant
              de l’ajouter au panier.
            </DialogDescription>
          </DialogHeader>

          {variantProduct && (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
                <img
                  src={variantProduct.image}
                  alt={variantProduct.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">
                    {variantProduct.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasAvailableVariants
                      ? "Choisissez une option en stock"
                      : "Aucune variante disponible"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Variantes</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {variants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;
                    const isAvailable = variant.stock > 0;

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={!isAvailable || isAddingVariant}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`flex min-h-24 items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/50"
                        } ${
                          !isAvailable
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        }`}
                      >
                        <img
                          src={variant.image || variantProduct.image}
                          alt={variant.image ? `${variant.name} (${variant.code})` : ""}
                          loading="lazy"
                          className="h-16 w-16 shrink-0 rounded-xl border border-border/60 bg-white object-contain"
                        />
                        <span className="min-w-0 flex-1 space-y-2">
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-semibold leading-tight">
                              {variant.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {variant.code}
                            </span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">
                              {formatCurrency(variant.price)}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                isAvailable
                                  ? "text-emerald-600"
                                  : "text-destructive"
                              }`}
                            >
                              {isAvailable ? "En stock" : "Épuisé"}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedVariant ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-blush/20 via-card to-lavender/20 p-4">
                  <p className="w-full text-sm font-semibold" role="status">
                    Aperçu de la variante sélectionnée
                  </p>
                  <img
                    src={selectedVariant.image || variantProduct.image}
                    alt={`${variantProduct.name} — ${selectedVariant.name} (${selectedVariant.code})`}
                    className="h-48 w-48 max-w-full rounded-2xl border border-border/60 bg-white object-contain p-2"
                  />
                  <div className="text-center">
                    <p className="font-semibold">
                      {selectedVariant.name} · {selectedVariant.code}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {formatCurrency(selectedVariant.price)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedVariant.image
                        ? "Photo spécifique de cette variante"
                        : "Photo générale du produit : aucune photo spécifique n’est renseignée pour cette variante."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" role="status">
                  Choisissez une variante pour afficher sa photo et continuer.
                </p>
              )}
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setVariantProduct(null);
                setSelectedVariantId("");
              }}
              disabled={isAddingVariant}
              className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-secondary disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddSelectedVariant}
              disabled={!selectedVariant || isAddingVariant}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAddingVariant ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isAddingVariant
                ? "Ajout en cours…"
                : selectedVariant
                  ? `Ajouter · ${formatCurrency(selectedVariant.price)}`
                  : "Ajouter au panier"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
