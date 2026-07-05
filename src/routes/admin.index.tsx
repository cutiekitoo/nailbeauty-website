import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, type ElementType } from "react";
import { 
  LogOut, Package, ShoppingBag, Truck, Sparkles, 
  Clock, CheckCircle2, TrendingUp, Inbox, Eye, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell 
} from "@/components/ui/table";
import { adminLogout, useAdminSession } from "@/lib/admin-auth";
import { ordersService, type Order, type OrderStatus } from "@/lib/orders";
import { shippingService } from "@/lib/shipping-service";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Nail Beauty" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
    <Badge className={`capitalize rounded-full px-2.5 font-normal shadow-none ${statusStyles[status]}`} variant="secondary">
      {status}
    </Badge>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, ready, session } = useAdminSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeWilayasCount, setActiveWilayasCount] = useState(0);

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/admin/login" });
  }, [ready, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;
    const sync = async () => {
      const ordersData = await ordersService.list();
      const shippingData = await shippingService.list();
      if (mounted) {
        setOrders(ordersData);
        setActiveWilayasCount(shippingData.filter(w => w.enabled).length);
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
    const delivered = orders.filter(o => (o.status ?? "pending") === "delivered");
    return {
      total: orders.length,
      pending: orders.filter(o => (o.status ?? "pending") === "pending").length,
      delivered: delivered.length,
      revenue: delivered.reduce((acc, o) => acc + o.total, 0),
      activeWilayas: activeWilayasCount,
    };
  }, [orders, activeWilayasCount]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [orders],
  );

  const handleLogout = async () => {
    await adminLogout();
    navigate({ to: "/admin/login" });
  };

  if (!ready || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const navTiles = [
    { icon: Package, label: "Products", desc: "Manage catalog", to: "/admin/products" as const },
    { icon: ShoppingBag, label: "Orders", desc: "View customer orders", to: "/admin/orders" as const },
    { icon: Truck, label: "Shipping", desc: "Wilayas & delivery rates", to: "/admin/shipping" as const },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-lg font-semibold">
            Nail Beauty <Sparkles className="w-4 h-4 text-primary" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">{session?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-xl">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-lg">Store performance overview</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 px-3 py-1.5 rounded-full border border-border/40">
            <Clock className="w-4 h-4" />
            Live data active
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard 
            icon={ShoppingBag} 
            label="Total Orders" 
            value={stats.total} 
            tone="bg-blue-50 text-blue-600 border-blue-100" 
          />
          <StatCard 
            icon={Clock} 
            label="Pending Orders" 
            value={stats.pending} 
            tone="bg-amber-50 text-amber-600 border-amber-100" 
          />
          <StatCard 
            icon={CheckCircle2} 
            label="Delivered Orders" 
            value={stats.delivered} 
            tone="bg-emerald-50 text-emerald-600 border-emerald-100" 
          />
          <StatCard 
            icon={MapPin} 
            label="Active Wilayas" 
            value={stats.activeWilayas} 
            tone="bg-lavender/50 text-accent-foreground border-accent/40" 
          />
          <StatCard 
            icon={TrendingUp} 
            label="Total Revenue" 
            value={formatCurrency(stats.revenue)} 
            tone="bg-primary/5 text-primary border-primary/10" 
          />
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-8">
          {/* Main Content: Recent Orders */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Recent Orders
                <Badge variant="secondary" className="rounded-full px-2 font-normal">{recentOrders.length}</Badge>
              </h2>
              <Link to="/admin/orders" className="text-sm font-medium text-primary hover:underline">
                View all orders
              </Link>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden">
              {recentOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-accent/40 grid place-items-center text-primary mb-3">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right whitespace-nowrap">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((o) => (
                        <TableRow key={o.orderNumber} className="hover:bg-accent/5 transition-colors">
                          <TableCell className="font-medium">{o.orderNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{o.customer.fullName}</span>
                              <span className="text-xs text-muted-foreground">{o.delivery.wilayaName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(o.total)}</TableCell>
                          <TableCell><StatusBadge status={o.status ?? "pending"} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(o.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" asChild>
                              <Link to="/admin/orders">
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Quick Navigation & More Stats */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
              <div className="grid gap-3">
                {navTiles.map((t) => (
                  <Link 
                    key={t.label} 
                    to={t.to} 
                    className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <t.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t.label}</h3>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="p-5 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-accent/20">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Market Coverage</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-display font-semibold">{stats.activeWilayas}</p>
                  <p className="text-sm text-muted-foreground">Active Wilayas</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-[spin_3s_linear_infinite] flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
              </div>
              <Button variant="link" className="px-0 mt-4 h-auto text-primary" asChild>
                <Link to="/admin/shipping">Manage coverage →</Link>
              </Button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  icon: Icon, label, value, tone 
}: { 
  icon: ElementType, label: string, value: string | number, tone: string 
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-transform hover:scale-[1.02] ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center border border-current/10">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-2xl font-display font-semibold mt-1 whitespace-nowrap">{value}</p>
      </div>
    </div>
  );
}
