import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LogOut, Search, Sparkles, ArrowLeft, Eye, Inbox,
  Package, Clock, CheckCircle2, Truck, XCircle, ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { adminLogout, useAdminSession } from "@/lib/admin-auth";
import {
  ordersService, ORDER_STATUSES, type Order, type OrderStatus,
} from "@/lib/orders";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminOrders,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  processing: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  shipped: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  delivered: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelled: "bg-rose-100 text-rose-800 hover:bg-rose-100",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge className={`capitalize rounded-full px-2.5 ${statusStyles[status]}`}>
      {status}
    </Badge>
  );
}

function AdminOrders() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, session } = useAdminSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [viewing, setViewing] = useState<Order | null>(null);

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/admin/login" });
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
        setViewing((v) => (v ? next.find((o) => o.orderNumber === v.orderNumber) ?? null : null));
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    const by = (s: OrderStatus) => orders.filter((o) => (o.status ?? "pending") === s).length;
    return {
      total: orders.length,
      pending: by("pending"),
      processing: by("processing"),
      delivered: by("delivered"),
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const status = o.status ?? "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.phone.toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const setStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await ordersService.updateStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
      // Reload orders
      const data = await ordersService.list();
      setOrders(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
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

        <div>
          <h1 className="text-3xl font-display font-semibold">Orders Management</h1>
          <p className="text-muted-foreground mt-1">View and manage customer orders</p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Package} label="Total Orders" value={stats.total} tone="bg-accent/40 text-primary" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} tone="bg-amber-100 text-amber-700" />
          <StatCard icon={CheckCircle2} label="Processing" value={stats.processing} tone="bg-blue-100 text-blue-700" />
          <StatCard icon={Truck} label="Delivered" value={stats.delivered} tone="bg-emerald-100 text-emerald-700" />
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order #, customer name or phone…"
              className="pl-9 rounded-xl bg-card"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table or empty */}
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Wilaya</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      No orders match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => (
                    <TableRow key={o.orderNumber}>
                      <TableCell className="font-medium">{o.orderNumber}</TableCell>
                      <TableCell>{o.customer.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{o.customer.phone}</TableCell>
                      <TableCell>{o.delivery.wilayaName}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {o.delivery.method === "home" ? "Home" : "DHD Office"}
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(o.total)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{fmtDate(o.createdAt)}</TableCell>
                      <TableCell><StatusBadge status={o.status ?? "pending"} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setViewing(o)}>
                          <Eye className="w-4 h-4" /> View
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

      <OrderDetailsDialog
        order={viewing}
        onClose={() => setViewing(null)}
        onStatusChange={setStatus}
      />
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Package; label: string; value: number; tone: string;
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

function EmptyState() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 py-16 px-6 text-center shadow-[var(--shadow-soft)]">
      <div className="mx-auto w-16 h-16 rounded-full bg-accent/40 grid place-items-center text-primary">
        <Inbox className="w-7 h-7" />
      </div>
      <h2 className="mt-4 font-display text-2xl">No customer orders yet.</h2>
      <p className="mt-1 text-muted-foreground">
        Orders placed by customers will appear here.
      </p>
    </div>
  );
}

function OrderDetailsDialog({
  order, onClose, onStatusChange,
}: {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}) {
  const open = !!order;
  const current = order?.status ?? "pending";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl rounded-2xl max-h-[92vh] overflow-y-auto">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 flex-wrap">
                <span>Order {order.orderNumber}</span>
                <StatusBadge status={current} />
              </DialogTitle>
              <DialogDescription>{fmtDate(order.createdAt)}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard title="Customer">
                <Row k="Full Name" v={order.customer.fullName} />
                <Row k="Phone" v={order.customer.phone} />
              </InfoCard>
              <InfoCard title="Delivery">
                <Row k="Wilaya" v={`${order.delivery.wilayaCode} — ${order.delivery.wilayaName}`} />
                <Row k="Method" v={order.delivery.method === "home" ? "Home Delivery" : "DHD Office Pickup"} />
                {order.delivery.address && <Row k="Address" v={order.delivery.address} />}
                {order.delivery.officeLocation && <Row k="Office" v={order.delivery.officeLocation} />}
              </InfoCard>
            </div>

            {/* Status update */}
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-sm font-medium mb-2">Update Status</p>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Select value={current} onValueChange={(v) => onStatusChange(order.id, v as OrderStatus)}>
                  <SelectTrigger className="w-full sm:w-52 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <QuickBtn icon={CheckCircle2} label="Process" disabled={current === "processing"} onClick={() => onStatusChange(order.id, "processing")} />
                  <QuickBtn icon={Truck} label="Ship" disabled={current === "shipped"} onClick={() => onStatusChange(order.id, "shipped")} />
                  <QuickBtn icon={Package} label="Deliver" disabled={current === "delivered"} onClick={() => onStatusChange(order.id, "delivered")} />
                  <QuickBtn icon={XCircle} label="Cancel" tone="destructive" disabled={current === "cancelled"} onClick={() => onStatusChange(order.id, "cancelled")} />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 font-medium text-sm">Products Ordered</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-center">{it.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(it.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 text-sm">
              <Row k="Subtotal" v={formatCurrency(order.subtotal)} />
              <Row k="Shipping Fee" v={formatCurrency(order.shippingFee)} />
              <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                <span className="font-display text-lg">Total</span>
                <span className="font-display text-2xl text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {order.notes && (
              <InfoCard title="Order Notes">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
              </InfoCard>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-sm font-medium mb-2">{title}</p>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

function QuickBtn({
  icon: Icon, label, onClick, disabled, tone,
}: {
  icon: typeof Package; label: string; onClick: () => void; disabled?: boolean;
  tone?: "destructive";
}) {
  return (
    <Button
      size="sm"
      variant={tone === "destructive" ? "outline" : "outline"}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl ${tone === "destructive" ? "text-destructive hover:text-destructive" : ""}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </Button>
  );
}
