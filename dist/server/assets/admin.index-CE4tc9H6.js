import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, LogOut, Clock, ShoppingBag, CheckCircle2, MapPin, TrendingUp, Inbox, Eye, Package, Truck } from "lucide-react";
import { u as useAdminSession, B as Button, a as adminLogout } from "./admin-auth-DUqyDMAG.js";
import { B as Badge, T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell } from "./table-C6Y77OWX.js";
import { o as ordersService } from "./orders-CtpbliHr.js";
import { s as shippingService } from "./shipping-service-OVUuzh5i.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "./client-BIO5L_-k.js";
import "@supabase/supabase-js";
const formatDate = (iso) => new Date(iso).toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});
const statusStyles = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  processing: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  shipped: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  delivered: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelled: "bg-rose-100 text-rose-800 hover:bg-rose-100"
};
function StatusBadge({
  status
}) {
  return /* @__PURE__ */ jsx(Badge, { className: `capitalize rounded-full px-2.5 font-normal shadow-none ${statusStyles[status]}`, variant: "secondary", children: status });
}
function AdminDashboard() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    ready,
    session
  } = useAdminSession();
  const [orders, setOrders] = useState([]);
  const [activeWilayasCount, setActiveWilayasCount] = useState(0);
  useEffect(() => {
    if (ready && !isAuthenticated) navigate({
      to: "/admin/login"
    });
  }, [ready, isAuthenticated, navigate]);
  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const sync = async () => {
      const ordersData = await ordersService.list();
      const shippingData = await shippingService.list();
      if (mounted) {
        setOrders(ordersData);
        setActiveWilayasCount(shippingData.filter((w) => w.enabled).length);
      }
    };
    sync();
    const unsubOrders = ordersService.subscribe(sync);
    const unsubShipping = shippingService.subscribe(sync);
    return () => {
      mounted = false;
      unsubOrders();
      unsubShipping();
    };
  }, [isAuthenticated]);
  const stats = useMemo(() => {
    const delivered = orders.filter((o) => (o.status ?? "pending") === "delivered");
    return {
      total: orders.length,
      pending: orders.filter((o) => (o.status ?? "pending") === "pending").length,
      delivered: delivered.length,
      revenue: delivered.reduce((acc, o) => acc + o.total, 0),
      activeWilayas: activeWilayasCount
    };
  }, [orders, activeWilayasCount]);
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [orders]);
  const handleLogout = async () => {
    await adminLogout();
    navigate({
      to: "/admin/login"
    });
  };
  if (!ready || !isAuthenticated) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center text-muted-foreground", children: "Loading…" });
  }
  const navTiles = [{
    icon: Package,
    label: "Products",
    desc: "Manage catalog",
    to: "/admin/products"
  }, {
    icon: ShoppingBag,
    label: "Orders",
    desc: "View customer orders",
    to: "/admin/orders"
  }, {
    icon: Truck,
    label: "Shipping",
    desc: "Wilayas & delivery rates",
    to: "/admin/shipping"
  }];
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen pb-20", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-50", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 font-display text-lg font-semibold", children: [
        "Nail Beauty ",
        /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 text-primary" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline text-sm text-muted-foreground", children: session?.email }),
        /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: handleLogout, className: "rounded-xl", children: [
          /* @__PURE__ */ jsx(LogOut, { className: "w-4 h-4" }),
          " Logout"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "max-w-6xl mx-auto px-4 sm:px-6 py-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-end justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-display font-semibold text-foreground", children: "Dashboard" }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1 text-lg", children: "Store performance overview" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 px-3 py-1.5 rounded-full border border-border/40", children: [
          /* @__PURE__ */ jsx(Clock, { className: "w-4 h-4" }),
          "Live data active"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5", children: [
        /* @__PURE__ */ jsx(StatCard, { icon: ShoppingBag, label: "Total Orders", value: stats.total, tone: "bg-blue-50 text-blue-600 border-blue-100" }),
        /* @__PURE__ */ jsx(StatCard, { icon: Clock, label: "Pending Orders", value: stats.pending, tone: "bg-amber-50 text-amber-600 border-amber-100" }),
        /* @__PURE__ */ jsx(StatCard, { icon: CheckCircle2, label: "Delivered Orders", value: stats.delivered, tone: "bg-emerald-50 text-emerald-600 border-emerald-100" }),
        /* @__PURE__ */ jsx(StatCard, { icon: MapPin, label: "Active Wilayas", value: stats.activeWilayas, tone: "bg-lavender/50 text-accent-foreground border-accent/40" }),
        /* @__PURE__ */ jsx(StatCard, { icon: TrendingUp, label: "Total Revenue", value: formatCurrency(stats.revenue), tone: "bg-primary/5 text-primary border-primary/10" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-10 grid lg:grid-cols-3 gap-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("h2", { className: "text-xl font-semibold flex items-center gap-2", children: [
              "Recent Orders",
              /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "rounded-full px-2 font-normal", children: recentOrders.length })
            ] }),
            /* @__PURE__ */ jsx(Link, { to: "/admin/orders", className: "text-sm font-medium text-primary hover:underline", children: "View all orders" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden", children: recentOrders.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-12 text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "mx-auto w-12 h-12 rounded-full bg-accent/40 grid place-items-center text-primary mb-3", children: /* @__PURE__ */ jsx(Inbox, { className: "w-6 h-6" }) }),
            /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "No orders yet" })
          ] }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/30", children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Order" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Customer" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Total" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Status" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Date" }),
              /* @__PURE__ */ jsx(TableHead, { className: "text-right whitespace-nowrap", children: "View" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: recentOrders.map((o) => /* @__PURE__ */ jsxs(TableRow, { className: "hover:bg-accent/5 transition-colors", children: [
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: o.orderNumber }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ jsx("span", { className: "text-sm", children: o.customer.fullName }),
                /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: o.delivery.wilayaName })
              ] }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "font-semibold whitespace-nowrap", children: formatCurrency(o.total) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(StatusBadge, { status: o.status ?? "pending" }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-xs text-muted-foreground whitespace-nowrap", children: formatDate(o.createdAt) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", className: "h-8 w-8 rounded-full", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/admin/orders", children: /* @__PURE__ */ jsx(Eye, { className: "w-4 h-4" }) }) }) })
            ] }, o.orderNumber)) })
          ] }) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
          /* @__PURE__ */ jsxs("section", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold mb-4", children: "Quick Links" }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: navTiles.map((t) => /* @__PURE__ */ jsxs(Link, { to: t.to, className: "flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-all group", children: [
              /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors", children: /* @__PURE__ */ jsx(t.icon, { className: "w-5 h-5" }) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "font-semibold", children: t.label }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: t.desc })
              ] })
            ] }, t.label)) })
          ] }),
          /* @__PURE__ */ jsxs("section", { className: "p-5 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-accent/20", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4", children: "Market Coverage" }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-3xl font-display font-semibold", children: stats.activeWilayas }),
                /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Active Wilayas" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-[spin_3s_linear_infinite] flex items-center justify-center", children: /* @__PURE__ */ jsx(Truck, { className: "w-5 h-5 text-primary" }) })
            ] }),
            /* @__PURE__ */ jsx(Button, { variant: "link", className: "px-0 mt-4 h-auto text-primary", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/admin/shipping", children: "Manage coverage →" }) })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function StatCard({
  icon: Icon,
  label,
  value,
  tone
}) {
  return /* @__PURE__ */ jsxs("div", { className: `rounded-2xl border p-5 shadow-sm transition-transform hover:scale-[1.02] ${tone}`, children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center border border-current/10", children: /* @__PURE__ */ jsx(Icon, { className: "w-5 h-5" }) }) }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium opacity-80", children: label }),
      /* @__PURE__ */ jsx("p", { className: "text-2xl font-display font-semibold mt-1 whitespace-nowrap", children: value })
    ] })
  ] });
}
export {
  AdminDashboard as component
};
