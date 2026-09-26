import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Sparkles,
  Truck,
  ShieldCheck
} from "lucide-react";

import heroImg from "@/assets/photo_2026-09-26_18-58-38.jpg";
import { CartProvider } from "@/lib/cart-context";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { productsService, type Product } from "@/lib/products-service";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nail Beauty — Beautiful Nails, Beautiful You" },
      {
        name: "description",
        content:
          "Premium nail polish, art stickers, brushes and tools. Salon-quality results at home with Nail Beauty.",
      },
      { property: "og:title", content: "Nail Beauty — Beautiful Nails, Beautiful You" },
      {
        property: "og:description",
        content: "Discover our latest nail products and accessories.",
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
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
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
            Des ongles <span className="text-primary italic">parfaits</span><br />
            en quelques minutes 💅
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
            Produits professionnels pour nail artists et passionnées.
            Qualité salon, directement chez vous.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={scrollToProducts}
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-95 transition"
            >
              Voir les produits
            </button>

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

function Catalog() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await productsService.listStorefront();
      setProducts(data);
    };

    loadProducts();

    const unsubscribe = productsService.subscribe(async () => {
      const data = await productsService.listStorefront();
      setProducts(data);
    });

    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return products;

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.fullDescription.toLowerCase().includes(q)
    );
  }, [query, products]);

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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit..."
          aria-label="Search products"
          className="w-full h-12 pl-11 pr-5 rounded-full bg-card border border-border shadow-[var(--shadow-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
        />
      </div>
  
      {!filtered.length ? (
        <p className="text-center text-muted-foreground py-12">
          Aucun produit trouvé pour "{query}"
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
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