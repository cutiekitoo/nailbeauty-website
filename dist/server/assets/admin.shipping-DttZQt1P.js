import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, LogOut, ArrowLeft, Power, PowerOff, MapPin, CheckCircle2, XCircle, Truck, Search, Pencil, AlertTriangle, ImageOff } from "lucide-react";
import { c as cn, u as useAdminSession, B as Button, a as adminLogout } from "./admin-auth-DUqyDMAG.js";
import { I as Input } from "./input-CXIXWaUi.js";
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell, B as Badge } from "./table-C6Y77OWX.js";
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from "./dialog-B2bMsHe8.js";
import { A as AlertDialog, a as AlertDialogContent, b as AlertDialogHeader, c as AlertDialogTitle, d as AlertDialogDescription, e as AlertDialogFooter, f as AlertDialogCancel, g as AlertDialogAction } from "./alert-dialog-UjM7p2zn.js";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { s as shippingService } from "./shipping-service-OVUuzh5i.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import { toast } from "sonner";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "./client-BIO5L_-k.js";
import "@supabase/supabase-js";
import "@radix-ui/react-dialog";
import "@radix-ui/react-alert-dialog";
const Switch = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SwitchPrimitives.Root,
  {
    className: cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    ),
    ...props,
    ref,
    children: /* @__PURE__ */ jsx(
      SwitchPrimitives.Thumb,
      {
        className: cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )
      }
    )
  }
));
Switch.displayName = SwitchPrimitives.Root.displayName;
function AdminShipping() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    ready,
    session
  } = useAdminSession();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [homePrice, setHomePrice] = useState("");
  const [officePrice, setOfficePrice] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [bulkAction, setBulkAction] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  useEffect(() => {
    if (ready && !isAuthenticated) navigate({
      to: "/admin/login"
    });
  }, [ready, isAuthenticated, navigate]);
  useEffect(() => {
    let mounted = true;
    async function loadItems() {
      const data = await shippingService.list();
      if (mounted) setItems(data);
    }
    loadItems();
    const unsubscribe = shippingService.subscribe(async () => {
      const data = await shippingService.list();
      if (mounted) setItems(data);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((w) => w.enabled).length;
    const disabled = total - active;
    const avg = total > 0 ? items.reduce((s, w) => s + w.rates.home + w.rates.office, 0) / (total * 2) : 0;
    return {
      total,
      active,
      disabled,
      avg
    };
  }, [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((w) => w.name.toLowerCase().includes(q) || w.code.includes(q));
  }, [items, query]);
  const openEdit = (w) => {
    setEditing(w);
    setHomePrice(String(w.rates.home));
    setOfficePrice(String(w.rates.office));
    setEnabled(w.enabled);
    setFormErrors({});
  };
  const validateForm = () => {
    const errors = {};
    const home = Number(homePrice);
    const office = Number(officePrice);
    if (Number.isNaN(home) || home < 0) errors.home = "Home delivery price must be a positive number.";
    if (Number.isNaN(office) || office < 0) errors.office = "Office price must be a positive number.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const saveEdit = async () => {
    if (!editing) return;
    if (!validateForm()) return;
    try {
      await shippingService.update(editing.code, {
        rates: {
          home: Number(homePrice),
          office: Number(officePrice)
        },
        enabled
      });
      setEditing(null);
      toast.success(`${editing.name} shipping rates updated`);
      const data = await shippingService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update shipping rates");
    }
  };
  const confirmBulk = async () => {
    try {
      if (bulkAction === "enable") {
        await shippingService.enableAll();
        toast.success("All wilayas enabled");
      } else if (bulkAction === "disable") {
        await shippingService.disableAll();
        toast.success("All wilayas disabled");
      }
      setBulkAction(null);
      const data = await shippingService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update bulk action");
    }
  };
  const resetToDefaults = async () => {
    try {
      await shippingService.resetToDefaults();
      toast.success("Shipping rates reset to defaults");
      const data = await shippingService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset shipping rates");
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
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-display font-semibold", children: "Shipping Rates" }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1", children: "Manage delivery prices by Wilaya" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "rounded-xl", onClick: () => setBulkAction("enable"), children: [
            /* @__PURE__ */ jsx(Power, { className: "w-4 h-4" }),
            " Enable All"
          ] }),
          /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "rounded-xl", onClick: () => setBulkAction("disable"), children: [
            /* @__PURE__ */ jsx(PowerOff, { className: "w-4 h-4" }),
            " Disable All"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
        /* @__PURE__ */ jsx(StatCard, { icon: MapPin, label: "Total Wilayas", value: stats.total, tone: "bg-accent/40 text-primary" }),
        /* @__PURE__ */ jsx(StatCard, { icon: CheckCircle2, label: "Active Wilayas", value: stats.active, tone: "bg-emerald-100 text-emerald-700" }),
        /* @__PURE__ */ jsx(StatCard, { icon: XCircle, label: "Disabled Wilayas", value: stats.disabled, tone: "bg-rose-100 text-rose-700" }),
        /* @__PURE__ */ jsx(StatCard, { icon: Truck, label: "Avg. Shipping Price", value: formatCurrency(stats.avg), tone: "bg-blue-100 text-blue-700" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 relative", children: [
        /* @__PURE__ */ jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }),
        /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search by wilaya name or code…", className: "pl-9 rounded-xl bg-card" })
      ] }),
      items.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { onCreate: resetToDefaults }) : /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Wilaya" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Home Delivery" }),
          /* @__PURE__ */ jsx(TableHead, { children: "DHD Office" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Status" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "text-center py-10 text-muted-foreground", children: "No wilayas match your search." }) }) : filtered.map((w) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxs(TableCell, { children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: w.name }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
              "Code ",
              w.code
            ] })
          ] }),
          /* @__PURE__ */ jsx(TableCell, { children: formatCurrency(w.rates.home) }),
          /* @__PURE__ */ jsx(TableCell, { children: formatCurrency(w.rates.office) }),
          /* @__PURE__ */ jsx(TableCell, { children: w.enabled ? /* @__PURE__ */ jsx(Badge, { className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 rounded-full", children: "Active" }) : /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "rounded-full", children: "Disabled" }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: () => openEdit(w), "aria-label": "Edit", children: /* @__PURE__ */ jsx(Pencil, { className: "w-4 h-4" }) }) })
        ] }, w.code)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: !!editing, onOpenChange: (o) => {
      if (!o) setEditing(null);
    }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg rounded-2xl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Edit Shipping Rates" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "Update delivery prices for ",
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: editing?.name }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium block mb-1.5", children: "Wilaya Name" }),
          /* @__PURE__ */ jsx(Input, { value: editing?.name ?? "", readOnly: true, className: "rounded-xl bg-muted" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium block mb-1.5", children: "Home Delivery Price (DA)" }),
          /* @__PURE__ */ jsx(Input, { type: "number", min: 0, value: homePrice, onChange: (e) => setHomePrice(e.target.value), className: "rounded-xl" }),
          formErrors.home && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive mt-1", children: formErrors.home })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium block mb-1.5", children: "DHD Office Price (DA)" }),
          /* @__PURE__ */ jsx(Input, { type: "number", min: 0, value: officePrice, onChange: (e) => setOfficePrice(e.target.value), className: "rounded-xl" }),
          formErrors.office && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive mt-1", children: formErrors.office })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-xl border border-border/60 bg-card p-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Enabled" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Allow orders to this wilaya" })
          ] }),
          /* @__PURE__ */ jsx(Switch, { checked: enabled, onCheckedChange: setEnabled })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setEditing(null), children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { onClick: saveEdit, children: "Save Changes" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(AlertDialog, { open: !!bulkAction, onOpenChange: (o) => !o && setBulkAction(null), children: /* @__PURE__ */ jsxs(AlertDialogContent, { className: "rounded-2xl", children: [
      /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxs(AlertDialogTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(AlertTriangle, { className: "w-5 h-5 text-amber-500" }),
          bulkAction === "enable" ? "Enable all wilayas?" : "Disable all wilayas?"
        ] }),
        /* @__PURE__ */ jsx(AlertDialogDescription, { children: bulkAction === "enable" ? "This will enable delivery to every wilaya. Are you sure?" : "This will disable delivery to every wilaya. Customers will not be able to place orders. Are you sure?" })
      ] }),
      /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsx(AlertDialogCancel, { children: "Cancel" }),
        /* @__PURE__ */ jsx(AlertDialogAction, { onClick: confirmBulk, className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: "Confirm" })
      ] })
    ] }) })
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
function EmptyState({
  onCreate
}) {
  return /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-3xl border border-dashed border-border bg-card/60 py-16 px-6 text-center shadow-[var(--shadow-soft)]", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto w-16 h-16 rounded-full bg-accent/40 grid place-items-center text-primary", children: /* @__PURE__ */ jsx(ImageOff, { className: "w-7 h-7" }) }),
    /* @__PURE__ */ jsx("h2", { className: "mt-4 font-display text-2xl", children: "No shipping rates configured." }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-muted-foreground", children: "Create the default shipping configuration to get started." }),
    /* @__PURE__ */ jsx(Button, { onClick: onCreate, className: "mt-5 rounded-xl", children: "Create Shipping Configuration" })
  ] });
}
export {
  AdminShipping as component
};
