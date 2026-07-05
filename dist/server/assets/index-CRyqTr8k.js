import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, Truck, ShieldCheck, Search } from "lucide-react";
import { C as CartProvider, H as Header, a as CartDrawer } from "./CartDrawer-BvepcKJ7.js";
import { P as ProductCard } from "./ProductCard-DLfCmPyv.js";
import { p as productsService } from "./products-service-Cc9C7L3k.js";
import "@tanstack/react-router";
import "./router-CNIxA9Y2.js";
import "@tanstack/react-query";
import "sonner";
import "./currency-DaVuagTJ.js";
import "./client-oLxEsiRw.js";
import "@supabase/supabase-js";
const heroImg = "/assets/index-image-Dm50C68E.jpg";
function Home() {
  return /* @__PURE__ */ jsx(CartProvider, { children: /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx(Hero, {}),
    /* @__PURE__ */ jsx(Catalog, {}),
    /* @__PURE__ */ jsx(Footer, {}),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] }) });
}
function Hero() {
  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth"
    });
  };
  return /* @__PURE__ */ jsx("section", { className: "mx-auto max-w-7xl px-5 sm:px-8 pt-10 sm:pt-12 pb-8", children: /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-2 gap-8 items-center", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/60 text-accent-foreground text-xs font-medium", children: [
        /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }),
        "Nail Beauty Store"
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "font-display text-4xl sm:text-5xl leading-tight", children: [
        "Des ongles ",
        /* @__PURE__ */ jsx("span", { className: "text-primary italic", children: "parfaits" }),
        /* @__PURE__ */ jsx("br", {}),
        "en quelques minutes 💅"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed", children: "Produits professionnels pour nail artists et passionnées. Qualité salon, directement chez vous." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3 pt-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: scrollToProducts, className: "h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-95 transition", children: "Voir les produits" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Truck, { className: "h-4 w-4" }),
            "Livraison gratuite 20 000 DA+"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4" }),
            "Qualité pro"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute -inset-4 bg-gradient-to-br from-blush/40 via-lavender/30 to-transparent rounded-[2rem] blur-2xl" }),
      /* @__PURE__ */ jsx("div", { className: "relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-[var(--shadow-glow)] border border-white/60", children: /* @__PURE__ */ jsx("img", { src: heroImg, alt: "Nail beauty", className: "h-full w-full object-cover" }) })
    ] })
  ] }) });
}
function Catalog() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
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
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.fullDescription.toLowerCase().includes(q));
  }, [query, products]);
  return /* @__PURE__ */ jsxs("section", { id: "products", className: "mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16 scroll-mt-20", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-center max-w-xl mx-auto mb-8", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold tracking-widest text-primary uppercase mb-2", children: "Collection Pro Nail" }),
      /* @__PURE__ */ jsx("h2", { className: "font-display text-3xl sm:text-4xl mb-3", children: "Produits pour Nail Artists" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Qualité professionnelle pour salons et passionnées d’ongles." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative max-w-lg mx-auto mb-10", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsx("input", { type: "search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Rechercher un produit...", "aria-label": "Search products", className: "w-full h-12 pl-11 pr-5 rounded-full bg-card border border-border shadow-[var(--shadow-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" })
    ] }),
    !filtered.length ? /* @__PURE__ */ jsxs("p", { className: "text-center text-muted-foreground py-12", children: [
      'Aucun produit trouvé pour "',
      query,
      '"'
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7", children: filtered.map((p) => /* @__PURE__ */ jsx(ProductCard, { product: p }, p.id)) })
  ] });
}
function Footer() {
  return /* @__PURE__ */ jsx("footer", { className: "border-t border-border/60 mt-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row justify-between items-center gap-3", children: [
    /* @__PURE__ */ jsx("p", { className: "font-display text-lg", children: "Nail Beauty ✨" }),
    /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "© ",
      (/* @__PURE__ */ new Date()).getFullYear(),
      " Nail Beauty. Tous droits réservés."
    ] })
  ] }) });
}
export {
  Home as component
};
