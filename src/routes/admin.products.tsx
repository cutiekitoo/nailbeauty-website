import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Plus, Pencil, Trash2, Search, Sparkles, ArrowLeft, ImageOff, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { adminLogout, useAdminSession } from "@/lib/admin-auth";
import { productsService, type AdminProduct } from "@/lib/products-service";
import { imageStorage } from "@/lib/image-storage";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Products — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminProducts,
});

type FormState = {
  name: string;
  price: string;
  stock: string;
  rating: string;
  shortDescription: string;
  description: string;
  images: string[];
};

const emptyForm: FormState = {
  name: "", price: "", stock: "", rating: "5",
  shortDescription: "", description: "", images: [],
};

function toForm(p: AdminProduct): FormState {
  return {
    name: p.name,
    price: String(p.price),
    stock: String(p.stock),
    rating: String(p.rating),
    shortDescription: p.shortDescription,
    description: p.description,
    images: [...p.images],
  };
}

function fromForm(f: FormState) {
  return {
    name: f.name.trim(),
    price: Number(f.price) || 0,
    stock: Number(f.stock) || 0,
    rating: Math.max(0, Math.min(5, Number(f.rating) || 0)),
    shortDescription: f.shortDescription.trim(),
    description: f.description.trim(),
    images: f.images,
  };
}

function AdminProducts() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, session } = useAdminSession();
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/admin/login" });
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

  const openCreate = () => { setForm(emptyForm); setCreating(true); };
  const openEdit = (p: AdminProduct) => { setForm(toForm(p)); setEditing(p); };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await imageStorage.uploadMany(files);
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const saveCreate = async () => {
    if (!form.name.trim()) return toast.error("Product name is required");
    try {
      await productsService.create(fromForm(form));
      setCreating(false);
      toast.success("Product created");
      // Reload items
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
      // Reload items
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
      // Reload items
      const data = await productsService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  if (!ready || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-lg font-semibold">
            Nail Beauty <Sparkles className="w-4 h-4 text-primary" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">{session?.email}</span>
            <Button variant="outline" size="sm" onClick={async () => { await adminLogout(); navigate({ to: "/admin/login" }); }} className="rounded-xl">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold">Products Management</h1>
            <p className="text-muted-foreground mt-1">Manage your store products</p>
          </div>
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        <div className="mt-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name…"
            className="pl-9 rounded-xl bg-card"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Images</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {p.images.slice(0, 3).map((src, i) => (
                          <div key={i} className="w-10 h-10 rounded-lg overflow-hidden bg-muted ring-2 ring-card">
                            <img src={src} alt={`${p.name} ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {p.images.length === 0 && (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <ImageOff className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        {p.images.length > 3 && (
                          <div className="w-10 h-10 rounded-lg bg-muted ring-2 ring-card flex items-center justify-center text-xs font-medium">
                            +{p.images.length - 3}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{formatCurrency(p.price)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>★ {p.rating.toFixed(1)}</TableCell>
                    <TableCell>
                      {p.stock > 0 ? (
                        <Badge className="bg-accent/60 text-foreground hover:bg-accent/60">In Stock</Badge>
                      ) : (
                        <Badge variant="destructive">Out of Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(p)} aria-label="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Create / Edit modal */}
      <Dialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
      >
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the product details below." : "Fill in the details to add a new product."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product Name" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Price (DA)">
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
            <Field label="Stock Quantity">
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </Field>
            <Field label="Rating (0–5)">
              <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
            </Field>
            <Field label="Short Description" className="sm:col-span-2">
              <Textarea rows={2} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
            </Field>
            <Field label="Full Description" className="sm:col-span-2">
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>

            <Field label="Product Images" className="sm:col-span-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-4">
                {form.images.length === 0 ? (
                  <div className="text-center py-6">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload one or more product images (max 2MB each).
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {form.images.map((src, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-card border border-border/60">
                        <img src={src} alt={`upload-${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          aria-label="Remove image"
                          className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-background/90 text-foreground shadow hover:bg-destructive hover:text-destructive-foreground transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading…" : form.images.length ? "Add more images" : "Upload images"}
                  </Button>
                </div>
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={editing ? saveEdit : saveCreate}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">{deleteTarget?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
