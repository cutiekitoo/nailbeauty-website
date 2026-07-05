import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Star, Minus, Plus, ShoppingBag, Sparkles, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { C as CartProvider, H as Header, a as CartDrawer, u as useCart } from "./CartDrawer-DUyq1Bqy.js";
import { p as productsService } from "./products-service-iZC0U1m_.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import { P as ProductCard } from "./ProductCard-CGyTgudG.js";
import { T as Toaster, R as Route } from "./router-BoeHmDt-.js";
import "./client-BIO5L_-k.js";
import "@supabase/supabase-js";
import "@tanstack/react-query";
function ProductPage() {
  return /* @__PURE__ */ jsx(CartProvider, { children: /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx(Body, {}),
    /* @__PURE__ */ jsx(CartDrawer, {}),
    /* @__PURE__ */ jsx(Toaster, { position: "top-center" })
  ] }) });
}
function Body() {
  const {
    id
  } = Route.useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const update = () => {
      const p = productsService.getStorefront(id);
      setProduct(p);
      setRelated(productsService.listStorefront().filter((x) => x.id !== id).slice(0, 4));
      setLoaded(true);
    };
    update();
    return productsService.subscribe(update);
  }, [id]);
  if (!loaded) return null;
  if (!product) {
    return /* @__PURE__ */ jsx("main", { className: "min-h-[70vh] grid place-items-center px-6 text-center", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl mb-3", children: "Product not found" }),
      /* @__PURE__ */ jsx(Link, { to: "/", className: "text-primary underline", children: "Back to shop" })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-7xl px-5 sm:px-8 py-8 sm:py-14", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-8", children: [
      /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }),
      " Back to shop"
    ] }),
    /* @__PURE__ */ jsx(ProductDetails, { product }, product.id),
    /* @__PURE__ */ jsx(DescriptionSection, { product }),
    /* @__PURE__ */ jsx(RelatedSection, { products: related })
  ] });
}
function ProductDetails({
  product
}) {
  const {
    add,
    open
  } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(product.gallery[0] ?? product.image);
  useEffect(() => {
    setActiveImage(product.gallery[0] ?? product.image);
  }, [product.gallery, product.image]);
  const inStock = product.stock > 0;
  const handleAdd = () => {
    if (!inStock) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    let added = 0;
    for (let i = 0; i < qty; i++) {
      if (add(product.id)) added++;
    }
    if (added === 0) return;
    toast.success(`${product.name} added to bag`, {
      description: `Quantity: ${added} · ${formatCurrency(product.price * added)}`
    });
    open();
  };
  return /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-2 gap-10 lg:gap-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute -inset-4 bg-gradient-to-br from-blush/40 to-lavender/30 rounded-[3rem] blur-2xl", "aria-hidden": true }),
        /* @__PURE__ */ jsx("div", { className: "relative aspect-square rounded-[2rem] overflow-hidden shadow-[var(--shadow-glow)] border border-white/60 bg-card", children: /* @__PURE__ */ jsx("img", { src: activeImage, alt: product.name, className: "h-full w-full object-cover animate-in fade-in zoom-in-95 duration-500" }, activeImage) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-3", children: product.gallery.map((img, i) => {
        const isActive = img === activeImage;
        return /* @__PURE__ */ jsx("button", { onClick: () => setActiveImage(img), className: `relative aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-card ${isActive ? "border-primary shadow-[var(--shadow-soft)] scale-[0.98]" : "border-border/60 hover:border-primary/60 opacity-80 hover:opacity-100"}`, "aria-label": `View image ${i + 1}`, children: /* @__PURE__ */ jsx("img", { src: img, alt: "", className: "h-full w-full object-cover" }) }, `${img}-${i}`);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5", children: [
      product.tag || product.category ? /* @__PURE__ */ jsx("span", { className: "self-start px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-accent text-accent-foreground", children: product.tag || product.category }) : null,
      /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl sm:text-5xl leading-tight", children: product.name }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-amber-500", children: [
        Array.from({
          length: 5
        }).map((_, i) => /* @__PURE__ */ jsx(Star, { className: `h-4 w-4 ${i < Math.round(product.rating) ? "fill-current" : "opacity-30"}` }, i)),
        /* @__PURE__ */ jsxs("span", { className: "text-sm text-muted-foreground ml-1", children: [
          product.rating,
          " · 1.2k reviews"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "font-display text-4xl text-foreground", children: formatCurrency(product.price) }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground leading-relaxed", children: product.description }),
      /* @__PURE__ */ jsxs("div", { className: `inline-flex items-center gap-2 self-start text-sm font-medium ${inStock ? "text-emerald-600" : "text-destructive"}`, children: [
        /* @__PURE__ */ jsx("span", { className: `h-2 w-2 rounded-full ${inStock ? "bg-emerald-500" : "bg-destructive"}` }),
        inStock ? `In Stock · ${product.stock} available` : "Out of Stock"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-4 pt-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center rounded-full border border-border bg-card shadow-[var(--shadow-soft)]", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setQty((q) => Math.max(1, q - 1)), className: "h-12 w-12 grid place-items-center hover:bg-secondary rounded-l-full transition", "aria-label": "Decrease quantity", children: /* @__PURE__ */ jsx(Minus, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx("input", { type: "number", min: 1, max: product.stock, value: qty, onChange: (e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) setQty(Math.max(1, Math.min(product.stock, v)));
          }, className: "w-12 text-center font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", "aria-label": "Quantity" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setQty((q) => Math.min(product.stock, q + 1)), className: "h-12 w-12 grid place-items-center hover:bg-secondary rounded-r-full transition", "aria-label": "Increase quantity", children: /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }) })
        ] }),
        /* @__PURE__ */ jsxs("button", { disabled: !inStock, onClick: handleAdd, className: "flex-1 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-[0.98] transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", children: [
          /* @__PURE__ */ jsx(ShoppingBag, { className: "h-4 w-4" }),
          " Add to Cart"
        ] })
      ] })
    ] })
  ] });
}
function DescriptionSection({
  product
}) {
  return /* @__PURE__ */ jsxs("section", { className: "mt-20 grid lg:grid-cols-3 gap-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 rounded-3xl bg-card border border-border/70 shadow-[var(--shadow-soft)] p-7 sm:p-9", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl sm:text-3xl mb-4", children: "Product Description" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground leading-relaxed", children: product.fullDescription }),
      product.usage && product.usage.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("h3", { className: "font-display text-xl mt-8 mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-primary" }),
          " How to Use"
        ] }),
        /* @__PURE__ */ jsx("ol", { className: "space-y-3", children: product.usage.map((step, i) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 text-sm text-foreground/80", children: [
          /* @__PURE__ */ jsx("span", { className: "shrink-0 grid place-items-center h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold", children: i + 1 }),
          /* @__PURE__ */ jsx("span", { className: "leading-relaxed", children: step })
        ] }, i)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-3xl bg-gradient-to-br from-blush/40 via-card to-lavender/40 border border-white/70 shadow-[var(--shadow-soft)] p-7 sm:p-9", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-display text-2xl mb-5", children: "Benefits" }),
      /* @__PURE__ */ jsx("ul", { className: "space-y-3", children: product.benefits && product.benefits.length > 0 ? product.benefits.map((b, i) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 items-start text-sm text-foreground/85", children: [
        /* @__PURE__ */ jsx("span", { className: "shrink-0 grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground", children: /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }) }),
        /* @__PURE__ */ jsx("span", { className: "leading-relaxed", children: b })
      ] }, i)) : /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground italic", children: "No benefits listed yet." }) })
    ] })
  ] });
}
function RelatedSection({
  products
}) {
  return /* @__PURE__ */ jsxs("section", { className: "mt-20", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between mb-8", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-primary tracking-widest uppercase mb-2", children: "You'll also love" }),
        /* @__PURE__ */ jsx("h2", { className: "font-display text-3xl sm:text-4xl", children: "Related Products" })
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/", className: "hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition", children: "View all →" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", children: products.map((p) => /* @__PURE__ */ jsx(ProductCard, { product: p }, p.id)) })
  ] });
}
export {
  ProductPage as component
};
