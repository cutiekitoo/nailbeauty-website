import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LogOut, Search, Sparkles, ArrowLeft, Eye, Inbox,
  Package, Clock, CheckCircle2, Truck, XCircle, ImageOff,
  AlertTriangle, Bell, MessageCircle,
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
import {
  getShipmentTrackingInfo,
  formatRemainingTime,
  type ShipmentTrackingOrder,
} from "@/lib/shipment-tracking-service";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrders,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });


const openWhatsApp = (
  phone: string,
  customerName: string,
  orderNumber: string,
) => {
  const digits = phone.replace(/\D/g, "");

  let internationalPhone = digits;

  if (digits.startsWith("0")) {
    internationalPhone = `213${digits.slice(1)}`;
  } else if (digits.startsWith("213")) {
    internationalPhone = digits;
  } else {
    internationalPhone = `213${digits}`;
  }

  const flower = String.fromCodePoint(0x1F338);
  const nails = String.fromCodePoint(0x1F485);
  const sparkle = String.fromCodePoint(0x2728);
  const heart = String.fromCodePoint(0x1F90D);

  const message = `Bonjour ${customerName} ${flower}

Nous vous contactons concernant votre commande ${orderNumber} chez Nail Beauty.

Nous souhaitons confirmer avec vous les informations de votre commande. ${nails}${sparkle}

بالعربية:

مرحبًا ${customerName} ${flower}

نتواصل معكم بخصوص طلبكم رقم ${orderNumber} من Nail Beauty.

نود التأكد معكم من معلومات طلبكم قبل إرساله. ${nails}${sparkle}

شكرًا لثقتكم بنا ${heart}

Merci pour votre confiance ${heart}`;

  console.log("Message WhatsApp :", message);

  const url = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
};

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
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
;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | OrderStatus>("all");
  const [viewing, setViewing] = useState<Order | null>(null);

  // Shipment tracking
  const [shippedOrders, setShippedOrders] = useState<
    ShipmentTrackingOrder[]
  >([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate({ to: "/admin/login" });
    }
  }, [ready, isAuthenticated, navigate]);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      const data = await ordersService.list();

      if (mounted) {
        setOrders(data);
      }
    }

    loadOrders();

    const unsubscribe = ordersService.subscribe(async () => {
      const next = await ordersService.list();

      if (mounted) {
        setOrders(next);
        setViewing((v) =>
          v
            ? next.find((o) => o.orderNumber === v.orderNumber) ?? null
            : null,
        );
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Load currently shipped orders for tracking
  useEffect(() => {
    let mounted = true;

    async function loadShipmentTracking() {
      try {
        const data = await import("@/lib/shipment-tracking-service").then(
          (module) => module.getShippedOrders(),
        );

        if (mounted) {
          setShippedOrders(data);
        }
      } catch (error) {
        console.error("Failed to load shipment tracking:", error);
      }
    }

    loadShipmentTracking();

    const interval = window.setInterval(() => {
      loadShipmentTracking();
    }, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [orders]);

  // Update countdown every second
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const shipmentByOrderNumber = useMemo(() => {
    const map = new Map<string, ShipmentTrackingOrder>();

    for (const order of shippedOrders) {
      map.set(order.orderNumber, order);
    }

    return map;
  }, [shippedOrders]);

  const contactOrders = shippedOrders.filter((shipment) => {
    const tracking = getShipmentTrackingInfo(shipment.shippedAt, now);
    return tracking.isDueForContact;
  });

  const stats = useMemo(() => {
    const by = (s: OrderStatus) =>
      orders.filter((o) => (o.status ?? "pending") === s).length;

    return {
      total: orders.length,
      pending: by("pending"),
      confirmed: by("confirmed"),
      delivered: by("delivered"),
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((o) => {
      const status = o.status ?? "pending";

      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }

      if (!q) {
        return true;
      }

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

      const data = await ordersService.list();
      setOrders(data);

      // Refresh shipment tracking immediately after a status change
      try {
        const shipped = await import(
          "@/lib/shipment-tracking-service"
        ).then((module) => module.getShippedOrders());

        setShippedOrders(shipped);
      } catch (trackingError) {
        console.error(
          "Failed to refresh shipment tracking:",
          trackingError,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update order status",
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

  {/* Notifications */}
  <div className="relative">
    <button
      type="button"
      onClick={() => setIsNotificationOpen((open) => !open)}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background transition hover:bg-muted"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />

      {contactOrders.length > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {contactOrders.length > 99 ? "99+" : contactOrders.length}
        </span>
      )}
    </button>

    {isNotificationOpen && (
      <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              Commandes à contacter
            </p>
          </div>

          {contactOrders.length > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
              {contactOrders.length}
            </span>
          )}
        </div>

        {contactOrders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              Aucune notification
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aucune commande n'est à contacter pour le moment.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {contactOrders.map((shipment) => {
              const tracking = getShipmentTrackingInfo(
                shipment.shippedAt,
                now,
              );

              return (
                <button
                  key={shipment.id}
                  type="button"
                  onClick={() => {
                    const order = orders.find(
                      (item) =>
                        item.orderNumber === shipment.orderNumber,
                    );

                    setIsNotificationOpen(false);

                    if (order) {
                      setViewing(order);
                    }
                  }}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition last:border-b-0 hover:bg-muted/50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {shipment.orderNumber}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Expédiée il y a {tracking.elapsedDays} jour
                      {tracking.elapsedDays > 1 ? "s" : ""}
                    </p>

                    <p className="mt-1 text-xs font-medium text-amber-700">
                      À contacter
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    )}
  </div>

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

        <div>
          <h1 className="text-3xl font-display font-semibold">
            Orders Management
          </h1>

          <p className="text-muted-foreground mt-1">
            View and manage customer orders
          </p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Package}
            label="Total Orders"
            value={stats.total}
            tone="bg-accent/40 text-primary"
          />

          <StatCard
            icon={Clock}
            label="Pending"
            value={stats.pending}
            tone="bg-amber-100 text-amber-700"
          />

          <StatCard
            icon={CheckCircle2}
            label="Confirmed"
            value={stats.confirmed}
            tone="bg-blue-100 text-blue-700"
          />

          <StatCard
            icon={Truck}
            label="Delivered"
            value={stats.delivered}
            tone="bg-emerald-100 text-emerald-700"
          />
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

          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as typeof statusFilter)
            }
          >
            <SelectTrigger className="w-full sm:w-48 rounded-xl bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>

              {ORDER_STATUSES.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="capitalize"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
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
                  <TableHead>Collection</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No orders match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const status = o.status ?? "pending";
                    const shipment = shipmentByOrderNumber.get(
                      o.orderNumber,
                    );

                    const tracking = shipment
                      ? getShipmentTrackingInfo(
                          shipment.shippedAt,
                          now,
                        )
                      : null;

                    return (
                      <TableRow key={o.orderNumber}>
                        <TableCell className="font-medium">
                          {o.orderNumber}
                        </TableCell>

                        <TableCell>
                          {o.customer.fullName}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {o.customer.phone}
                        </TableCell>

                        <TableCell>
                          {o.delivery.wilayaName}
                        </TableCell>

                        <TableCell className="capitalize text-muted-foreground">
                          {o.delivery.method === "home"
                            ? "Home"
                            : "DHD Office"}
                        </TableCell>

                        <TableCell className="font-semibold">
                          {formatCurrency(o.total)}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs">
                          {fmtDate(o.createdAt)}
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={status} />
                        </TableCell>

                        <TableCell>
                          {status === "shipped" && tracking ? (
                            <div className="flex flex-col gap-1 min-w-[130px]">
                              {tracking.isExpired ? (
                                <Badge className="w-fit rounded-full bg-rose-100 text-rose-800 hover:bg-rose-100">
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                  Délai dépassé
                                </Badge>
                              ) : tracking.isDueForContact ? (
                                <Badge className="w-fit rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                  À contacter
                                </Badge>
                              ) : (
                                <span className="font-medium text-sm">
                                  {formatRemainingTime(
                                    tracking.remainingMs,
                                  )}
                                </span>
                              )}

                              <span className="text-xs text-muted-foreground">
                                Expédiée le{" "}
                                {fmtDate(shipment?.shippedAt ?? "")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
<div className="flex items-center justify-end gap-2">
  <Button
    size="sm"
    variant="outline"
    className="rounded-lg"
    onClick={() =>
      openWhatsApp(
        o.customer.phone,
        o.customer.fullName,
        o.orderNumber,
      )
    }
  >
    <MessageCircle className="w-4 h-4 text-emerald-600" />
    <span className="hidden sm:inline">WhatsApp</span>
  </Button>

  <Button
    size="sm"
    variant="outline"
    className="rounded-lg"
    onClick={() => setViewing(o)}
  >
    <Eye className="w-4 h-4" />
    View
  </Button>
</div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-display font-semibold">
            {value}
          </p>
        </div>

        <div
          className={`w-10 h-10 rounded-xl grid place-items-center ${tone}`}
        >
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

      <h2 className="mt-4 font-display text-2xl">
        No customer orders yet.
      </h2>

      <p className="mt-1 text-muted-foreground">
        Orders placed by customers will appear here.
      </p>
    </div>
  );
}

function OrderDetailsDialog({
  order,
  onClose,
  onStatusChange,
}: {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (
    orderId: string,
    status: OrderStatus,
  ) => void;
}) {
  const open = !!order;
  const current = order?.status ?? "pending";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
    >
      <DialogContent className="max-w-3xl rounded-2xl max-h-[92vh] overflow-y-auto">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 flex-wrap">
                <span>Order {order.orderNumber}</span>
                <StatusBadge status={current} />
              </DialogTitle>

              <DialogDescription>
                {fmtDate(order.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard title="Customer">
                <Row
                  k="Full Name"
                  v={order.customer.fullName}
                />
                <Row k="Phone" v={order.customer.phone} />
              </InfoCard>

              <InfoCard title="Delivery">
                <Row
                  k="Wilaya"
                  v={`${order.delivery.wilayaCode} — ${order.delivery.wilayaName}`}
                />

                <Row
                  k="Method"
                  v={
                    order.delivery.method === "home"
                      ? "Home Delivery"
                      : "DHD Office Pickup"
                  }
                />

                {order.delivery.address && (
                  <Row
                    k="Address"
                    v={order.delivery.address}
                  />
                )}

                {order.delivery.officeLocation && (
                  <Row
                    k="Office"
                    v={order.delivery.officeLocation}
                  />
                )}
              </InfoCard>
            </div>

            {/* Status update */}
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-sm font-medium mb-2">
                Update Status
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Select
                  value={current}
                  onValueChange={(v) =>
                    onStatusChange(
                      order.id,
                      v as OrderStatus,
                    )
                  }
                >
                  <SelectTrigger className="w-full sm:w-52 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="capitalize"
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  <QuickBtn
                    icon={CheckCircle2}
                    label="Confirm"
                    disabled={current === "confirmed"}
                    onClick={() =>
                      onStatusChange(
                        order.id,
                        "confirmed",
                      )
                    }
                  />

                  <QuickBtn
                    icon={Truck}
                    label="Ship"
                    disabled={current === "shipped"}
                    onClick={() =>
                      onStatusChange(
                        order.id,
                        "shipped",
                      )
                    }
                  />

                  <QuickBtn
                    icon={Package}
                    label="Deliver"
                    disabled={current === "delivered"}
                    onClick={() =>
                      onStatusChange(
                        order.id,
                        "delivered",
                      )
                    }
                  />

                  <QuickBtn
                    icon={XCircle}
                    label="Cancel"
                    tone="destructive"
                    disabled={current === "cancelled"}
                    onClick={() =>
                      onStatusChange(
                        order.id,
                        "cancelled",
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 font-medium text-sm">
                Products Ordered
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">
                      Image
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">
                      Qty
                    </TableHead>
                    <TableHead className="text-right">
                      Unit
                    </TableHead>
                    <TableHead className="text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {order.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt={it.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-medium">
                        {it.name}
                      </TableCell>

                      <TableCell className="text-center">
                        {it.quantity}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatCurrency(it.unitPrice)}
                      </TableCell>

                      <TableCell className="text-right font-semibold">
                        {formatCurrency(it.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 text-sm">
              <Row
                k="Subtotal"
                v={formatCurrency(order.subtotal)}
              />

              <Row
                k="Shipping Fee"
                v={formatCurrency(order.shippingFee)}
              />

              <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                <span className="font-display text-lg">
                  Total
                </span>

                <span className="font-display text-2xl text-primary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {order.notes && (
              <InfoCard title="Order Notes">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {order.notes}
                </p>
              </InfoCard>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-sm font-medium mb-2">
        {title}
      </p>

      <div className="space-y-1.5 text-sm">
        {children}
      </div>
    </div>
  );
}

function Row({
  k,
  v,
}: {
  k: string;
  v: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">
        {k}
      </span>

      <span className="font-medium text-right">
        {v}
      </span>
    </div>
  );
}

function QuickBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: typeof Package;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "destructive";
}) {
  return (
    <Button
      size="sm"
      variant={tone === "destructive" ? "outline" : "outline"}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl ${
        tone === "destructive"
          ? "text-destructive hover:text-destructive"
          : ""
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Button>
  );
}
