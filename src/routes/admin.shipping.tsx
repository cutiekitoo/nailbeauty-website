import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LogOut, Search, Sparkles, ArrowLeft, Pencil, MapPin,
  Truck, CheckCircle2, XCircle, AlertTriangle, ImageOff,
  PowerOff, Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { adminLogout, useAdminSession } from "@/lib/admin-auth";
import { shippingService } from "@/lib/shipping-service";
import { type WilayaConfig } from "@/lib/shipping-config";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping")({
  head: () => ({ meta: [{ title: "Shipping Rates — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminShipping,
});

function AdminShipping() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, session } = useAdminSession();
  const [items, setItems] = useState<WilayaConfig[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<WilayaConfig | null>(null);
  const [homePrice, setHomePrice] = useState("");
  const [officePrice, setOfficePrice] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [bulkAction, setBulkAction] = useState<"enable" | "disable" | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/admin/login" });
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
    const avg =
      total > 0
        ? items.reduce((s, w) => s + w.rates.home + w.rates.office, 0) / (total * 2)
        : 0;
    return { total, active, disabled, avg };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (w) => w.name.toLowerCase().includes(q) || w.code.includes(q),
    );
  }, [items, query]);

  const openEdit = (w: WilayaConfig) => {
    setEditing(w);
    setHomePrice(String(w.rates.home));
    setOfficePrice(String(w.rates.office));
    setEnabled(w.enabled);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
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
          office: Number(officePrice),
        },
        enabled,
      });
      setEditing(null);
      toast.success(`${editing.name} shipping rates updated`);
      // Reload items
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
      // Reload items
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
      // Reload items
      const data = await shippingService.list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset shipping rates");
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
            <h1 className="text-3xl font-display font-semibold">Shipping Rates</h1>
            <p className="text-muted-foreground mt-1">Manage delivery prices by Wilaya</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setBulkAction("enable")}>
              <Power className="w-4 h-4" /> Enable All
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setBulkAction("disable")}>
              <PowerOff className="w-4 h-4" /> Disable All
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={MapPin} label="Total Wilayas" value={stats.total} tone="bg-accent/40 text-primary" />
          <StatCard icon={CheckCircle2} label="Active Wilayas" value={stats.active} tone="bg-emerald-100 text-emerald-700" />
          <StatCard icon={XCircle} label="Disabled Wilayas" value={stats.disabled} tone="bg-rose-100 text-rose-700" />
          <StatCard icon={Truck} label="Avg. Shipping Price" value={formatCurrency(stats.avg)} tone="bg-blue-100 text-blue-700" />
        </div>

        {/* Search */}
        <div className="mt-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by wilaya name or code…"
            className="pl-9 rounded-xl bg-card"
          />
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <EmptyState onCreate={resetToDefaults} />
        ) : (
          <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wilaya</TableHead>
                  <TableHead>Home Delivery</TableHead>
                  <TableHead>DHD Office</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No wilayas match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((w) => (
                    <TableRow key={w.code}>
                      <TableCell>
                        <div className="font-medium">{w.name}</div>
                        <div className="text-xs text-muted-foreground">Code {w.code}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(w.rates.home)}</TableCell>
                      <TableCell>{formatCurrency(w.rates.office)}</TableCell>
                      <TableCell>
                        {w.enabled ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 rounded-full">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(w)} aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Shipping Rates</DialogTitle>
            <DialogDescription>
              Update delivery prices for <span className="font-medium">{editing?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Wilaya Name</label>
              <Input value={editing?.name ?? ""} readOnly className="rounded-xl bg-muted" />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Home Delivery Price (DA)</label>
              <Input
                type="number"
                min={0}
                value={homePrice}
                onChange={(e) => setHomePrice(e.target.value)}
                className="rounded-xl"
              />
              {formErrors.home && <p className="text-xs text-destructive mt-1">{formErrors.home}</p>}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">DHD Office Price (DA)</label>
              <Input
                type="number"
                min={0}
                value={officePrice}
                onChange={(e) => setOfficePrice(e.target.value)}
                className="rounded-xl"
              />
              {formErrors.office && <p className="text-xs text-destructive mt-1">{formErrors.office}</p>}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">Allow orders to this wilaya</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk confirmation */}
      <AlertDialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {bulkAction === "enable" ? "Enable all wilayas?" : "Disable all wilayas?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "enable"
                ? "This will enable delivery to every wilaya. Are you sure?"
                : "This will disable delivery to every wilaya. Customers will not be able to place orders. Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulk} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone,
}: {
  icon: typeof MapPin; label: string; value: string | number; tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-display font-semibold">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 py-16 px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="mx-auto w-16 h-16 rounded-full bg-accent/40 grid place-items-center text-primary">
        <ImageOff className="w-7 h-7" />
      </div>
      <h2 className="mt-4 font-display text-2xl">No shipping rates configured.</h2>
      <p className="mt-1 text-muted-foreground">
        Create the default shipping configuration to get started.
      </p>
      <Button onClick={onCreate} className="mt-5 rounded-xl">
        Create Shipping Configuration
      </Button>
    </div>
  );
}
