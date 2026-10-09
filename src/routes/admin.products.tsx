import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  ArrowLeft,
  ImageOff,
  Upload,
  X,
  Palette,
  Power,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { adminLogout, useAdminSession } from "@/lib/admin-auth";
import { productsService, type AdminProduct } from "@/lib/products-service";
import {
  productVariantsService,
  type ProductVariant,
} from "@/lib/product-variants-service";
import { imageStorage } from "@/lib/image-storage";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Products — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
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

type VariantForm = {
  id: string;
  productId: string;
  code: string;
  name: string;
  price: string;
  stock: string;
  image: string | null;
  isActive: boolean;
  isNew: boolean;
};

const emptyForm: FormState = {
  name: "",
  price: "",
  stock: "",
  rating: "5",
  shortDescription: "",
  description: "",
  images: [],
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

function toVariantForm(v: ProductVariant): VariantForm {
  return {
    id: v.id,
    productId: v.productId,
    code: v.code,
    name: v.name,
    price: String(v.price),
    stock: String(v.stock),
    image: v.image,
    isActive: v.isActive,
    isNew: false,
  };
}

function createEmptyVariant(productId = ""): VariantForm {
  return {
    id: `new-${crypto.randomUUID()}`,
    productId,
    code: "",
    name: "",
    price: "",
    stock: "0",
    image: null,
    isActive: true,
    isNew: true,
  };
}

function AdminProducts() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, session } = useAdminSession();

  const [items, setItems] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [variantUploadingId, setVariantUploadingId] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const variantFileInputRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({});

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/admin/login" });
    }
  }, [ready, isAuthenticated, navigate]);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      try {
        const data = await productsService.list();

        if (mounted) {
          setItems(data);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load products",
        );
      }
    }

    loadItems();

    const unsubscribe = productsService.subscribe(async () => {
      try {
        const data = await productsService.list();

        if (mounted) {
          setItems(data);
        }
      } catch {
        // Ignore realtime reload errors.
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q);
      const isVisible = p.isVisible ?? true;
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && isVisible) ||
        (visibilityFilter === "hidden" && !isVisible);

      return matchesQuery && matchesVisibility;
    });
  }, [items, query, visibilityFilter]);

  const toggleVisibility = async (product: AdminProduct) => {
    const nextVisibility = !(product.isVisible ?? true);

    try {
      const updated = await productsService.update(product.id, {
        isVisible: nextVisibility,
      });

      if (!updated) {
        throw new Error("Could not update product visibility");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === product.id ? updated : item,
        ),
      );
      toast.success(nextVisibility ? "Product is now visible" : "Product hidden from the store");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update visibility",
      );
    }
  };

  const resetVariantRefs = () => {
    variantFileInputRefs.current = {};
  };

  const openCreate = () => {
    setForm(emptyForm);
    setVariants([]);
    resetVariantRefs();
    setCreating(true);
  };

  const openEdit = async (p: AdminProduct) => {
    setForm(toForm(p));
    setVariants([]);
    resetVariantRefs();
    setEditing(p);
    setVariantsLoading(true);

    try {
      const data = await productVariantsService.listByProduct(p.id);

      setVariants(data.map(toVariantForm));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load variants",
      );
    } finally {
      setVariantsLoading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const urls = await imageStorage.uploadMany(files);

      setForm((f) => ({
        ...f,
        images: [...f.images, ...urls],
      }));

      toast.success(
        `${urls.length} image${urls.length > 1 ? "s" : ""} added`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (idx: number) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
    }));
  };

  const addVariant = () => {
    setVariants((current) => [...current, createEmptyVariant(editing?.id ?? "")]);
  };

  const updateVariant = (
    id: string,
    patch: Partial<VariantForm>,
  ) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === id
          ? { ...variant, ...patch }
          : variant,
      ),
    );
  };

  const removeVariant = (id: string) => {
    setVariants((current) =>
      current.filter((variant) => variant.id !== id),
    );

    delete variantFileInputRefs.current[id];
  };

  const handleVariantImage = async (
    variantId: string,
    file: File | undefined,
  ) => {
    if (!file) {
      return;
    }

    setVariantUploadingId(variantId);

    try {
      const url = await imageStorage.uploadImage(file);

      updateVariant(variantId, {
        image: url,
      });

      toast.success("Variant image added");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Variant image upload failed",
      );
    } finally {
      setVariantUploadingId(null);

      const input = variantFileInputRefs.current[variantId];

      if (input) {
        input.value = "";
      }
    }
  };

  const validateVariants = () => {
    const codes = new Set<string>();

    for (const variant of variants) {
      const code = variant.code.trim();
      const name = variant.name.trim();
      const price = Number(variant.price);
      const stock = Number(variant.stock);

      if (!code) {
        toast.error("Every variant must have a code.");
        return false;
      }

      if (!name) {
        toast.error(`Variant "${code}" must have a name.`);
        return false;
      }

      if (!Number.isFinite(price) || price < 0) {
        toast.error(`Invalid price for variant "${code}".`);
        return false;
      }

      if (!Number.isFinite(stock) || stock < 0) {
        toast.error(`Invalid stock for variant "${code}".`);
        return false;
      }

      const normalizedCode = code.toLowerCase();

      if (codes.has(normalizedCode)) {
        toast.error(`Duplicate variant code: ${code}`);
        return false;
      }

      codes.add(normalizedCode);
    }

    return true;
  };

  const saveVariants = async (productId: string) => {
    if (!validateVariants()) {
      throw new Error("Please correct the variants before saving.");
    }

    const existingVariants = variants.filter((variant) => !variant.isNew);
    const newVariants = variants.filter((variant) => variant.isNew);

    const currentDatabaseVariants =
      await productVariantsService.listByProduct(productId);

    const currentIds = new Set(
      existingVariants.map((variant) => variant.id),
    );

    const removedVariants = currentDatabaseVariants.filter(
      (variant) => !currentIds.has(variant.id),
    );

    for (const variant of removedVariants) {
      await productVariantsService.remove(variant.id);
    }

    for (const variant of existingVariants) {
      await productVariantsService.update(variant.id, {
        code: variant.code.trim(),
        name: variant.name.trim(),
        price: Number(variant.price) || 0,
        stock: Number(variant.stock) || 0,
        image: variant.image ?? null,
        isActive: variant.isActive,
      });
    }

    for (const variant of newVariants) {
      await productVariantsService.create({
        productId,
        code: variant.code.trim(),
        name: variant.name.trim(),
        price: Number(variant.price) || 0,
        stock: Number(variant.stock) || 0,
        image: variant.image ?? null,
        isActive: variant.isActive,
      });
    }
  };

  const saveCreate = async () => {
    if (!form.name.trim()) {
      return toast.error("Product name is required");
    }

    if (!validateVariants()) {
      return;
    }

    try {
      const createdProduct = await productsService.create(fromForm(form));

      if (variants.length > 0) {
        await saveVariants(createdProduct.id);
      }

      setCreating(false);
      setVariants([]);

      toast.success("Product created");

      const data = await productsService.list();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create product",
      );
    }
  };

  const saveEdit = async () => {
    if (!editing) {
      return;
    }

    if (!form.name.trim()) {
      return toast.error("Product name is required");
    }

    if (!validateVariants()) {
      return;
    }

    try {
      await productsService.update(editing.id, fromForm(form));

      await saveVariants(editing.id);

      setEditing(null);
      setVariants([]);

      toast.success("Product updated");

      const data = await productsService.list();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product",
      );
    }
  };

  const closeProductDialog = () => {
    setCreating(false);
    setEditing(null);
    setVariants([]);
    resetVariantRefs();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await productsService.remove(deleteTarget.id);

      setDeleteTarget(null);

      toast.success("Product deleted");

      const data = await productsService.list();
      setItems(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete product",
      );
    }
  };

  if (!ready || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-lg font-semibold"
          >
            Nail Beauty
            <Sparkles className="w-4 h-4 text-primary" />
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {session?.email}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await adminLogout();
                navigate({ to: "/admin/login" });
              }}
              className="rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-semibold">
              Products Management
            </h1>

            <p className="text-muted-foreground mt-1">
              Manage your store products
            </p>
          </div>

          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name…"
              className="pl-9 rounded-xl bg-card"
            />
          </div>

          <div className="flex gap-2 flex-wrap" aria-label="Filter products by visibility">
            {([
              ["all", "All products"],
              ["visible", "Visible"],
              ["hidden", "Hidden"],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={visibilityFilter === value ? "default" : "outline"}
                onClick={() => setVisibilityFilter(value)}
                className="rounded-xl"
              >
                {label}
              </Button>
            ))}
          </div>
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
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {p.images.slice(0, 3).map((src, i) => (
                          <div
                            key={i}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-muted ring-2 ring-card"
                          >
                            <img
                              src={src}
                              alt={`${p.name} ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
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

                    <TableCell className="font-medium">
                      {p.name}
                    </TableCell>

                    <TableCell>{formatCurrency(p.price)}</TableCell>

                    <TableCell>{p.stock}</TableCell>

                    <TableCell>★ {p.rating.toFixed(1)}</TableCell>

                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        {(p.isVisible ?? true) ? (
                          <Badge className="bg-accent/60 text-foreground hover:bg-accent/60">
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                        {p.stock > 0 ? (
                          <Badge className="bg-accent/60 text-foreground hover:bg-accent/60">
                            In Stock
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Out of Stock</Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleVisibility(p)}
                          aria-label={(p.isVisible ?? true) ? "Hide product" : "Show product"}
                          title={(p.isVisible ?? true) ? "Hide product from store" : "Show product in store"}
                        >
                          {(p.isVisible ?? true) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4 text-primary" />
                          )}
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(p)}
                          aria-label="Delete"
                        >
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
        onOpenChange={(o) => {
          if (!o) {
            closeProductDialog();
          }
        }}
      >
        <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Product" : "Add Product"}
            </DialogTitle>

            <DialogDescription>
              {editing
                ? "Update the product details below."
                : "Fill in the details to add a new product."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product Name" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Price (DA)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Stock Quantity">
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stock: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Rating (0–5)">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rating: e.target.value,
                  })
                }
              />
            </Field>

            <Field
              label="Short Description"
              className="sm:col-span-2"
            >
              <Textarea
                rows={2}
                value={form.shortDescription}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shortDescription: e.target.value,
                  })
                }
              />
            </Field>

            <Field
              label="Full Description"
              className="sm:col-span-2"
            >
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
              />
            </Field>

            {/* Product images */}
            <Field
              label="Product Images"
              className="sm:col-span-2"
            >
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
                      <div
                        key={i}
                        className="relative group aspect-square rounded-lg overflow-hidden bg-card border border-border/60"
                      >
                        <img
                          src={src}
                          alt={`upload-${i}`}
                          className="w-full h-full object-cover"
                        />

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
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="rounded-xl"
                  >
                    <Upload className="w-4 h-4" />

                    {uploading
                      ? "Uploading…"
                      : form.images.length
                        ? "Add more images"
                        : "Upload images"}
                  </Button>
                </div>
              </div>
            </Field>

            {/* Variants */}
            <div className="sm:col-span-2 mt-2">
              <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
                <div className="p-4 border-b border-border/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />

                      <h3 className="font-semibold">
                        Variants / Colors
                      </h3>

                      {variants.length > 0 && (
                        <Badge variant="secondary">
                          {variants.length}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      Optional. Use variants for colors, shades, sizes or
                      numbered options.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariant}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variant
                  </Button>
                </div>

                <div className="p-4">
                  {variantsLoading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading variants…
                    </div>
                  ) : variants.length === 0 ? (
                    <div className="py-8 text-center">
                      <Palette className="w-7 h-7 mx-auto text-muted-foreground/60" />

                      <p className="text-sm text-muted-foreground mt-2">
                        No variants for this product.
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        This product will continue using its normal price and
                        stock.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {variants.map((variant, index) => (
                        <div
                          key={variant.id}
                          className="rounded-xl border border-border/60 bg-card p-4"
                        >
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                {index + 1}
                              </span>

                              <span className="font-medium">
                                Variant {index + 1}
                              </span>

                              {variant.isNew && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  New
                                </Badge>
                              )}
                            </div>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                removeVariant(variant.id)
                              }
                              aria-label="Remove variant"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Code">
                              <Input
                                value={variant.code}
                                placeholder="01"
                                onChange={(e) =>
                                  updateVariant(variant.id, {
                                    code: e.target.value,
                                  })
                                }
                              />
                            </Field>

                            <Field label="Name">
                              <Input
                                value={variant.name}
                                placeholder="Rouge"
                                onChange={(e) =>
                                  updateVariant(variant.id, {
                                    name: e.target.value,
                                  })
                                }
                              />
                            </Field>

                            <Field label="Price (DA)">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.price}
                                placeholder={form.price || "700"}
                                onChange={(e) =>
                                  updateVariant(variant.id, {
                                    price: e.target.value,
                                  })
                                }
                              />
                            </Field>

                            <Field label="Stock">
                              <Input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) =>
                                  updateVariant(variant.id, {
                                    stock: e.target.value,
                                  })
                                }
                              />
                            </Field>

                            <Field
                              label="Variant Image"
                              className="sm:col-span-2"
                            >
                              <input
                                ref={(element) => {
                                  variantFileInputRefs.current[
                                    variant.id
                                  ] = element;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleVariantImage(
                                    variant.id,
                                    e.target.files?.[0],
                                  )
                                }
                              />

                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted border border-border/60">
                                  {variant.image ? (
                                    <img
                                      src={variant.image}
                                      alt={variant.name || "Variant"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                      variantUploadingId ===
                                      variant.id
                                    }
                                    onClick={() =>
                                      variantFileInputRefs.current[
                                        variant.id
                                      ]?.click()
                                    }
                                    className="rounded-xl"
                                  >
                                    <Upload className="w-4 h-4" />

                                    {variantUploadingId ===
                                    variant.id
                                      ? "Uploading…"
                                      : variant.image
                                        ? "Change image"
                                        : "Upload image"}
                                  </Button>

                                  <p className="text-xs text-muted-foreground mt-2">
                                    Max 2MB. Uses the existing
                                    product-images bucket.
                                  </p>
                                </div>

                                {variant.image && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateVariant(variant.id, {
                                        image: null,
                                      })
                                    }
                                    className="rounded-xl"
                                  >
                                    <X className="w-4 h-4" />
                                    Remove image
                                  </Button>
                                )}
                              </div>
                            </Field>

                            <div className="sm:col-span-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateVariant(variant.id, {
                                    isActive: !variant.isActive,
                                  })
                                }
                                className="inline-flex items-center gap-2 text-sm"
                              >
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                    variant.isActive
                                      ? "bg-accent/60 text-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <Power className="w-4 h-4" />
                                </span>

                                <span>
                                  {variant.isActive
                                    ? "Variant active"
                                    : "Variant inactive"}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeProductDialog}
            >
              Cancel
            </Button>

            <Button
              onClick={editing ? saveEdit : saveCreate}
              disabled={variantsLoading || uploading}
            >
              {editing ? "Save Changes" : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) =>
          !o && setDeleteTarget(null)
        }
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete product?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium block mb-1.5">
        {label}
      </span>

      {children}
    </label>
  );
}
