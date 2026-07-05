import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, X, Trash2, AlertTriangle, Minus, Plus } from "lucide-react";
import { u as useLanguage } from "./router-CNIxA9Y2.js";
import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { toast } from "sonner";
import { p as productsService } from "./products-service-Cc9C7L3k.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
const Ctx = createContext(null);
const STORAGE_KEY = "nail-beauty-cart-v1";
function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
    }
    setHydrated(true);
    productsService.listStorefront().then((products) => {
      setAllProducts(products);
    });
    const unsubscribe = productsService.subscribe(() => {
      productsService.listStorefront().then((products) => {
        setAllProducts(products);
      });
    });
    return unsubscribe;
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);
  const value = useMemo(() => {
    const detailed = items.map((it) => {
      const product = allProducts.find((p) => p.id === it.id);
      return product ? { product, quantity: it.quantity } : null;
    }).filter((x) => x !== null);
    const outOfStockItems = detailed.filter((d) => d.product.stock <= 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = detailed.reduce((s, d) => s + d.product.price * d.quantity, 0);
    return {
      items,
      count,
      subtotal,
      detailed,
      outOfStockItems,
      hasOutOfStock: outOfStockItems.length > 0,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: async (id) => {
        const product = await productsService.getStorefront(id);
        if (!product || product.stock <= 0) {
          toast.error(`${product?.name ?? "This product"} is out of stock`);
          return false;
        }
        const current = items.find((p) => p.id === id)?.quantity ?? 0;
        if (current + 1 > product.stock) {
          toast.error(`Only ${product.stock} in stock for ${product.name}`);
          return false;
        }
        setItems((prev) => {
          const found = prev.find((p) => p.id === id);
          if (found) {
            return prev.map(
              (p) => p.id === id ? { ...p, quantity: p.quantity + 1 } : p
            );
          }
          return [...prev, { id, quantity: 1 }];
        });
        return true;
      },
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      setQuantity: async (id, q) => {
        if (q > 0) {
          const product = await productsService.getStorefront(id);
          if (product && q > product.stock) {
            toast.error(`Only ${product.stock} in stock for ${product.name}`);
            q = product.stock;
          }
        }
        setItems(
          (prev) => q <= 0 ? prev.filter((p) => p.id !== id) : prev.map(
            (p) => p.id === id ? { ...p, quantity: q } : p
          )
        );
      },
      clear: () => setItems([])
    };
  }, [items, isOpen, allProducts]);
  return /* @__PURE__ */ jsx(Ctx.Provider, { value, children });
}
function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
const translations = {
  fr: {
    backToShop: "Retour à la boutique",
    productNotFound: "Produit introuvable",
    addToCart: "Ajouter au panier",
    outOfStock: "Rupture de stock",
    inStock: "En stock",
    description: "Description du produit",
    howToUse: "Comment utiliser",
    benefits: "Avantages",
    related: "Produits similaires",
    viewAll: "Voir tout",
    quickView: "Aperçu rapide",
    unavailable: "Indisponible",
    add: "Ajouter",
    french: "Français",
    arabic: "Arabe"
  },
  ar: {
    backToShop: "العودة إلى المتجر",
    productNotFound: "المنتج غير موجود",
    addToCart: "أضف إلى السلة",
    outOfStock: "نفد من المخزون",
    inStock: "متوفر",
    description: "وصف المنتج",
    howToUse: "طريقة الاستخدام",
    benefits: "الفوائد",
    related: "منتجات مشابهة",
    viewAll: "عرض الكل",
    quickView: "عرض سريع",
    unavailable: "غير متوفر",
    add: "أضف",
    french: "الفرنسية",
    arabic: "العربية"
  }
};
function useTranslation() {
  const { language } = useLanguage();
  const t = (key) => {
    return translations[language]?.[key] ?? key;
  };
  return { t, language };
}
function Header() {
  const { count, open } = useCart();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  return /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/", className: "font-display text-2xl font-semibold", children: [
      "Nail ",
      /* @__PURE__ */ jsx("span", { className: "text-primary", children: "Beauty" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: toggleLanguage,
          className: "px-3 py-1 rounded-full border text-xs font-semibold bg-card hover:bg-secondary transition",
          children: language === "fr" ? t("arabic") : t("french")
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: open,
          className: "relative grid place-items-center h-11 w-11 rounded-full bg-card border",
          children: [
            /* @__PURE__ */ jsx(ShoppingBag, { className: "h-5 w-5" }),
            count > 0 && /* @__PURE__ */ jsx("span", { className: "absolute -top-1 -right-1 bg-primary text-white text-xs px-1.5 rounded-full", children: count })
          ]
        }
      )
    ] })
  ] }) });
}
function CartDrawer() {
  const { isOpen, close, detailed, subtotal, setQuantity, remove, hasOutOfStock, outOfStockItems } = useCart();
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        onClick: close,
        className: `fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`,
        "aria-hidden": true
      }
    ),
    /* @__PURE__ */ jsx(
      "aside",
      {
        role: "dialog",
        "aria-label": "Shopping cart",
        className: `fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-background border-l border-border shadow-2xl transition-transform duration-500 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`,
        children: /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 h-20 border-b border-border", children: [
            /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl", children: "Your Bag" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: close,
                "aria-label": "Close cart",
                className: "grid place-items-center h-10 w-10 rounded-full bg-secondary hover:bg-accent transition",
                children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto px-6 py-5", children: detailed.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "h-full flex flex-col items-center justify-center text-center gap-4 py-16", children: [
            /* @__PURE__ */ jsx("div", { className: "grid place-items-center h-20 w-20 rounded-full bg-secondary", children: /* @__PURE__ */ jsx(ShoppingBag, { className: "h-8 w-8 text-primary", strokeWidth: 1.5 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "font-display text-xl", children: "Your bag is empty" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Add some pretty things to get started." })
            ] })
          ] }) : /* @__PURE__ */ jsx("ul", { className: "space-y-4", children: detailed.map(({ product, quantity }) => {
            const isOOS = product.stock <= 0;
            return /* @__PURE__ */ jsxs(
              "li",
              {
                className: `flex gap-4 p-3 rounded-2xl border ${isOOS ? "bg-destructive/5 border-destructive/40" : "bg-card border-border/60"}`,
                children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: product.image,
                      alt: product.name,
                      className: `h-20 w-20 rounded-xl object-cover ${isOOS ? "opacity-60 grayscale" : ""}`
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 flex flex-col", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                      /* @__PURE__ */ jsx("h3", { className: "font-medium text-sm leading-tight truncate", children: product.name }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => remove(product.id),
                          "aria-label": `Remove ${product.name}`,
                          className: "text-muted-foreground hover:text-destructive transition",
                          children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-1", children: formatCurrency(product.price) }),
                    isOOS && /* @__PURE__ */ jsxs("p", { className: "text-xs font-semibold text-destructive mt-1 inline-flex items-center gap-1", children: [
                      /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3 w-3" }),
                      " Out of stock — remove to continue"
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "mt-auto flex items-center justify-between", children: [
                      /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center rounded-full border border-border bg-background", children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            onClick: () => setQuantity(product.id, quantity - 1),
                            "aria-label": "Decrease quantity",
                            className: "h-8 w-8 grid place-items-center hover:bg-secondary rounded-l-full transition",
                            children: /* @__PURE__ */ jsx(Minus, { className: "h-3 w-3" })
                          }
                        ),
                        /* @__PURE__ */ jsx("span", { className: "w-8 text-center text-sm font-semibold", children: quantity }),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            onClick: () => setQuantity(product.id, quantity + 1),
                            "aria-label": "Increase quantity",
                            disabled: isOOS,
                            className: "h-8 w-8 grid place-items-center hover:bg-secondary rounded-r-full transition disabled:opacity-40 disabled:cursor-not-allowed",
                            children: /* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" })
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: formatCurrency(product.price * quantity) })
                    ] })
                  ] })
                ]
              },
              product.id
            );
          }) }) }),
          detailed.length > 0 && /* @__PURE__ */ jsxs("div", { className: "border-t border-border px-6 py-5 space-y-4 bg-card/50", children: [
            hasOutOfStock && /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs", children: [
              /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4 shrink-0 mt-0.5" }),
              /* @__PURE__ */ jsxs("p", { children: [
                outOfStockItems.length,
                " item",
                outOfStockItems.length > 1 ? "s" : "",
                " out of stock. Remove ",
                outOfStockItems.length > 1 ? "them" : "it",
                " to proceed to checkout."
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "Subtotal" }),
              /* @__PURE__ */ jsx("span", { className: "font-display text-2xl", children: formatCurrency(subtotal) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Shipping & taxes calculated at checkout." }),
            hasOutOfStock ? /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                disabled: true,
                className: "block w-full h-12 text-center rounded-full bg-primary text-primary-foreground font-semibold opacity-50 cursor-not-allowed",
                children: "Proceed to Checkout"
              }
            ) : /* @__PURE__ */ jsx(
              Link,
              {
                to: "/checkout",
                onClick: close,
                className: "block w-full h-12 leading-[3rem] text-center rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-[0.98] transition",
                children: "Proceed to Checkout"
              }
            )
          ] })
        ] })
      }
    )
  ] });
}
export {
  CartProvider as C,
  Header as H,
  CartDrawer as a,
  useTranslation as b,
  useCart as u
};
