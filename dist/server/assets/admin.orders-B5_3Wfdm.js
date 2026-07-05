import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Check, ChevronUp, Sparkles, LogOut, ArrowLeft, Package, Clock, CheckCircle2, Truck, Search, Eye, Inbox, XCircle, ImageOff } from "lucide-react";
import { c as cn, u as useAdminSession, B as Button, a as adminLogout } from "./admin-auth-C6DyuYew.js";
import { I as Input } from "./input-DZhQ6KEX.js";
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell, B as Badge } from "./table-CCwNpkI2.js";
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription } from "./dialog-x6hXr_3P.js";
import * as SelectPrimitive from "@radix-ui/react-select";
import { o as ordersService, O as ORDER_STATUSES } from "./orders-CFCCWJLf.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import { toast } from "sonner";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "./client-oLxEsiRw.js";
import "@supabase/supabase-js";
import "@radix-ui/react-dialog";
const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Trigger,
  {
    ref,
    className: cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(SelectPrimitive.Icon, { asChild: true, children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" }) })
    ]
  }
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollUpButton,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
  }
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollDownButton,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
  }
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
  SelectPrimitive.Content,
  {
    ref,
    className: cn(
      "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)",
      position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      className
    ),
    position,
    ...props,
    children: [
      /* @__PURE__ */ jsx(SelectScrollUpButton, {}),
      /* @__PURE__ */ jsx(
        SelectPrimitive.Viewport,
        {
          className: cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          ),
          children
        }
      ),
      /* @__PURE__ */ jsx(SelectScrollDownButton, {})
    ]
  }
) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Label,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold", className),
    ...props
  }
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })
    ]
  }
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
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
  return /* @__PURE__ */ jsx(Badge, { className: `capitalize rounded-full px-2.5 ${statusStyles[status]}`, children: status });
}
function AdminOrders() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    ready,
    session
  } = useAdminSession();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState(null);
  useEffect(() => {
    if (ready && !isAuthenticated) navigate({
      to: "/admin/login"
    });
  }, [ready, isAuthenticated, navigate]);
  useEffect(() => {
    let mounted = true;
    async function loadOrders() {
      const data = await ordersService.list();
      if (mounted) setOrders(data);
    }
    loadOrders();
    const unsubscribe = ordersService.subscribe(async () => {
      const next = await ordersService.list();
      if (mounted) {
        setOrders(next);
        setViewing((v) => v ? next.find((o) => o.orderNumber === v.orderNumber) ?? null : null);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const stats = useMemo(() => {
    const by = (s) => orders.filter((o) => (o.status ?? "pending") === s).length;
    return {
      total: orders.length,
      pending: by("pending"),
      processing: by("processing"),
      delivered: by("delivered")
    };
  }, [orders]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const status = o.status ?? "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return o.orderNumber.toLowerCase().includes(q) || o.customer.fullName.toLowerCase().includes(q) || o.customer.phone.toLowerCase().includes(q);
    });
  }, [orders, query, statusFilter]);
  const setStatus = async (orderId, status) => {
    try {
      await ordersService.updateStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
      const data = await ordersService.list();
      setOrders(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
    }
  };
  if (!ready || !isAuthenticated) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center text-muted-foreground", children: "Loading…" });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-border/60 bg-card/70 backdrop-blur", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 font-display text-lg font-semibold", children: [
        "Nail Beauty ",
        /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 text-primary" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline text-sm text-muted-foreground", children: session?.email }),
        /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: async () => {
          await adminLogout();
          navigate({
            to: "/admin/login"
          });
        }, className: "rounded-xl", children: [
          /* @__PURE__ */ jsx(LogOut, { className: "w-4 h-4" }),
          " Logout"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/admin", className: "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { className: "w-4 h-4" }),
        " Back to dashboard"
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-display font-semibold", children: "Orders Management" }),
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1", children: "View and manage customer orders" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
        /* @__PURE__ */ jsx(StatCard, { icon: Package, label: "Total Orders", value: stats.total, tone: "bg-accent/40 text-primary" }),
        /* @__PURE__ */ jsx(StatCard, { icon: Clock, label: "Pending", value: stats.pending, tone: "bg-amber-100 text-amber-700" }),
        /* @__PURE__ */ jsx(StatCard, { icon: CheckCircle2, label: "Processing", value: stats.processing, tone: "bg-blue-100 text-blue-700" }),
        /* @__PURE__ */ jsx(StatCard, { icon: Truck, label: "Delivered", value: stats.delivered, tone: "bg-emerald-100 text-emerald-700" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-col gap-3 sm:flex-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
          /* @__PURE__ */ jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search by order #, customer name or phone…", className: "pl-9 rounded-xl bg-card" })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: statusFilter, onValueChange: (v) => setStatusFilter(v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-full sm:w-48 rounded-xl bg-card", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Status" }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All statuses" }),
            ORDER_STATUSES.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s, className: "capitalize", children: s }, s))
          ] })
        ] })
      ] }),
      orders.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {}) : /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Order #" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Customer" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Phone" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Wilaya" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Delivery" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Total" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Date" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Status" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 9, className: "text-center py-10 text-muted-foreground", children: "No orders match your filters." }) }) : filtered.map((o) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: o.orderNumber }),
          /* @__PURE__ */ jsx(TableCell, { children: o.customer.fullName }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground", children: o.customer.phone }),
          /* @__PURE__ */ jsx(TableCell, { children: o.delivery.wilayaName }),
          /* @__PURE__ */ jsx(TableCell, { className: "capitalize text-muted-foreground", children: o.delivery.method === "home" ? "Home" : "DHD Office" }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-semibold", children: formatCurrency(o.total) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground text-xs", children: fmtDate(o.createdAt) }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(StatusBadge, { status: o.status ?? "pending" }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", className: "rounded-lg", onClick: () => setViewing(o), children: [
            /* @__PURE__ */ jsx(Eye, { className: "w-4 h-4" }),
            " View"
          ] }) })
        ] }, o.orderNumber)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(OrderDetailsDialog, { order: viewing, onClose: () => setViewing(null), onStatusChange: setStatus })
  ] });
}
function StatCard({
  icon: Icon,
  label,
  value,
  tone
}) {
  return /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: label }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-display font-semibold", children: value })
    ] }),
    /* @__PURE__ */ jsx("div", { className: `w-10 h-10 rounded-xl grid place-items-center ${tone}`, children: /* @__PURE__ */ jsx(Icon, { className: "w-5 h-5" }) })
  ] }) });
}
function EmptyState() {
  return /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-3xl border border-dashed border-border bg-card/60 py-16 px-6 text-center shadow-[var(--shadow-soft)]", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto w-16 h-16 rounded-full bg-accent/40 grid place-items-center text-primary", children: /* @__PURE__ */ jsx(Inbox, { className: "w-7 h-7" }) }),
    /* @__PURE__ */ jsx("h2", { className: "mt-4 font-display text-2xl", children: "No customer orders yet." }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-muted-foreground", children: "Orders placed by customers will appear here." })
  ] });
}
function OrderDetailsDialog({
  order,
  onClose,
  onStatusChange
}) {
  const open = !!order;
  const current = order?.status ?? "pending";
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: (o) => !o && onClose(), children: /* @__PURE__ */ jsx(DialogContent, { className: "max-w-3xl rounded-2xl max-h-[92vh] overflow-y-auto", children: order && /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-3 flex-wrap", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "Order ",
          order.orderNumber
        ] }),
        /* @__PURE__ */ jsx(StatusBadge, { status: current })
      ] }),
      /* @__PURE__ */ jsx(DialogDescription, { children: fmtDate(order.createdAt) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(InfoCard, { title: "Customer", children: [
        /* @__PURE__ */ jsx(Row, { k: "Full Name", v: order.customer.fullName }),
        /* @__PURE__ */ jsx(Row, { k: "Phone", v: order.customer.phone })
      ] }),
      /* @__PURE__ */ jsxs(InfoCard, { title: "Delivery", children: [
        /* @__PURE__ */ jsx(Row, { k: "Wilaya", v: `${order.delivery.wilayaCode} — ${order.delivery.wilayaName}` }),
        /* @__PURE__ */ jsx(Row, { k: "Method", v: order.delivery.method === "home" ? "Home Delivery" : "DHD Office Pickup" }),
        order.delivery.address && /* @__PURE__ */ jsx(Row, { k: "Address", v: order.delivery.address }),
        order.delivery.officeLocation && /* @__PURE__ */ jsx(Row, { k: "Office", v: order.delivery.officeLocation })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-4", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium mb-2", children: "Update Status" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3 sm:items-center", children: [
        /* @__PURE__ */ jsxs(Select, { value: current, onValueChange: (v) => onStatusChange(order.id, v), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-full sm:w-52 rounded-xl", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: ORDER_STATUSES.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s, className: "capitalize", children: s }, s)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsx(QuickBtn, { icon: CheckCircle2, label: "Process", disabled: current === "processing", onClick: () => onStatusChange(order.id, "processing") }),
          /* @__PURE__ */ jsx(QuickBtn, { icon: Truck, label: "Ship", disabled: current === "shipped", onClick: () => onStatusChange(order.id, "shipped") }),
          /* @__PURE__ */ jsx(QuickBtn, { icon: Package, label: "Deliver", disabled: current === "delivered", onClick: () => onStatusChange(order.id, "delivered") }),
          /* @__PURE__ */ jsx(QuickBtn, { icon: XCircle, label: "Cancel", tone: "destructive", disabled: current === "cancelled", onClick: () => onStatusChange(order.id, "cancelled") })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "px-4 py-3 border-b border-border/60 font-medium text-sm", children: "Products Ordered" }),
      /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { className: "w-16", children: "Image" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Product" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Qty" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Unit" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Total" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: order.items.map((it) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center", children: it.image ? /* @__PURE__ */ jsx("img", { src: it.image, alt: it.name, className: "w-full h-full object-cover" }) : /* @__PURE__ */ jsx(ImageOff, { className: "w-4 h-4 text-muted-foreground" }) }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: it.name }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-center", children: it.quantity }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: formatCurrency(it.unitPrice) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-right font-semibold", children: formatCurrency(it.lineTotal) })
        ] }, it.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-4 space-y-2 text-sm", children: [
      /* @__PURE__ */ jsx(Row, { k: "Subtotal", v: formatCurrency(order.subtotal) }),
      /* @__PURE__ */ jsx(Row, { k: "Shipping Fee", v: formatCurrency(order.shippingFee) }),
      /* @__PURE__ */ jsxs("div", { className: "pt-2 mt-2 border-t border-border flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { className: "font-display text-lg", children: "Total" }),
        /* @__PURE__ */ jsx("span", { className: "font-display text-2xl text-primary", children: formatCurrency(order.total) })
      ] })
    ] }),
    order.notes && /* @__PURE__ */ jsx(InfoCard, { title: "Order Notes", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground whitespace-pre-wrap", children: order.notes }) })
  ] }) }) });
}
function InfoCard({
  title,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-4", children: [
    /* @__PURE__ */ jsx("p", { className: "text-sm font-medium mb-2", children: title }),
    /* @__PURE__ */ jsx("div", { className: "space-y-1.5 text-sm", children })
  ] });
}
function Row({
  k,
  v
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
    /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: k }),
    /* @__PURE__ */ jsx("span", { className: "font-medium text-right", children: v })
  ] });
}
function QuickBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone
}) {
  return /* @__PURE__ */ jsxs(Button, { size: "sm", variant: tone === "destructive" ? "outline" : "outline", disabled, onClick, className: `rounded-xl ${tone === "destructive" ? "text-destructive hover:text-destructive" : ""}`, children: [
    /* @__PURE__ */ jsx(Icon, { className: "w-4 h-4" }),
    " ",
    label
  ] });
}
export {
  AdminOrders as component
};
