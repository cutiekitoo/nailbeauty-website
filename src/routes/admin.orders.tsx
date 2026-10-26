
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LogOut,
  Search,
  Sparkles,
  ArrowLeft,
  Eye,
  Inbox,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ImageOff,
  AlertTriangle,
  Bell,
  MessageCircle,
  Plus,
  Trash2,
  Pencil,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { adminLogout, useAdminSession } from "@/lib/admin-auth";

import {
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/orders";

import { ordersService } from "@/lib/api/orders-service";
import { productsService } from "@/lib/products-service";
import type { Product } from "@/lib/products-service";

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

const fmtDeferredDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
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

  const message = `Bonjour ${customerName} 

Nous vous contactons concernant votre commande ${orderNumber} chez Nail Beauty.

Nous souhaitons confirmer avec vous les informations de votre commande. 

بالعربية:

مرحبًا ${customerName} 

نتواصل معكم بخصوص طلبكم رقم ${orderNumber} من Nail Beauty.

نود التأكد معكم من معلومات طلبكم قبل إرساله. 

شكرًا لثقتكم بنا 

Merci pour votre confiance `;

  const url = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");
};

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  shipped: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  delivered: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelled: "bg-rose-100 text-rose-800 hover:bg-rose-100",
  returned: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  deferred: "bg-violet-100 text-violet-800 hover:bg-violet-100",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const labels: Record<OrderStatus, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    shipped: "Expédiée",
    delivered: "Livrée",
    cancelled: "Annulée",
    returned: "Retour",
    deferred: "Différée",
  };

  return (
    <Badge className={`rounded-full px-2.5 ${statusStyles[status]}`}>
      {labels[status]}
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
    useState<"all" | "new" | OrderStatus>("all");
  const [viewing, setViewing] = useState<Order | null>(null);
  const [orderView, setOrderView] = useState<"regular" | "deferred">("regular");
  const [deferringOrder, setDeferringOrder] = useState<Order | null>(null);
  const [deferredUntil, setDeferredUntil] = useState("");
  const [deferredNote, setDeferredNote] = useState("");
  const [isDeferring, setIsDeferring] = useState(false);

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
      newPending: orders.filter(
        (o) => (o.status ?? "pending") === "pending" && !o.contactStartedAt,
      ).length,
      pending: by("pending"),
      confirmed: by("confirmed"),
      delivered: by("delivered"),
      deferred: by("deferred"),
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((o) => {
      const status = o.status ?? "pending";

      const isNewPending = status === "pending" && !o.contactStartedAt;

      if (orderView === "deferred" && status !== "deferred") {
        return false;
      }
      if (orderView === "regular" && status === "deferred") {
        return false;
      }

      if (statusFilter === "new" && !isNewPending) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        statusFilter !== "new" &&
        status !== statusFilter
      ) {
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
  }, [orders, query, statusFilter, orderView]);

  const markAsContacted = async (order: Order) => {
    if (order.status !== "pending" || order.contactStartedAt) {
      return;
    }

    try {
      await ordersService.markContactStarted(order.id);
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, contactStartedAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `WhatsApp s’est ouvert, mais la prise en charge n’a pas pu être enregistrée : ${err.message}`
          : "WhatsApp s’est ouvert, mais la prise en charge n’a pas pu être enregistrée.",
      );
    }
  };

  const setStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await ordersService.updateStatus(orderId, status);

      toast.success(
        status === "confirmed"
          ? "Commande remise dans la liste de préparation."
          : status === "deferred"
            ? "Commande déplacée dans les commandes différées."
            : `Commande mise à jour : ${status}`,
      );

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

  const startDeferring = (order: Order) => {
    setDeferringOrder(order);
    setDeferredUntil(
      order.status === "deferred" ? order.deferredUntil ?? "" : "",
    );
    setDeferredNote(
      order.status === "deferred" ? order.deferredNote ?? "" : "",
    );
  };

  const saveDeferredOrder = async () => {
    if (!deferringOrder) return;

    if (!deferredNote.trim()) {
      toast.error("Ajoute une note pour ne pas oublier pourquoi cette commande est différée.");
      return;
    }

    setIsDeferring(true);
    try {
      await ordersService.defer(
        deferringOrder.id,
        deferredUntil || null,
        deferredNote,
      );

      const refreshed = await ordersService.list();
      setOrders(refreshed);
      setViewing((current) =>
        current?.id === deferringOrder.id
          ? refreshed.find((item) => item.id === deferringOrder.id) ?? null
          : current,
      );
      toast.success("Commande enregistrée dans les commandes différées.");
      setDeferringOrder(null);
      setDeferredUntil("");
      setDeferredNote("");
      setOrderView("deferred");
      setStatusFilter("all");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de différer cette commande.",
      );
    } finally {
      setIsDeferring(false);
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={Bell}
            label="New Orders"
            value={stats.newPending}
            tone="bg-rose-100 text-rose-700"
          />

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

          <StatCard
            icon={Clock}
            label="Commandes différées"
            value={stats.deferred}
            tone="bg-violet-100 text-violet-700"
          />
        </div>

        {/* Séparer les commandes différées de la liste habituelle à préparer. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={orderView === "regular" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => {
              setOrderView("regular");
              setStatusFilter("all");
            }}
          >
            Commandes habituelles ({orders.filter((o) => o.status !== "deferred").length})
          </Button>
          <Button
            type="button"
            variant={orderView === "deferred" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => {
              setOrderView("deferred");
              setStatusFilter("all");
            }}
          >
            <Clock className="mr-2 h-4 w-4" />
            Commandes différées ({stats.deferred})
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
            onValueChange={(v) => {
              const nextFilter = v as typeof statusFilter;
              setStatusFilter(nextFilter);
              setOrderView(nextFilter === "deferred" ? "deferred" : "regular");
            }}
          >
            <SelectTrigger className="w-full sm:w-48 rounded-xl bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New orders</SelectItem>

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
                  {orderView === "deferred" && (
                    <TableHead>Note / date prévue</TableHead>
                  )}
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={orderView === "deferred" ? 11 : 10}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No orders match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const status = o.status ?? "pending";
                    const isNewPending =
                      status === "pending" && !o.contactStartedAt;
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
                          <span className="inline-flex items-center gap-2">
                            {isNewPending && (
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 ring-2 ring-rose-100"
                                title="Nouvelle commande — cliquez sur WhatsApp pour la marquer comme prise en charge"
                                aria-label="Nouvelle commande"
                              />
                            )}
                            {o.orderNumber}
                          </span>
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

                        {orderView === "deferred" && (
                          <TableCell className="max-w-sm">
                            <p className="whitespace-pre-wrap text-sm">
                              {o.deferredNote || "Aucune note"}
                            </p>
                            {o.deferredUntil && (
                              <p className="mt-1 text-xs font-medium text-violet-700">
                                Envoi prévu le {fmtDeferredDate(o.deferredUntil)}
                              </p>
                            )}
                          </TableCell>
                        )}

                        <TableCell className="text-right">
<div className="flex items-center justify-end gap-2">
  <Button
    size="sm"
    variant="outline"
    className="rounded-lg"
    onClick={() => {
      // Open WhatsApp synchronously so the browser does not block the new tab.
      openWhatsApp(
        o.customer.phone,
        o.customer.fullName,
        o.orderNumber,
      );
      void markAsContacted(o);
    }}
  >
    <MessageCircle className="w-4 h-4 text-emerald-600" />
    <span className="hidden sm:inline">WhatsApp</span>
  </Button>

  {status === "confirmed" && (
    <Button
      size="sm"
      variant="outline"
      className="rounded-lg"
      onClick={() => startDeferring(o)}
    >
      <Clock className="w-4 h-4" />
      <span className="hidden xl:inline">Différer</span>
    </Button>
  )}

  {status === "deferred" && (
    <>
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg"
        onClick={() => startDeferring(o)}
      >
        <Pencil className="w-4 h-4" />
        <span className="hidden xl:inline">Modifier</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg text-violet-700"
        onClick={() => void setStatus(o.id, "confirmed")}
      >
        <CheckCircle2 className="w-4 h-4" />
        <span className="hidden xl:inline">Reprendre</span>
      </Button>
    </>
  )}

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
  onSaved={async (orderId) => {
    const refreshedOrders = await ordersService.list();
    setOrders(refreshedOrders);
    setViewing(
      refreshedOrders.find((item) => item.id === orderId) ?? null
    );
  }}
/>
      <Dialog
        open={!!deferringOrder}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeferring) {
            setDeferringOrder(null);
            setDeferredUntil("");
            setDeferredNote("");
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {deferringOrder?.status === "deferred" ? "Modifier le report" : "Différer la commande"} {deferringOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              La commande quittera la liste habituelle et restera dans « Commandes différées ».
              Son stock réservé ne sera pas modifié.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="deferred-until" className="text-sm font-medium">
                Date prévue d'envoi (facultative)
              </label>
              <Input
                id="deferred-until"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={deferredUntil}
                onChange={(event) => setDeferredUntil(event.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="deferred-note" className="text-sm font-medium">
                Note interne (obligatoire)
              </label>
              <textarea
                id="deferred-note"
                value={deferredNote}
                onChange={(event) => setDeferredNote(event.target.value)}
                placeholder="Ex. : La cliente souhaite un envoi groupé après le prochain arrivage."
                rows={4}
                maxLength={2000}
                className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Cette note est visible dans l'administration uniquement.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={isDeferring}
              onClick={() => {
                setDeferringOrder(null);
                setDeferredUntil("");
                setDeferredNote("");
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={isDeferring || !deferredNote.trim()}
              onClick={() => void saveDeferredOrder()}
            >
              {isDeferring ? "Enregistrement…" : "Enregistrer le report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailsDialog
        order={viewing}
        onClose={() => setViewing(null)}
        onStatusChange={setStatus}
        onSaved={async (orderId) => {
          const refreshedOrders = await ordersService.list();
          setOrders(refreshedOrders);
          setViewing(
            refreshedOrders.find((item) => item.id === orderId) ?? null
          );
        }}
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
  onSaved,
}: {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (
    orderId: string,
    status: OrderStatus,
  ) => void;
  onSaved: (orderId: string) => Promise<void>;
}) {
  type DraftItem = {
    key: string;
    orderItemId?: string;
    productId: string;
    variantId?: string;
    name: string;
    image: string;
    unitPrice: number;
    quantity: number;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addProductId, setAddProductId] = useState("");
  const [addVariantId, setAddVariantId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const open = !!order;
  const current = order?.status ?? "pending";

  const canEditOrder = [
    "pending",
    "confirmed",
    "shipped",
  ].includes(current);

  const draftSubtotal = draft.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  const selectedAddProduct = products.find(
    (product) => product.id === addProductId,
  );

  const productHasVariants =
    (selectedAddProduct?.variants?.length ?? 0) > 0;

  const availableVariants =
    selectedAddProduct?.variants?.filter(
      (variant) => variant.isActive && variant.stock > 0,
    ) ?? [];

  const selectedAddVariant = availableVariants.find(
    (variant) => variant.id === addVariantId,
  );

  const availableProducts = products.filter((product) => {
    if (product.variants?.length) {
      return product.variants.some(
        (variant) => variant.isActive && variant.stock > 0,
      );
    }

    return product.stock > 0;
  });

  const canAddSelectedProduct =
    !!selectedAddProduct &&
    (productHasVariants
      ? !!selectedAddVariant
      : selectedAddProduct.stock > 0);

  const startEditing = async () => {
    if (!order) return;

    // Avoid submitting incomplete order-item references to Supabase.
    if (order.items.some((item) => !item.productId)) {
      toast.error(
        "A product ID is missing from this order. The order cannot be edited safely.",
      );
      return;
    }

    setLoadingProducts(true);

    try {
      const productList = await productsService.listStorefront();

      setProducts(productList);

      setDraft(
        order.items.map((item) => ({
          key: item.id,
          orderItemId: item.id,
          productId: item.productId!,
          variantId: item.variantId,
          name: item.name,
          image: item.image,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      );

      setAddProductId("");
      setAddVariantId("");
      setIsEditing(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load products.",
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const addSelectedProduct = () => {
    if (!selectedAddProduct || !canAddSelectedProduct) {
      toast.error("Select an available product and variant.");
      return;
    }

    const product = selectedAddProduct;
    const variant = selectedAddVariant;

    const productId = product.id;
    const variantId = variant?.id;
    const name = variant
      ? `${product.name} — ${variant.name}`
      : product.name;
    const image = variant?.image || product.image;
    const unitPrice = variant?.price ?? product.price;

    setDraft((existingDraft) => {
      // If this product/variant is already present, increase its quantity.
      const existingIndex = existingDraft.findIndex(
        (item) =>
          item.productId === productId &&
          (item.variantId ?? "") === (variantId ?? ""),
      );

      if (existingIndex !== -1) {
        return existingDraft.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...existingDraft,
        {
          key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          productId,
          variantId,
          name,
          image,
          unitPrice,
          quantity: 1,
        },
      ];
    });

    setAddProductId("");
    setAddVariantId("");
  };

  const updateQuantity = (key: string, value: string) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return;

    setDraft((items) =>
      items.map((item) =>
        item.key === key
          ? {
              ...item,
              quantity: Math.max(1, Math.floor(parsed || 1)),
            }
          : item,
      ),
    );
  };

  const removeItem = (key: string) => {
    setDraft((items) => items.filter((item) => item.key !== key));
  };

  const saveChanges = async () => {
    if (!order) return;

    if (draft.length === 0) {
      toast.error("An order must contain at least one product.");
      return;
    }

    if (
      draft.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1,
      )
    ) {
      toast.error("Check the products and quantities.");
      return;
    }

    setSaving(true);

    try {
      const result = await ordersService.editOrder(
        order.id,
        draft.map((item) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      );

      if (!result.success) {
        throw new Error("Supabase could not update this order.");
      }

      setIsEditing(false);
      toast.success("Order updated successfully.");

      try {
        await onSaved(order.id);
      } catch {
        toast.error(
          "The order was saved, but the page could not refresh. Reload the page to see the latest data.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the order.",
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft([]);
    setAddProductId("");
    setAddVariantId("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setIsEditing(false);
          onClose();
        }
      }}
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
                <Row
                  k="Phone"
                  v={order.customer.phone}
                />
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
                  onValueChange={(value) =>
                    onStatusChange(order.id, value as OrderStatus)
                  }
                >
                  <SelectTrigger className="w-full sm:w-52 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        className="capitalize"
                      >
                        {status}
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
                      onStatusChange(order.id, "confirmed")
                    }
                  />

                  <QuickBtn
                    icon={Truck}
                    label="Ship"
                    disabled={current === "shipped"}
                    onClick={() =>
                      onStatusChange(order.id, "shipped")
                    }
                  />

                  <QuickBtn
                    icon={Package}
                    label="Deliver"
                    disabled={current === "delivered"}
                    onClick={() =>
                      onStatusChange(order.id, "delivered")
                    }
                  />

                  <QuickBtn
                    icon={XCircle}
                    label="Cancel"
                    tone="destructive"
                    disabled={current === "cancelled"}
                    onClick={() =>
                      onStatusChange(order.id, "cancelled")
                    }
                  />
                </div>
              </div>
            </div>

            {/* Ordered products */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-sm">
                  Products Ordered
                </p>

                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={saveChanges}
                        disabled={saving || draft.length === 0}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  ) : (
                    canEditOrder && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startEditing}
                        disabled={loadingProducts}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        {loadingProducts ? "Loading..." : "Edit Order"}
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* Add product controls */}
              {isEditing && (
                <div className="p-4 border-b border-border/60 bg-muted/20 space-y-3">
                  <p className="text-sm font-medium">
                    Add a product
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <Select
                        value={addProductId}
                        onValueChange={(value) => {
                          setAddProductId(value);

                          const product = products.find(
                            (item) => item.id === value,
                          );

                          const firstVariant =
                            product?.variants?.find(
                              (variant) =>
                                variant.isActive &&
                                variant.stock > 0,
                            );

                          setAddVariantId(firstVariant?.id ?? "");
                        }}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>

                        <SelectContent>
                          {availableProducts.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id}
                            >
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-1">
                      <Select
                        value={addVariantId}
                        onValueChange={setAddVariantId}
                        disabled={
                          !selectedAddProduct ||
                          !productHasVariants ||
                          availableVariants.length === 0
                        }
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue
                            placeholder={
                              productHasVariants
                                ? "Select variant"
                                : "No variant needed"
                            }
                          />
                        </SelectTrigger>

                        <SelectContent>
                          {availableVariants.map((variant) => (
                            <SelectItem
                              key={variant.id}
                              value={variant.id}
                            >
                              {variant.name}
                              {variant.code
                                ? ` (${variant.code})`
                                : ""}
                              {" — "}
                              {formatCurrency(variant.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      onClick={addSelectedProduct}
                      disabled={!canAddSelectedProduct}
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    The final price, stock adjustment and delivery fee
                    are validated when you save.
                  </p>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {isEditing && (
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isEditing ? (
                    draft.length > 0 ? (
                      draft.map((item) => (
                        <TableRow key={item.key}>
                          <TableCell>
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>

                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={item.quantity}
                              onChange={(event) =>
                                updateQuantity(
                                  item.key,
                                  event.target.value,
                                )
                              }
                              className="w-20 mx-auto text-center rounded-lg"
                            />
                          </TableCell>

                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>

                          <TableCell className="text-right font-semibold">
                            {formatCurrency(
                              item.unitPrice * item.quantity,
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.key)}
                              aria-label={`Remove ${item.name}`}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No products. Add at least one product before saving.
                        </TableCell>
                      </TableRow>
                    )
                  ) : (
                    order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>

                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>

                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>

                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 text-sm">
              <Row
                k="Subtotal"
                v={formatCurrency(
                  isEditing ? draftSubtotal : order.subtotal,
                )}
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
                  {formatCurrency(
                    (isEditing ? draftSubtotal : order.subtotal) +
                      order.shippingFee,
                  )}
                </span>
              </div>
            </div>

            {current === "deferred" && (
              <InfoCard title="Note de report">
                {order.deferredUntil && (
                  <Row
                    k="Date prévue d'envoi"
                    v={fmtDeferredDate(order.deferredUntil)}
                  />
                )}
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {order.deferredNote || "Aucune note"}
                </p>
              </InfoCard>
            )}

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
