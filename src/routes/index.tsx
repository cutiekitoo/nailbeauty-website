import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, Truck, ShieldCheck, Instagram, ArrowRight } from "lucide-react";

import heroImg from "@/assets/index-image.jpg";

import { CartProvider } from "@/lib/cart-context";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { productsService, type Product } from "@/lib/products-service";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Nail Beauty — Beautiful Nails, Beautiful You",
      },
      {
        name: "description",
        content:
          "Premium nail polish, art stickers, brushes and tools. Salon-quality results at home with Nail Beauty.",
      },

      // Open Graph — aperçu lors du partage du site
      {
        property: "og:title",
        content: "Nail Beauty — Beautiful Nails, Beautiful You",
      },
      {
        property: "og:description",
        content: "Discover our latest nail products and accessories.",
      },
      {
        property: "og:image",
        content:
          "https://nailbeauty-website-8rii.vercel.app/photo_2026-09-26_18-58-38.jpg?v=2",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://nailbeauty-website-8rii.vercel.app/",
      },
    ],
  }),

  component: Home,
});

function Home() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <Hero />
        <Catalog />
        <Footer />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}

function Hero() {
  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-10 sm:pt-12 pb-8">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        {/* LEFT CONTENT */}
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Nail Beauty Store
          </span>

          <h1 className="font-display text-4xl sm:text-5xl leading-tight">
            Équipez votre{" "}
            <span className="text-primary">salon</span>{" "}
            avec les produits d’<span className="text-primary">onglerie</span>{" "}
            qu’il vous faut 💗
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
            Découvrez nos produits et accessoires d’onglerie pour prothésistes ongulaires et salons de beauté. Commandez en ligne et profitez de la livraison partout en Algérie
            <img
              src="https://flagcdn.com/w40/dz.png"
              alt="Drapeau algérien"
              className="ml-1 inline-block w-5 align-middle"
            />
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="home-products-cta-wrap relative inline-flex w-full sm:w-auto">
              <span className="home-products-sparkle-orbit home-products-sparkle-orbit--one" aria-hidden="true">
                <span className="home-products-sparkle home-products-sparkle--one">✦</span>
              </span>
              <span className="home-products-sparkle-orbit home-products-sparkle-orbit--two" aria-hidden="true">
                <span className="home-products-sparkle home-products-sparkle--two">✧</span>
              </span>
              <span className="home-products-sparkle-orbit home-products-sparkle-orbit--three" aria-hidden="true">
                <span className="home-products-sparkle home-products-sparkle--three">✦</span>
              </span>
              <span className="home-products-sparkle-orbit home-products-sparkle-orbit--four" aria-hidden="true">
                <span className="home-products-sparkle home-products-sparkle--four">✧</span>
              </span>
              <span className="home-products-sparkle-orbit home-products-sparkle-orbit--five" aria-hidden="true">
                <span className="home-products-sparkle home-products-sparkle--five">✦</span>
              </span>
              <button
                onClick={scrollToProducts}
                className="home-products-cta group relative z-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[var(--shadow-glow)] active:scale-[0.97] sm:h-11 sm:w-auto motion-reduce:transition-none"
              >
                <span>Voir les produits</span>
                <ArrowRight className="home-products-cta-arrow h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <a
              href="https://www.instagram.com/my_queenail/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary/30 bg-card px-5 font-semibold text-foreground shadow-[var(--shadow-soft)] transition hover:border-primary hover:bg-secondary active:scale-95"
              aria-label="Suivre Nail Beauty sur Instagram"
            >
              <Instagram className="h-4 w-4 text-primary" />
              Instagram
            </a>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Livraison gratuite 20 000 DA+
              </span>

              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                Qualité pro
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-blush/40 via-lavender/30 to-transparent rounded-[2rem] blur-2xl" />

          <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-[var(--shadow-glow)] border border-white/60">
            <img
              src={heroImg}
              alt="Nail beauty"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const PRODUCTS_PER_BATCH = 10;

function Catalog() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProducts, setSearchProducts] = useState<Product[] | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [pageLoadError, setPageLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [catalogRevision, setCatalogRevision] = useState(0);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const requestVersionRef = useRef(0);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    let active = true;

    const loadFirstPage = async (showLoading: boolean) => {
      const requestVersion = ++requestVersionRef.current;
      loadingMoreRef.current = false;

      if (showLoading) {
        setIsInitialLoading(true);
      }

      try {
        const data = await productsService.listStorefrontPage(
          0,
          PRODUCTS_PER_BATCH
        );

        if (!active || requestVersion !== requestVersionRef.current) return;

        setProducts(data);
        setHasMoreProducts(data.length === PRODUCTS_PER_BATCH);
        setPageLoadError(false);
        setLoadMoreError(false);
        setCatalogRevision((revision) => revision + 1);
      } catch (error) {
        console.error("Unable to load storefront products", error);
        if (active && showLoading) {
          setPageLoadError(true);
        }
      } finally {
        if (active) {
          setIsInitialLoading(false);
        }
      }
    };

    void loadFirstPage(true);

    const unsubscribe = productsService.subscribe(() => {
      void loadFirstPage(false);
    });

    return () => {
      active = false;
      requestVersionRef.current += 1;
      unsubscribe();
    };
  }, []);

  // Search still includes the full catalog, even though only ten products are
  // initially rendered. It fetches the full list only when the user starts searching.
  useEffect(() => {
    if (!isSearching) {
      setSearchProducts(null);
      setIsSearchLoading(false);
      return;
    }

    let active = true;
    setIsSearchLoading(true);

    productsService
      .listStorefront()
      .then((data) => {
        if (active) setSearchProducts(data);
      })
      .catch((error) => {
        console.error("Unable to search storefront products", error);
        if (active) setSearchProducts([]);
      })
      .finally(() => {
        if (active) setIsSearchLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isSearching, catalogRevision]);

  const loadMoreProducts = useCallback(async () => {
    if (
      isSearching ||
      isInitialLoading ||
      !hasMoreProducts ||
      loadingMoreRef.current
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(false);

    const requestVersion = requestVersionRef.current;
    const offset = products.length;

    try {
      const nextProducts = await productsService.listStorefrontPage(
        offset,
        PRODUCTS_PER_BATCH
      );

      if (requestVersion !== requestVersionRef.current) return;

      setProducts((current) => {
        const alreadyLoaded = new Set(current.map((product) => product.id));
        return [
          ...current,
          ...nextProducts.filter((product) => !alreadyLoaded.has(product.id)),
        ];
      });
      setHasMoreProducts(nextProducts.length === PRODUCTS_PER_BATCH);
    } catch (error) {
      console.error("Unable to load more storefront products", error);
      if (requestVersion === requestVersionRef.current) {
        setLoadMoreError(true);
      }
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMoreProducts, isInitialLoading, isSearching, products.length]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (
      !target ||
      isSearching ||
      isInitialLoading ||
      !hasMoreProducts ||
      pageLoadError ||
      loadMoreError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreProducts();
        }
      },
      {
        // Start fetching before the customer reaches the end of the list.
        rootMargin: "600px 0px",
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    hasMoreProducts,
    isInitialLoading,
    isSearching,
    loadMoreError,
    loadMoreProducts,
    pageLoadError,
  ]);

  const catalogProducts = isSearching ? searchProducts ?? [] : products;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return catalogProducts;

    return catalogProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.fullDescription.toLowerCase().includes(q)
    );
  }, [query, catalogProducts]);

  const showSkeletons = isInitialLoading || (isSearching && isSearchLoading);

  return (
    <section
      id="products"
      className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16 scroll-mt-20"
    >
      {/* HEADER */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">
          Collection Pro Nail
        </p>

        <h2 className="font-display text-3xl sm:text-4xl mb-3">
          Produits pour Nail Artists
        </h2>

        <p className="text-sm text-muted-foreground">
          Qualité professionnelle pour salons et passionnées d’ongles.
        </p>
      </div>

      {/* SEARCH */}
      <div className="relative max-w-lg mx-auto mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un produit..."
          aria-label="Search products"
          className="w-full h-12 pl-11 pr-5 rounded-full bg-card border border-border shadow-[var(--shadow-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
        />
      </div>

      {showSkeletons ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7" aria-label="Chargement des produits">
          {Array.from({ length: PRODUCTS_PER_BATCH }, (_, index) => (
            <ProductSkeleton key={`initial-skeleton-${index}`} />
          ))}
        </div>
      ) : pageLoadError && !isSearching && products.length === 0 ? (
        <p className="text-center text-muted-foreground py-12" role="status">
          Impossible de charger les produits pour le moment. Veuillez actualiser la page.
        </p>
      ) : !filtered.length ? (
        <p className="text-center text-muted-foreground py-12" role="status">
          Aucun produit trouvé pour "{query}"
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {!isSearching &&
              isLoadingMore &&
              Array.from({ length: PRODUCTS_PER_BATCH }, (_, index) => (
                <ProductSkeleton key={`more-skeleton-${index}`} />
              ))}
          </div>

          {!isSearching && hasMoreProducts && !pageLoadError && (
            <div
              ref={loadMoreRef}
              className="flex min-h-12 items-center justify-center py-3 text-sm text-muted-foreground"
              aria-live="polite"
            >
              {isLoadingMore ? (
                <span>Chargement de 10 autres produits…</span>
              ) : loadMoreError ? (
                <button
                  type="button"
                  onClick={() => void loadMoreProducts()}
                  className="rounded-full border border-border bg-card px-4 py-2 font-medium transition hover:bg-secondary"
                >
                  Réessayer le chargement
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-3xl border border-border/70 bg-card"
      aria-hidden="true"
    >
      <div className="aspect-square bg-secondary/80" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-14 rounded-full bg-secondary" />
        <div className="h-5 w-4/5 rounded-full bg-secondary" />
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="h-5 w-20 rounded-full bg-secondary" />
          <div className="h-9 w-24 rounded-full bg-secondary" />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 mt-12">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="font-display text-lg">Nail Beauty ✨</p>

        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Nail Beauty. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}