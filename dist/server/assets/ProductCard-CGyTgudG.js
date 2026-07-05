import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Eye, Star, Plus } from "lucide-react";
import { toast } from "sonner";
import { u as useCart } from "./CartDrawer-DUyq1Bqy.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
function ProductCard({ product }) {
  const { add, open } = useCart();
  const outOfStock = product.stock <= 0;
  return /* @__PURE__ */ jsxs(
    Link,
    {
      to: "/products/$id",
      params: { id: product.id },
      className: "group relative flex flex-col rounded-3xl bg-card border border-border/70 overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-500 hover:-translate-y-1",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "relative aspect-square overflow-hidden bg-secondary", children: [
          /* @__PURE__ */ jsx(
            "img",
            {
              src: product.image,
              alt: product.name,
              loading: "lazy",
              className: `h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${outOfStock ? "opacity-70 grayscale" : ""}`
            }
          ),
          outOfStock ? /* @__PURE__ */ jsx("span", { className: "absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-destructive text-destructive-foreground shadow-sm", children: "Out of Stock" }) : product.tag && /* @__PURE__ */ jsx("span", { className: "absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-accent text-accent-foreground shadow-sm", children: product.tag }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 p-3 bg-gradient-to-t from-background/95 via-background/80 to-transparent", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 text-xs font-medium text-foreground/80", children: [
            /* @__PURE__ */ jsx(Eye, { className: "h-3.5 w-3.5" }),
            "Quick view"
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 p-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-amber-500", children: [
            /* @__PURE__ */ jsx(Star, { className: "h-3.5 w-3.5 fill-current" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-foreground/80", children: product.rating })
          ] }),
          /* @__PURE__ */ jsx("h3", { className: "font-display text-lg leading-tight text-foreground truncate", children: product.name }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold text-foreground", children: formatCurrency(product.price) }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                disabled: outOfStock,
                "aria-disabled": outOfStock,
                onClick: async (e) => {
                  e.preventDefault();
                  if (outOfStock) {
                    toast.error(`${product.name} is out of stock`);
                    return;
                  }
                  const ok = await add(product.id);
                  if (ok) {
                    open();
                  }
                },
                className: "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100",
                children: [
                  /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
                  outOfStock ? "Unavailable" : "Add"
                ]
              }
            )
          ] })
        ] })
      ]
    }
  );
}
export {
  ProductCard as P
};
