import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, LogOut, ArrowLeft, Plus, Search, ImageOff, Pencil, Trash2, Upload, X } from "lucide-react";
import { c as cn, u as useAdminSession, B as Button, a as adminLogout } from "./admin-auth-DUqyDMAG.js";
import { I as Input } from "./input-CXIXWaUi.js";
import { T as Table, a as TableHeader, b as TableRow, c as TableHead, d as TableBody, e as TableCell, B as Badge } from "./table-C6Y77OWX.js";
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from "./dialog-B2bMsHe8.js";
import { A as AlertDialog, a as AlertDialogContent, b as AlertDialogHeader, c as AlertDialogTitle, d as AlertDialogDescription, e as AlertDialogFooter, f as AlertDialogCancel, g as AlertDialogAction } from "./alert-dialog-UjM7p2zn.js";
import { p as productsService } from "./products-service-iZC0U1m_.js";
import { s as supabase } from "./client-BIO5L_-k.js";
import { f as formatCurrency } from "./currency-DaVuagTJ.js";
import { toast } from "sonner";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-dialog";
import "@radix-ui/react-alert-dialog";
import "@supabase/supabase-js";
const Textarea = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "textarea",
      {
        className: cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Textarea.displayName = "Textarea";
const MAX_BYTES = 2 * 1024 * 1024;
const BUCKET_NAME = "product-images";
function generateFileName(file) {
  const ext = file.name.split(".").pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}
const imageStorage = {
  async uploadImage(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Image must be smaller than 2MB");
    }
    const fileName = generateFileName(file);
    const filePath = `${fileName}`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });
    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return publicUrl;
  },
  async uploadMany(files) {
    const arr = Array.from(files);
    return Promise.all(arr.map((f) => this.uploadImage(f)));
  },
  async deleteImage(imageUrl) {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const filePath = pathParts[pathParts.length - 1];
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  },
  async deleteMany(urls) {
    await Promise.all(urls.map((url) => this.deleteImage(url)));
  },
  getPublicUrl(path) {
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return publicUrl;
  }
};
const emptyForm = {
  name: "",
  price: "",
  stock: "",
  rating: "5",
  shortDescription: "",
  description: "",
  images: []
};
function toForm(p) {
  return {
    name: p.name,
    price: String(p.price),
    stock: String(p.stock),
    rating: String(p.rating),
    shortDescription: p.shortDescription,
    description: p.description,
    images: [...p.images]
  };
}
function fromForm(f) {
  return {
    name: f.name.trim(),
    price: Number(f.price) || 0,
    stock: Number(f.stock) || 0,
    rating: Math.max(0, Math.min(5, Number(f.rating) || 0)),
    shortDescription: f.shortDescription.trim(),
    description: f.description.trim(),
    images: f.images
  };
}
function AdminProducts() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    ready,
    session
  } = useAdminSession();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  useEffect(() => {
    if (ready && !isAuthenticated) navigate({
      to: "/admin/login"
    });
  }, [ready, isAuthenticated, navigate]);
  useEffect(() => {
    let mounted = true;
    async function loadItems() {
      const data = await productsService.list();
      if (mounted) setItems(data);
    }
    loadItems();
    const unsubscribe = productsService.subscribe(async () => {
      const data = await productsService.list();
      if (mounted) setItems(data);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [items, query]);
  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
  };
  const openEdit = (p) => {
    setForm(toForm(p));
    setEditing(p);
  };
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await imageStorage.uploadMany(files);
      setForm((f) => ({
        ...f,
        images: [...f.images, ...urls]
      }));
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const removeImage = (idx) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx)
    }));
  };
  const saveCreate = async () => {
    if (!form.name.trim()) return toast.error("Product name is required");
    try {
      await productsService.create(fromForm(form));
      setCreating(false);
      toast.success("Product created");
      const data = await productsService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create product");
    }
  };
  const saveEdit = async () => {
    if (!editing) return;
    if (!form.name.trim()) return toast.error("Product name is required");
    try {
      await productsService.update(editing.id, fromForm(form));
      setEditing(null);
      toast.success("Product updated");
      const data = await productsService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product");
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await productsService.remove(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Product deleted");
      const data = await productsService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product");
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
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-display font-semibold", children: "Products Management" }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1", children: "Manage your store products" })
        ] }),
        /* @__PURE__ */ jsxs(Button, { onClick: openCreate, className: "rounded-xl", children: [
          /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" }),
          " Add Product"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 relative", children: [
        /* @__PURE__ */ jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }),
        /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Search by product name…", className: "pl-9 rounded-xl bg-card" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { className: "w-24", children: "Images" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Name" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Price" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Stock" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Rating" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Status" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "text-center py-10 text-muted-foreground", children: "No products found." }) }) : filtered.map((p) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex -space-x-2", children: [
            p.images.slice(0, 3).map((src, i) => /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-lg overflow-hidden bg-muted ring-2 ring-card", children: /* @__PURE__ */ jsx("img", { src, alt: `${p.name} ${i + 1}`, className: "w-full h-full object-cover" }) }, i)),
            p.images.length === 0 && /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-lg bg-muted flex items-center justify-center", children: /* @__PURE__ */ jsx(ImageOff, { className: "w-4 h-4 text-muted-foreground" }) }),
            p.images.length > 3 && /* @__PURE__ */ jsxs("div", { className: "w-10 h-10 rounded-lg bg-muted ring-2 ring-card flex items-center justify-center text-xs font-medium", children: [
              "+",
              p.images.length - 3
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: p.name }),
          /* @__PURE__ */ jsx(TableCell, { children: formatCurrency(p.price) }),
          /* @__PURE__ */ jsx(TableCell, { children: p.stock }),
          /* @__PURE__ */ jsxs(TableCell, { children: [
            "★ ",
            p.rating.toFixed(1)
          ] }),
          /* @__PURE__ */ jsx(TableCell, { children: p.stock > 0 ? /* @__PURE__ */ jsx(Badge, { className: "bg-accent/60 text-foreground hover:bg-accent/60", children: "In Stock" }) : /* @__PURE__ */ jsx(Badge, { variant: "destructive", children: "Out of Stock" }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs("div", { className: "inline-flex gap-1", children: [
            /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: () => openEdit(p), "aria-label": "Edit", children: /* @__PURE__ */ jsx(Pencil, { className: "w-4 h-4" }) }),
            /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: () => setDeleteTarget(p), "aria-label": "Delete", children: /* @__PURE__ */ jsx(Trash2, { className: "w-4 h-4 text-destructive" }) })
          ] }) })
        ] }, p.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: creating || !!editing, onOpenChange: (o) => {
      if (!o) {
        setCreating(false);
        setEditing(null);
      }
    }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Edit Product" : "Add Product" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: editing ? "Update the product details below." : "Fill in the details to add a new product." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsx(Field, { label: "Product Name", className: "sm:col-span-2", children: /* @__PURE__ */ jsx(Input, { value: form.name, onChange: (e) => setForm({
          ...form,
          name: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Price (DA)", children: /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: form.price, onChange: (e) => setForm({
          ...form,
          price: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Stock Quantity", children: /* @__PURE__ */ jsx(Input, { type: "number", value: form.stock, onChange: (e) => setForm({
          ...form,
          stock: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Rating (0–5)", children: /* @__PURE__ */ jsx(Input, { type: "number", step: "0.1", min: "0", max: "5", value: form.rating, onChange: (e) => setForm({
          ...form,
          rating: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Short Description", className: "sm:col-span-2", children: /* @__PURE__ */ jsx(Textarea, { rows: 2, value: form.shortDescription, onChange: (e) => setForm({
          ...form,
          shortDescription: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Full Description", className: "sm:col-span-2", children: /* @__PURE__ */ jsx(Textarea, { rows: 4, value: form.description, onChange: (e) => setForm({
          ...form,
          description: e.target.value
        }) }) }),
        /* @__PURE__ */ jsxs(Field, { label: "Product Images", className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", multiple: true, className: "hidden", onChange: (e) => handleFiles(e.target.files) }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-dashed border-border/80 bg-muted/30 p-4", children: [
            form.images.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-6", children: [
              /* @__PURE__ */ jsx(Upload, { className: "w-6 h-6 mx-auto text-muted-foreground" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-2", children: "Upload one or more product images (max 2MB each)." })
            ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-3", children: form.images.map((src, i) => /* @__PURE__ */ jsxs("div", { className: "relative group aspect-square rounded-lg overflow-hidden bg-card border border-border/60", children: [
              /* @__PURE__ */ jsx("img", { src, alt: `upload-${i}`, className: "w-full h-full object-cover" }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => removeImage(i), "aria-label": "Remove image", className: "absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-background/90 text-foreground shadow hover:bg-destructive hover:text-destructive-foreground transition", children: /* @__PURE__ */ jsx(X, { className: "w-3.5 h-3.5" }) })
            ] }, i)) }),
            /* @__PURE__ */ jsx("div", { className: "mt-3 flex justify-center", children: /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", disabled: uploading, onClick: () => fileInputRef.current?.click(), className: "rounded-xl", children: [
              /* @__PURE__ */ jsx(Upload, { className: "w-4 h-4" }),
              uploading ? "Uploading…" : form.images.length ? "Add more images" : "Upload images"
            ] }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => {
          setCreating(false);
          setEditing(null);
        }, children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { onClick: editing ? saveEdit : saveCreate, children: "Save Product" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(AlertDialog, { open: !!deleteTarget, onOpenChange: (o) => !o && setDeleteTarget(null), children: /* @__PURE__ */ jsxs(AlertDialogContent, { className: "rounded-2xl", children: [
      /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsx(AlertDialogTitle, { children: "Delete product?" }),
        /* @__PURE__ */ jsxs(AlertDialogDescription, { children: [
          "Are you sure you want to delete ",
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: deleteTarget?.name }),
          "? This action cannot be undone."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsx(AlertDialogCancel, { children: "Cancel" }),
        /* @__PURE__ */ jsx(AlertDialogAction, { onClick: confirmDelete, className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: "Delete" })
      ] })
    ] }) })
  ] });
}
function Field({
  label,
  children,
  className = ""
}) {
  return /* @__PURE__ */ jsxs("label", { className: `block ${className}`, children: [
    /* @__PURE__ */ jsx("span", { className: "text-sm font-medium block mb-1.5", children: label }),
    children
  ] });
}
export {
  AdminProducts as component
};
