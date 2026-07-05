import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, Truck, ShieldCheck, Search } from "lucide-react";
import { C as CartProvider, H as Header, a as CartDrawer } from "./CartDrawer-DUyq1Bqy.js";
import { P as ProductCard } from "./ProductCard-CGyTgudG.js";
import { p as productsService } from "./products-service-iZC0U1m_.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import "@tanstack/react-router";
import "sonner";
import "./client-BIO5L_-k.js";
import "@supabase/supabase-js";
const heroImg = "/assets/hero-Bc8n98JQ.jpg";
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
  return /* @__PURE__ */ jsx("section", { className: "relative mx-auto max-w-7xl px-5 sm:px-8 pt-10 sm:pt-16 pb-12", children: /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-2 gap-10 lg:gap-16 items-center", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-7 order-2 lg:order-1", children: [
      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/60 text-accent-foreground text-xs font-medium tracking-wide", children: [
        /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }),
        " New Spring Collection"
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-foreground", children: [
        "Beautiful Nails,",
        /* @__PURE__ */ jsx("br", {}),
        /* @__PURE__ */ jsx("span", { className: "italic text-primary", children: "Beautiful You" }),
        " ",
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, children: "💅" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-lg text-muted-foreground max-w-md leading-relaxed", children: "Discover our latest nail products and accessories — crafted to bring salon-perfect glamour straight to your fingertips." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: scrollToProducts, className: "h-13 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 hover:-translate-y-0.5 active:scale-95 transition-all", children: "Shop Now" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-5 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(Truck, { className: "h-4 w-4" }),
            " Free shipping ",
            formatCurrency(5e3),
            "+"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4" }),
            " Cruelty-free"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "order-1 lg:order-2 relative", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute -inset-6 bg-gradient-to-br from-blush/40 via-lavender/30 to-transparent rounded-[3rem] blur-2xl", "aria-hidden": true }),
      /* @__PURE__ */ jsx("div", { className: "relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-[var(--shadow-glow)] border border-white/60", children: /* @__PURE__ */ jsx("img", { src: heroImg, alt: "Beautifully manicured pink nails", width: 1600, height: 1024, className: "h-full w-full object-cover" }) }),
      /* @__PURE__ */ jsx("div", { className: "absolute -bottom-5 -left-5 sm:-left-8 bg-card/95 backdrop-blur rounded-2xl px-5 py-4 shadow-[var(--shadow-soft)] border border-border/60", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid place-items-center h-10 w-10 rounded-full bg-accent text-accent-foreground", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Loved by" }),
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: "50,000+ nail lovers" })
        ] })
      ] }) })
    ] })
  ] }) });
}
function Catalog() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  useEffect(() => {
    setProducts(productsService.listStorefront());
    return productsService.subscribe(() => setProducts(productsService.listStorefront()));
  }, []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.fullDescription.toLowerCase().includes(q));
  }, [query, products]);
  return /* @__PURE__ */ jsxs("section", { id: "products", className: "mx-auto max-w-7xl px-5 sm:px-8 py-16 sm:py-24 scroll-mt-24", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-center max-w-2xl mx-auto mb-10", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-primary tracking-widest uppercase mb-3", children: "Shop the Collection" }),
      /* @__PURE__ */ jsx("h2", { className: "font-display text-4xl sm:text-5xl mb-4", children: "Our Pretty Things" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Hand-picked essentials for your at-home nail ritual." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative max-w-xl mx-auto mb-12", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" }),
      /* @__PURE__ */ jsx("input", { type: "search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search products...", "aria-label": "Search products", className: "w-full h-14 sm:h-16 pl-14 pr-6 rounded-full bg-card border border-border shadow-[var(--shadow-soft)] text-base placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition" })
    ] }),
    filtered.length === 0 ? /* @__PURE__ */ jsxs("p", { className: "text-center text-muted-foreground py-16", children: [
      'No products match "',
      query,
      '". Try a different search.'
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8", children: filtered.map((p) => /* @__PURE__ */ jsx(ProductCard, { product: p }, p.id)) })
  ] });
}
function Footer() {
  return /* @__PURE__ */ jsx("footer", { className: "border-t border-border/60 mt-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-5 sm:px-8 py-10 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center", children: [
    /* @__PURE__ */ jsx("p", { className: "font-display text-xl", children: "Nail Beauty ✨" }),
    /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "© ",
      (/* @__PURE__ */ new Date()).getFullYear(),
      " Nail Beauty. Made with love."
    ] })
  ] }) });
}
export {
  Home as component
};
