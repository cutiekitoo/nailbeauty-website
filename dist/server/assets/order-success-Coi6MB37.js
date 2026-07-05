import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, Sparkles, Hash, Calendar, User, Phone, MapPin, Truck, ClipboardCheck, PackageCheck, Info, MessageCircle, Home, ArrowRight } from "lucide-react";
import { C as CartProvider, H as Header, a as CartDrawer } from "./CartDrawer-DUyq1Bqy.js";
import { g as getLastOrder } from "./orders-CtpbliHr.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import "sonner";
import "./products-service-iZC0U1m_.js";
import "./client-BIO5L_-k.js";
import "@supabase/supabase-js";
const WHATSAPP_NUMBER = "+213555000000";
const fmtDate = (iso) => new Date(iso).toLocaleString("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});
function Page() {
  return /* @__PURE__ */ jsx(CartProvider, { children: /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx(Success, {}),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] }) });
}
function Success() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    async function loadOrder() {
      const o = await getLastOrder();
      if (!o) {
        navigate({
          to: "/"
        });
        return;
      }
      setOrder(o);
      setLoaded(true);
    }
    loadOrder();
  }, [navigate]);
  if (!loaded || !order) return null;
  const firstName = order.customer.fullName.split(" ")[0];
  const waHref = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi! I need help with my order ${order.orderNumber}.`)}`;
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-4xl px-5 sm:px-8 py-10 sm:py-14 space-y-8 animate-fade-in", children: [
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-secondary via-card to-accent/40 border border-border shadow-[var(--shadow-glow)] p-8 sm:p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute -top-16 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl", "aria-hidden": true }),
      /* @__PURE__ */ jsx("div", { className: "absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-accent/40 blur-3xl", "aria-hidden": true }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative inline-grid place-items-center mb-6 animate-scale-in", children: [
          /* @__PURE__ */ jsx("span", { className: "absolute inset-0 -m-3 rounded-full bg-primary/20 blur-xl", "aria-hidden": true }),
          /* @__PURE__ */ jsx("span", { className: "relative grid place-items-center h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-soft)]", children: /* @__PURE__ */ jsx(CheckCircle2, { className: "h-12 w-12", strokeWidth: 1.8 }) }),
          /* @__PURE__ */ jsx(Sparkles, { className: "absolute -top-2 -right-3 h-6 w-6 text-primary animate-pulse" }),
          /* @__PURE__ */ jsx(Sparkles, { className: "absolute -bottom-1 -left-4 h-5 w-5 text-accent-foreground/70 animate-pulse" })
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl sm:text-5xl mb-3", children: "Order Confirmed! 🎉" }),
        /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground max-w-xl mx-auto", children: [
          "Thank you, ",
          firstName,
          ". We have successfully received your request and our team will reach out shortly to confirm."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8", children: [
      /* @__PURE__ */ jsxs("header", { className: "flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-widest text-muted-foreground", children: "Order summary" }),
          /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl", children: "Your details" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold", children: "Cash on Delivery" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-5 mt-6 text-sm", children: [
        /* @__PURE__ */ jsx(InfoRow, { icon: /* @__PURE__ */ jsx(Hash, { className: "h-4 w-4" }), label: "Order number", value: order.orderNumber }),
        /* @__PURE__ */ jsx(InfoRow, { icon: /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4" }), label: "Order date", value: fmtDate(order.createdAt) }),
        /* @__PURE__ */ jsx(InfoRow, { icon: /* @__PURE__ */ jsx(User, { className: "h-4 w-4" }), label: "Customer", value: order.customer.fullName }),
        /* @__PURE__ */ jsx(InfoRow, { icon: /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }), label: "Phone", value: order.customer.phone }),
        /* @__PURE__ */ jsx(InfoRow, { icon: /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4" }), label: "Wilaya", value: `${order.delivery.wilayaCode} — ${order.delivery.wilayaName}` }),
        /* @__PURE__ */ jsx(InfoRow, { icon: /* @__PURE__ */ jsx(Truck, { className: "h-4 w-4" }), label: order.delivery.method === "home" ? "Home delivery" : "DHD office pickup", value: order.delivery.address ?? order.delivery.officeLocation ?? "—" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 pt-6 border-t border-border flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { className: "font-display text-lg", children: "Total amount" }),
        /* @__PURE__ */ jsx("span", { className: "font-display text-3xl text-primary", children: formatCurrency(order.total) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl mb-5", children: "Ordered items" }),
      /* @__PURE__ */ jsx("ul", { className: "space-y-3", children: order.items.map((it) => /* @__PURE__ */ jsxs("li", { className: "flex gap-4 items-center p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-colors", children: [
        /* @__PURE__ */ jsx("img", { src: it.image, alt: it.name, className: "h-16 w-16 rounded-xl object-cover border border-border" }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold truncate", children: it.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: [
            formatCurrency(it.unitPrice),
            " ",
            /* @__PURE__ */ jsx("span", { className: "opacity-60", children: "×" }),
            " ",
            it.quantity
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold whitespace-nowrap", children: formatCurrency(it.lineTotal) })
      ] }, it.id)) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 pt-5 border-t border-border space-y-2 text-sm", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Subtotal" }),
          /* @__PURE__ */ jsx("span", { children: formatCurrency(order.subtotal) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Shipping" }),
          /* @__PURE__ */ jsx("span", { children: formatCurrency(order.shippingFee) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl mb-2", children: "What happens next" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mb-8", children: "Here's how we'll take care of your order from here." }),
      /* @__PURE__ */ jsxs("ol", { className: "relative", children: [
        /* @__PURE__ */ jsx("span", { className: "absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-accent to-border", "aria-hidden": true }),
        /* @__PURE__ */ jsx(TimelineStep, { active: true, icon: /* @__PURE__ */ jsx(ClipboardCheck, { className: "h-5 w-5" }), title: "Order Received", desc: "We've received your order and saved it to our system." }),
        /* @__PURE__ */ jsx(TimelineStep, { icon: /* @__PURE__ */ jsx(CheckCircle2, { className: "h-5 w-5" }), title: "Order Confirmation", desc: "Our team will call you shortly to confirm your details." }),
        /* @__PURE__ */ jsx(TimelineStep, { icon: /* @__PURE__ */ jsx(PackageCheck, { className: "h-5 w-5" }), title: "Shipping Preparation", desc: "We'll carefully pack your nail beauty products with love." }),
        /* @__PURE__ */ jsx(TimelineStep, { last: true, icon: /* @__PURE__ */ jsx(Truck, { className: "h-5 w-5" }), title: "Delivery", desc: order.delivery.method === "home" ? "Your order will be delivered to your address." : "Your order will be ready for pickup at the DHD office." })
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "rounded-3xl bg-gradient-to-br from-accent/50 to-secondary border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
      /* @__PURE__ */ jsx("span", { className: "grid place-items-center h-12 w-12 rounded-full bg-card text-primary shrink-0 shadow-sm", children: /* @__PURE__ */ jsx(Info, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-display text-xl mb-1", children: "Payment method: Cash on Delivery (COD)" }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-foreground/80", children: [
          "You will pay ",
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-primary", children: formatCurrency(order.total) }),
          " in cash when you receive your order. Please prepare the exact amount if possible."
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8 text-center", children: [
      /* @__PURE__ */ jsx("span", { className: "inline-grid place-items-center h-14 w-14 rounded-full bg-[#25D366]/15 text-[#128C7E] mb-4", children: /* @__PURE__ */ jsx(MessageCircle, { className: "h-7 w-7" }) }),
      /* @__PURE__ */ jsx("h3", { className: "font-display text-2xl mb-2", children: "Need help with your order?" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mb-5", children: "Contact us on WhatsApp and we'll get back to you right away." }),
      /* @__PURE__ */ jsxs("a", { href: waHref, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-white font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-95 transition", children: [
        /* @__PURE__ */ jsx(MessageCircle, { className: "h-5 w-5" }),
        "Chat on WhatsApp"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "text-center pt-2", children: /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-[var(--shadow-glow)] hover:brightness-110 active:scale-95 transition", children: [
      /* @__PURE__ */ jsx(Home, { className: "h-5 w-5" }),
      "Continue Shopping",
      /* @__PURE__ */ jsx(ArrowRight, { className: "h-5 w-5" })
    ] }) })
  ] });
}
function InfoRow({
  icon,
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
    /* @__PURE__ */ jsx("span", { className: "grid place-items-center h-9 w-9 rounded-full bg-accent text-accent-foreground shrink-0", children: icon }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsx("p", { className: "text-[11px] uppercase tracking-widest text-muted-foreground", children: label }),
      /* @__PURE__ */ jsx("p", { className: "font-medium break-words", children: value })
    ] })
  ] });
}
function TimelineStep({
  icon,
  title,
  desc,
  active = false,
  last = false
}) {
  return /* @__PURE__ */ jsxs("li", { className: `relative flex gap-4 ${last ? "" : "pb-7"}`, children: [
    /* @__PURE__ */ jsx("span", { className: `relative z-10 grid place-items-center h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0 border ${active ? "bg-gradient-to-br from-primary to-accent text-primary-foreground border-transparent shadow-[var(--shadow-soft)]" : "bg-card text-muted-foreground border-border"}`, children: icon }),
    /* @__PURE__ */ jsxs("div", { className: "pt-1 sm:pt-2", children: [
      /* @__PURE__ */ jsx("p", { className: "font-display text-lg leading-tight", children: title }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-1", children: desc })
    ] })
  ] });
}
export {
  Page as component
};
