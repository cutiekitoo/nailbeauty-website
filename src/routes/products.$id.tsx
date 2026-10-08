import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Star,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CartProvider, useCart } from "@/lib/cart-context";
import {
  productsService,
  type Product,
} from "@/lib/products-service";
import { formatCurrency } from "@/lib/currency";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { Toaster } from "@/components/ui/sonner";
import { trackViewContent } from "@/lib/meta-pixel";

export const Route = createFileRoute("/products/$id")({
  head: () => ({
    meta: [
      {
        title: "Produit — Nail Beauty",
      },
      {
        name: "description",
        content: "Découvrez les détails de ce produit sur Nail Beauty.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <Body />
        <CartDrawer />
        <Toaster position="top-center" />
      </div>
    </CartProvider>
  );
}

function Body() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const update = async () => {
      const p = await productsService.getStorefront(id);
      setProduct(p);

      const list = await productsService.listStorefront();
      setRelated(
        list
          .filter((x) => x.id !== id)
          .slice(0, 4)
      );

      setLoaded(true);
    };

    update();
    return productsService.subscribe(update);
  }, [id]);

  if (!loaded) {
    return null;
  }

  if (!product) {
    return (
      <main className="min-h-[70vh] grid place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-4xl mb-3">
            Produit introuvable
          </h1>
          <Link
            to="/"
            className="text-primary underline"
          >
            Retour à la boutique
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-8 py-8 sm:py-14">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la boutique
      </Link>

      <ProductDetails
        key={product.id}
        product={product}
      />

      <DescriptionSection product={product} />
      <RelatedSection products={related} />
    </main>
  );
}

function ProductDetails({
  product,
}: {
  product: Product;
}) {
  const { add, open } = useCart();
  const [qty, setQty] = useState(1);
  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<
    string | undefined
  >(variants[0]?.id);

  const selectedVariant = hasVariants
    ? variants.find((v) => v.id === selectedVariantId) ??
      variants[0]
    : undefined;

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentStock = selectedVariant?.stock ?? product.stock;

  const [activeImage, setActiveImage] = useState(
    selectedVariant?.image ??
      product.gallery[0] ??
      product.image
  );

  useEffect(() => {
    const nextImage =
      selectedVariant?.image ??
      product.gallery[0] ??
      product.image;

    setActiveImage(nextImage);
    setQty(1);
  }, [
    selectedVariant?.id,
    selectedVariant?.image,
    product.gallery,
    product.image,
  ]);

  // Meta Pixel — consultation du produit
  useEffect(() => {
    trackViewContent({
      id: product.id,
      name: product.name,
      price: currentPrice,
    });
  }, [product.id, currentPrice, product.name]);

  const inStock = currentStock > 0;

  const handleVariantChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQty(1);
  };

  const handleAdd = async () => {
    if (!inStock) {
      toast.error(
        `${
          selectedVariant
            ? `${product.name} — ${selectedVariant.name}`
            : product.name
        } est en rupture de stock`
      );
      return;
    }

    const success = await add(
      product.id,
      qty,
      selectedVariant?.id
    );

    if (!success) {
      return;
    }

    const productLabel = selectedVariant
      ? `${product.name} — ${selectedVariant.name}`
      : product.name;

    toast.success(
      `${productLabel} ajouté au panier`,
      {
        description: `Quantité : ${qty} · ${formatCurrency(
          currentPrice * qty
        )}`,
      }
    );

    open();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
      {/* Galerie d'images */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div
            className="absolute -inset-4 bg-gradient-to-br from-blush/40 to-lavender/30 rounded-[3rem] blur-2xl"
            aria-hidden
          />

          <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-[var(--shadow-glow)] border border-white/60 bg-card">
            <img
              key={activeImage}
              src={activeImage}
              alt={product.name}
              className="h-full w-full object-cover animate-in fade-in zoom-in-95 duration-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {product.gallery.map((img, i) => {
            const isActive = img === activeImage;

            return (
              <button
                key={`${img}-${i}`}
                onClick={() => setActiveImage(img)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-card ${
                  isActive
                    ? "border-primary shadow-[var(--shadow-soft)] scale-[0.98]"
                    : "border-border/60 hover:border-primary/60 opacity-80 hover:opacity-100"
                }`}
                aria-label={`Voir l’image ${i + 1}`}
              >
                <img
                  src={img}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Informations du produit */}
      <div className="flex flex-col gap-5">
        {(product as any).tag ||
        (product as any).category ? (
          <span className="self-start px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-accent text-accent-foreground">
            {(product as any).tag ||
              (product as any).category}
          </span>
        ) : null}

        <h1 className="font-display text-4xl sm:text-5xl leading-tight">
          {product.name}
        </h1>

        <div className="flex items-center gap-2 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < Math.round(product.rating)
                  ? "fill-current"
                  : "opacity-30"
              }`}
            />
          ))}

          <span className="text-sm text-muted-foreground ml-1">
            {product.rating} · 1,2 k avis
          </span>
        </div>

        {/* Prix */}
        <p className="font-display text-4xl text-foreground">
          {formatCurrency(currentPrice)}
        </p>

        <p className="text-muted-foreground leading-relaxed">
          {product.description}
        </p>

        {/* Variantes */}
        {hasVariants && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">
                Choisir une couleur
              </span>

              {selectedVariant && (
                <span className="text-sm text-muted-foreground">
                  {selectedVariant.name} · {selectedVariant.code}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => {
                const isSelected =
                  variant.id === selectedVariant?.id;

                const variantInStock = variant.stock > 0;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={!variantInStock}
                    onClick={() =>
                      handleVariantChange(variant.id)
                    }
                    className={`px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                        : variantInStock
                        ? "border-border bg-card hover:border-primary/60 hover:bg-secondary"
                        : "border-border/50 bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {variant.name}
                    <span className="ml-1 opacity-70">
                      ({variant.code})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Disponibilité */}
        <div
          className={`inline-flex items-center gap-2 self-start text-sm font-medium ${
            inStock
              ? "text-emerald-600"
              : "text-destructive"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              inStock
                ? "bg-emerald-500"
                : "bg-destructive"
            }`}
          />

          {inStock
            ? `En stock · ${currentStock} disponibles`
            : "Rupture de stock"}
        </div>

        {/* Quantité et ajout au panier */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
          <div className="inline-flex items-center rounded-full border border-border bg-card shadow-[var(--shadow-soft)]">
            <button
              onClick={() =>
                setQty((q) => Math.max(1, q - 1))
              }
              className="h-12 w-12 grid place-items-center hover:bg-secondary rounded-l-full transition"
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>

            <input
              type="number"
              min={1}
              max={currentStock}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);

                if (!Number.isNaN(v)) {
                  setQty(
                    Math.max(
                      1,
                      Math.min(currentStock, v)
                    )
                  );
                }
              }}
              className="w-12 text-center font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Quantité"
            />

            <button
              onClick={() =>
                setQty((q) =>
                  Math.min(currentStock, q + 1)
                )
              }
              className="h-12 w-12 grid place-items-center hover:bg-secondary rounded-r-full transition"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            disabled={!inStock}
            onClick={handleAdd}
            className="flex-1 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-[0.98] transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="h-4 w-4" />
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}

function DescriptionSection({
  product,
}: {
  product: Product;
}) {
  return (
    <section className="mt-20 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-3xl bg-card border border-border/70 shadow-[var(--shadow-soft)] p-7 sm:p-9">
        <h2 className="font-display text-2xl sm:text-3xl mb-4">
          Description du produit
        </h2>

        <p className="text-muted-foreground leading-relaxed">
          {product.fullDescription}
        </p>

        {product.usage &&
          product.usage.length > 0 && (
            <>
              <h3 className="font-display text-xl mt-8 mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Conseils d’utilisation
              </h3>

              <ol className="space-y-3">
                {product.usage.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-foreground/80"
                  >
                    <span className="shrink-0 grid place-items-center h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                      {i + 1}
                    </span>

                    <span className="leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-blush/40 via-card to-lavender/40 border border-white/70 shadow-[var(--shadow-soft)] p-7 sm:p-9">
        <h3 className="font-display text-2xl mb-5">
          Avantages
        </h3>

        <ul className="space-y-3">
          {product.benefits &&
          product.benefits.length > 0 ? (
            product.benefits.map((b, i) => (
              <li
                key={i}
                className="flex gap-3 items-start text-sm text-foreground/85"
              >
                <span className="shrink-0 grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>

                <span className="leading-relaxed">
                  {b}
                </span>
              </li>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Aucun avantage renseigné pour le moment.
            </p>
          )}
        </ul>
      </div>
    </section>
  );
}

function RelatedSection({
  products,
}: {
  products: Product[];
}) {
  return (
    <section className="mt-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sm font-medium text-primary tracking-widest uppercase mb-2">
            Vous aimerez aussi
          </p>

          <h2 className="font-display text-3xl sm:text-4xl">
            Produits similaires
          </h2>
        </div>

        <Link
          to="/"
          className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition"
        >
          Voir tous les produits →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
          />
        ))}
      </div>
    </section>
  );
}
