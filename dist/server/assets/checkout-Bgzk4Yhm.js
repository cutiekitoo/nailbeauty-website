import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Phone, User, MapPin, Wallet, Package, Search } from "lucide-react";
import { C as CartProvider, H as Header, a as CartDrawer, u as useCart } from "./CartDrawer-DUyq1Bqy.js";
import { s as shippingService } from "./shipping-service-OVUuzh5i.js";
import { c as createOrder } from "./orders-CtpbliHr.js";
import { p as productsService } from "./products-service-iZC0U1m_.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import "sonner";
import "./client-BIO5L_-k.js";
import "@supabase/supabase-js";
const DEFAULT_RATES = { home: 700, office: 500 };
const RAW_WILAYAS = [
  ["01", "Adrar", { home: 1200, office: 900 }],
  ["02", "Chlef", { home: 700, office: 500 }],
  ["03", "Laghouat", { home: 900, office: 700 }],
  ["04", "Oum El Bouaghi", { home: 800, office: 600 }],
  ["05", "Batna", { home: 800, office: 600 }],
  ["06", "Béjaïa", { home: 700, office: 500 }],
  ["07", "Biskra", { home: 900, office: 700 }],
  ["08", "Béchar", { home: 1200, office: 900 }],
  ["09", "Blida", { home: 600, office: 400 }],
  ["10", "Bouira", { home: 700, office: 500 }],
  ["11", "Tamanrasset", { home: 1400, office: 1100 }],
  ["12", "Tébessa", { home: 900, office: 700 }],
  ["13", "Tlemcen", { home: 800, office: 600 }],
  ["14", "Tiaret", { home: 800, office: 600 }],
  ["15", "Tizi Ouzou", { home: 700, office: 500 }],
  ["16", "Alger", { home: 600, office: 400 }],
  ["17", "Djelfa", { home: 900, office: 700 }],
  ["18", "Jijel", { home: 800, office: 600 }],
  ["19", "Sétif", { home: 700, office: 500 }],
  ["20", "Saïda", { home: 900, office: 700 }],
  ["21", "Skikda", { home: 800, office: 600 }],
  ["22", "Sidi Bel Abbès", { home: 800, office: 600 }],
  ["23", "Annaba", { home: 800, office: 600 }],
  ["24", "Guelma", { home: 800, office: 600 }],
  ["25", "Constantine", { home: 800, office: 600 }],
  ["26", "Médéa", { home: 700, office: 500 }],
  ["27", "Mostaganem", { home: 800, office: 600 }],
  ["28", "M'Sila", { home: 800, office: 600 }],
  ["29", "Mascara", { home: 800, office: 600 }],
  ["30", "Ouargla", { home: 1100, office: 800 }],
  ["31", "Oran", { home: 800, office: 600 }],
  ["32", "El Bayadh", { home: 1e3, office: 800 }],
  ["33", "Illizi", { home: 1400, office: 1100 }],
  ["34", "Bordj Bou Arreridj", { home: 700, office: 500 }],
  ["35", "Boumerdès", { home: 600, office: 400 }],
  ["36", "El Tarf", { home: 800, office: 600 }],
  ["37", "Tindouf", { home: 1400, office: 1100 }],
  ["38", "Tissemsilt", { home: 800, office: 600 }],
  ["39", "El Oued", { home: 1e3, office: 800 }],
  ["40", "Khenchela", { home: 900, office: 700 }],
  ["41", "Souk Ahras", { home: 800, office: 600 }],
  ["42", "Tipaza", { home: 600, office: 400 }],
  ["43", "Mila", { home: 800, office: 600 }],
  ["44", "Aïn Defla", { home: 700, office: 500 }],
  ["45", "Naâma", { home: 1e3, office: 800 }],
  ["46", "Aïn Témouchent", { home: 800, office: 600 }],
  ["47", "Ghardaïa", { home: 1e3, office: 800 }],
  ["48", "Relizane", { home: 800, office: 600 }],
  ["49", "Timimoun", { home: 1300, office: 1e3 }],
  ["50", "Bordj Badji Mokhtar", { home: 1400, office: 1100 }],
  ["51", "Ouled Djellal", { home: 900, office: 700 }],
  ["52", "Béni Abbès", { home: 1300, office: 1e3 }],
  ["53", "In Salah", { home: 1400, office: 1100 }],
  ["54", "In Guezzam", { home: 1500, office: 1200 }],
  ["55", "Touggourt", { home: 1e3, office: 800 }],
  ["56", "Djanet", { home: 1500, office: 1200 }],
  ["57", "El M'Ghair", { home: 1e3, office: 800 }],
  ["58", "El Meniaa", { home: 1200, office: 900 }]
];
RAW_WILAYAS.map(([code, name, rates]) => ({
  code,
  name,
  enabled: true,
  rates: { ...DEFAULT_RATES, ...rates ?? {} }
}));
const DELIVERY_METHODS = [
  {
    value: "home",
    label: "Home Delivery",
    description: "Delivered to your door by courier."
  },
  {
    value: "office",
    label: "DHD Office Pickup",
    description: "Pick up your order from the nearest DHD office."
  }
];
function CheckoutPage() {
  return /* @__PURE__ */ jsx(CartProvider, { children: /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Header, {}),
    /* @__PURE__ */ jsx(Checkout, {}),
    /* @__PURE__ */ jsx(CartDrawer, {})
  ] }) });
}
function Checkout() {
  const {
    detailed,
    subtotal,
    clear,
    hasOutOfStock,
    outOfStockItems
  } = useCart();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaCode, setWilayaCode] = useState("");
  const [method, setMethod] = useState("home");
  const [address, setAddress] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [shippingFee, setShippingFee] = useState(null);
  useEffect(() => {
    async function updateFee() {
      const fee = await shippingService.getShippingFee(wilayaCode || null, method);
      setShippingFee(fee);
    }
    updateFee();
  }, [wilayaCode, method]);
  const total = subtotal + (shippingFee ?? 0);
  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!/^[0-9+\s-]{8,}$/.test(phone.trim())) e.phone = "Enter a valid phone number.";
    if (!wilayaCode) e.wilaya = "Please select your Wilaya.";
    if (method === "home" && !address.trim()) e.address = "Address is required.";
    if (method === "office" && !officeLocation.trim()) e.office = "Please enter the DHD office name or location.";
    if (detailed.length === 0) e.cart = "Your cart is empty.";
    if (hasOutOfStock) e.cart = `Some items are out of stock: ${outOfStockItems.map((i) => i.product.name).join(", ")}. Please remove them to continue.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate() || shippingFee == null) return;
    setSubmitting(true);
    try {
      const freshOOS = [];
      for (const d of detailed) {
        const fresh = await productsService.getStorefront(d.product.id);
        if (!fresh || fresh.stock <= 0) {
          freshOOS.push(d.product.name);
        }
      }
      if (freshOOS.length > 0) {
        setErrors((prev) => ({
          ...prev,
          cart: `Some items are out of stock: ${freshOOS.join(", ")}. Please remove them to continue.`
        }));
        setSubmitting(false);
        return;
      }
      const overQty = [];
      for (const d of detailed) {
        const fresh = await productsService.getStorefront(d.product.id);
        if (fresh && d.quantity > fresh.stock) {
          overQty.push(`${d.product.name} (only ${fresh.stock} left, requested ${d.quantity})`);
        }
      }
      if (overQty.length > 0) {
        setErrors((prev) => ({
          ...prev,
          cart: `Requested quantity exceeds available stock: ${overQty.join(", ")}.`
        }));
        setSubmitting(false);
        return;
      }
      const w = await shippingService.get(wilayaCode);
      if (!w) {
        setErrors((prev) => ({
          ...prev,
          wilaya: "Invalid wilaya"
        }));
        setSubmitting(false);
        return;
      }
      const result = await createOrder({
        customer: {
          fullName: fullName.trim(),
          phone: phone.trim()
        },
        delivery: {
          wilayaCode,
          wilayaName: w.name,
          method,
          address: method === "home" ? address.trim() : void 0,
          officeLocation: method === "office" ? officeLocation.trim() : void 0
        },
        items: detailed.map(({
          product,
          quantity
        }) => ({
          id: product.id,
          quantity
        })),
        paymentMethod: "cod",
        notes: void 0
      });
      if (!result.success) {
        setErrors((prev) => ({
          ...prev,
          cart: result.error || "Failed to create order"
        }));
        setSubmitting(false);
        return;
      }
      clear();
      navigate({
        to: "/order-success"
      });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        cart: err instanceof Error ? err.message : "Failed to place order"
      }));
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-5 sm:px-8 py-10 sm:py-14", children: [
    /* @__PURE__ */ jsxs("nav", { "aria-label": "Breadcrumb", className: "flex items-center gap-1.5 text-sm text-muted-foreground mb-3", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "hover:text-foreground transition", children: "Home" }),
      /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5" }),
      /* @__PURE__ */ jsx("span", { className: "text-foreground", children: "Checkout" })
    ] }),
    /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl sm:text-5xl mb-2", children: "Checkout" }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mb-8", children: "Almost there — just a few details for your delivery." }),
    /* @__PURE__ */ jsxs("form", { onSubmit, className: "grid lg:grid-cols-[1fr_420px] gap-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsx(Section, { icon: /* @__PURE__ */ jsx(User, { className: "h-4 w-4" }), title: "Customer Information", children: /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsx(Field, { label: "Full Name", error: errors.fullName, children: /* @__PURE__ */ jsx("input", { value: fullName, onChange: (e) => setFullName(e.target.value), placeholder: "Sara Bensalem", className: inputCls }) }),
          /* @__PURE__ */ jsx(Field, { label: "Phone Number", error: errors.phone, children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Phone, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsx("input", { value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "0555 12 34 56", inputMode: "tel", className: `${inputCls} pl-11` })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsxs(Section, { icon: /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4" }), title: "Delivery Information", children: [
          /* @__PURE__ */ jsx(Field, { label: "Wilaya", error: errors.wilaya, children: /* @__PURE__ */ jsx(WilayaSelect, { value: wilayaCode, onChange: setWilayaCode }) }),
          /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 gap-3 mt-4", children: DELIVERY_METHODS.map((m) => {
            const active = method === m.value;
            return /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setMethod(m.value), className: `text-left p-4 rounded-2xl border transition shadow-[var(--shadow-soft)] ${active ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/40"}`, children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-semibold", children: m.label }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: m.description })
                ] }),
                /* @__PURE__ */ jsx("span", { className: `mt-0.5 grid place-items-center h-5 w-5 rounded-full border ${active ? "border-primary bg-primary" : "border-border"}`, children: active && /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-primary-foreground" }) })
              ] }),
              /* @__PURE__ */ jsx("p", {
  className: "mt-3 text-sm font-medium text-primary",
  children: wilayaCode
    ? formatCurrency(
        shippingService.getShippingFeeSync
          ? shippingService.getShippingFeeSync(wilayaCode, m.value)
          : (
              m.value === "home"
                ? WILAYAS.find(w => w.code === wilayaCode)?.rates.home
                : WILAYAS.find(w => w.code === wilayaCode)?.rates.office
            ) ?? 0
      )
    : "Select a wilaya"
})
            ] }, m.value);
          }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-4", children: method === "home" ? /* @__PURE__ */ jsx(Field, { label: "Full Address", error: errors.address, children: /* @__PURE__ */ jsx("textarea", { value: address, onChange: (e) => setAddress(e.target.value), placeholder: "Street, building, apartment, city…", rows: 3, className: `${inputCls} py-3 resize-none` }) }) : /* @__PURE__ */ jsx(Field, { label: "DHD Office Name / Location", error: errors.office, children: /* @__PURE__ */ jsx("input", { value: officeLocation, onChange: (e) => setOfficeLocation(e.target.value), placeholder: "e.g. DHD Bab Ezzouar", className: inputCls }) }) })
        ] }),
        /* @__PURE__ */ jsx(Section, { icon: /* @__PURE__ */ jsx(Wallet, { className: "h-4 w-4" }), title: "Payment Method", children: /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-3 p-4 rounded-2xl border-2 border-primary bg-secondary cursor-pointer", children: [
          /* @__PURE__ */ jsx("input", { type: "radio", checked: true, readOnly: true, className: "mt-1 accent-primary" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "Cash on Delivery (COD)" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-0.5", children: "Pay when you receive your order." })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("aside", { className: "lg:sticky lg:top-24 self-start", children: /* @__PURE__ */ jsxs("div", { className: "rounded-3xl bg-card border border-border shadow-[var(--shadow-glow)] p-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
          /* @__PURE__ */ jsx(Package, { className: "h-4 w-4 text-primary" }),
          /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl", children: "Order Summary" })
        ] }),
        detailed.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-8", children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mb-4", children: "Your cart is empty." }),
          /* @__PURE__ */ jsx(Link, { to: "/", className: "inline-block px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold", children: "Continue shopping" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("ul", { className: "space-y-3 max-h-72 overflow-y-auto pr-1", children: detailed.map(({
            product,
            quantity
          }) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 items-center", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative shrink-0", children: [
              /* @__PURE__ */ jsx("img", { src: product.image, alt: product.name, className: "h-14 w-14 rounded-xl object-cover border border-border" }),
              /* @__PURE__ */ jsx("span", { className: "absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold grid place-items-center", children: quantity })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate", children: product.name }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                formatCurrency(product.price),
                " × ",
                quantity
              ] })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: formatCurrency(product.price * quantity) })
          ] }, product.id)) }),
          /* @__PURE__ */ jsxs("div", { className: "mt-5 pt-5 border-t border-border space-y-2 text-sm", children: [
            /* @__PURE__ */ jsx(Row, { label: "Subtotal", value: formatCurrency(subtotal) }),
            /* @__PURE__ */ jsx(Row, { label: "Shipping", value: shippingFee == null ? /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Select wilaya" }) : formatCurrency(shippingFee) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 pt-4 border-t border-border flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "font-display text-lg", children: "Total" }),
            /* @__PURE__ */ jsx("span", { className: "font-display text-2xl text-primary", children: formatCurrency(total) })
          ] }),
          errors.cart && /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-destructive", children: errors.cart }),
          /* @__PURE__ */ jsx("button", { type: "submit", disabled: submitting || detailed.length === 0 || hasOutOfStock, className: "mt-6 w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed", children: submitting ? "Placing order…" : "Confirm Order" }),
          /* @__PURE__ */ jsxs("p", { className: "mt-3 text-center text-xs text-muted-foreground", children: [
            "By confirming, you agree to pay ",
            shippingFee != null ? formatCurrency(total) : "the total",
            " in cash upon delivery."
          ] })
        ] })
      ] }) })
    ] })
  ] });
}
const inputCls = "w-full h-12 px-4 rounded-2xl bg-background border border-border shadow-[var(--shadow-soft)] text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring transition";
function Section({
  icon,
  title,
  children
}) {
  return /* @__PURE__ */ jsxs("section", { className: "rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-7", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-5", children: [
      /* @__PURE__ */ jsx("span", { className: "grid place-items-center h-7 w-7 rounded-full bg-accent text-accent-foreground", children: icon }),
      /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl", children: title })
    ] }),
    children
  ] });
}
function Field({
  label,
  error,
  children
}) {
  return /* @__PURE__ */ jsxs("label", { className: "block", children: [
    /* @__PURE__ */ jsx("span", { className: "block text-sm font-medium mb-1.5", children: label }),
    children,
    error && /* @__PURE__ */ jsx("span", { className: "block text-xs text-destructive mt-1.5", children: error })
  ] });
}
function Row({
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("span", { className: "font-medium", children: value })
  ] });
}
function WilayaSelect({
  value,
  onChange
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [wilayas, setWilayas] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadWilayas() {
      const data = await shippingService.list();
      setWilayas(data);
      setLoading(false);
    }
    loadWilayas();
  }, []);
  const selected = wilayas.find((w) => w.code === value);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = wilayas.filter((w) => w.enabled);
    if (!q) return base;
    return base.filter((w) => w.name.toLowerCase().includes(q) || w.code.includes(q));
  }, [query, wilayas]);
  return /* @__PURE__ */ jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setOpen((o) => !o), className: `${inputCls} flex items-center justify-between text-left`, children: [
      /* @__PURE__ */ jsx("span", { className: selected ? "" : "text-muted-foreground/70", children: selected ? `${selected.code} — ${selected.name}` : "Select your wilaya" }),
      /* @__PURE__ */ jsx(ChevronRight, { className: `h-4 w-4 transition ${open ? "rotate-90" : ""}` })
    ] }),
    open && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-30", onClick: () => setOpen(false), "aria-hidden": true }),
      /* @__PURE__ */ jsxs("div", { className: "absolute z-40 mt-2 w-full rounded-2xl bg-popover border border-border shadow-[var(--shadow-glow)] overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 border-b border-border", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsx("input", { autoFocus: true, value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search 58 wilayas…", className: "w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" })
        ] }) }),
        /* @__PURE__ */ jsx("ul", { className: "max-h-64 overflow-y-auto py-1", children: list.length === 0 ? /* @__PURE__ */ jsx("li", { className: "px-4 py-3 text-sm text-muted-foreground", children: "No matches." }) : list.map((w) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => {
          onChange(w.code);
          setOpen(false);
          setQuery("");
        }, className: `w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-secondary transition ${w.code === value ? "bg-secondary" : ""}`, children: [
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground mr-2", children: w.code }),
            w.name
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: formatCurrency(w.rates.home) })
        ] }) }, w.code)) })
      ] })
    ] })
  ] });
}
export {
  CheckoutPage as component
};
