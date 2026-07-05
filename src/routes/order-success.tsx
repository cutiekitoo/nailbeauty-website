import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Package,
  MapPin,
  Phone,
  User,
  Calendar,
  Hash,
  Truck,
  Sparkles,
  ClipboardCheck,
  PackageCheck,
  Home,
  MessageCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { CartProvider } from "@/lib/cart-context";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { getLastOrder, type Order } from "@/lib/orders";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/order-success")({
  head: () => ({
    meta: [
      { title: "Order Confirmed — Nail Beauty" },
      { name: "description", content: "Your Nail Beauty order is on its way." },
    ],
  }),
  component: Page,
});

const WHATSAPP_NUMBER = "+213791615430";
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function Page() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <Success />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}

function Success() {
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const o = await getLastOrder();
      if (!o) {
        navigate({ to: "/" });
        return;
      }
      setOrder(o);
      setLoaded(true);
    }
    loadOrder();
  }, [navigate]);

  if (!loaded || !order) return null;

  const firstName = order.customer.fullName.split(" ")[0];
  const waHref = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi! I need help with my order ${order.orderNumber}.`,
  )}`;

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 py-10 sm:py-14 space-y-8 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-secondary via-card to-accent/40 border border-border shadow-[var(--shadow-glow)] p-8 sm:p-12 text-center">
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-accent/40 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="relative inline-grid place-items-center mb-6 animate-scale-in">
            <span className="absolute inset-0 -m-3 rounded-full bg-primary/20 blur-xl" aria-hidden />
            <span className="relative grid place-items-center h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-soft)]">
              <CheckCircle2 className="h-12 w-12" strokeWidth={1.8} />
            </span>
            <Sparkles className="absolute -top-2 -right-3 h-6 w-6 text-primary animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-4 h-5 w-5 text-accent-foreground/70 animate-pulse" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl mb-3">Order Confirmed! 🎉</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Thank you, {firstName}. Nous avons bien reçu votre demande et notre équipe vous contactera prochainement pour la confirmer.
          </p>
        </div>
      </section>

      {/* Order info */}
      <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Résumé de votre commande</p>
            <h2 className="font-display text-2xl">Informations du client</h2>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
          Paiement à la livraison
          </span>
        </header>

        <div className="grid sm:grid-cols-2 gap-5 mt-6 text-sm">
          <InfoRow icon={<Hash className="h-4 w-4" />} label="Order number" value={order.orderNumber} />
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Order date" value={fmtDate(order.createdAt)} />
          <InfoRow icon={<User className="h-4 w-4" />} label="Customer" value={order.customer.fullName} />
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={order.customer.phone} />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Wilaya"
            value={`${order.delivery.wilayaCode} — ${order.delivery.wilayaName}`}
          />
          <InfoRow
            icon={<Truck className="h-4 w-4" />}
            label={order.delivery.method === "home" ? "Home delivery" : "DHD office pickup"}
            value={order.delivery.address ?? order.delivery.officeLocation ?? "—"}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
          <span className="font-display text-lg">Montant total</span>
          <span className="font-display text-3xl text-primary">{formatCurrency(order.total)}</span>
        </div>
      </section>

      {/* Items */}
      <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8">
        <h2 className="font-display text-2xl mb-5">Produits commandés</h2>
        <ul className="space-y-3">
          {order.items.map((it) => (
            <li
              key={it.id}
              className="flex gap-4 items-center p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
            >
              <img
                src={it.image}
                alt={it.name}
                className="h-16 w-16 rounded-xl object-cover border border-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{it.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(it.unitPrice)} <span className="opacity-60">×</span> {it.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold whitespace-nowrap">{formatCurrency(it.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-5 border-t border-border space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frais de livraison</span>
            <span>{formatCurrency(order.shippingFee)}</span>
          </div>
        </div>
      </section>

      {/* What's next */}
      <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8">
        <h2 className="font-display text-2xl mb-2">Que se passe-t-il maintenant ?</h2>
        <p className="text-sm text-muted-foreground mb-8">
        Notre équipe va maintenant prendre en charge votre commande.
        </p>

        <ol className="relative">
          <span
            className="absolute left-[19px] sm:left-[23px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-accent to-border"
            aria-hidden
          />
          <TimelineStep
            active
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Commande enregistrée"
            desc="Votre commande a bien été reçue."
          />
          <TimelineStep
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Confirmation"
            desc="Notre équipe vous contactera prochainement pour confirmer votre commande."
          />
          <TimelineStep
            icon={<PackageCheck className="h-5 w-5" />}
            title="Préparation"
            desc="Votre colis est en cours de préparation."
          />
          <TimelineStep
            last
            icon={<Truck className="h-5 w-5" />}
            title="Livraison"
            desc={
              order.delivery.method === "home"
                ? "Votre commande sera expédiée vers l'adresse indiquée ."
                : "votre commande sera expédiée vers le bureau de livraison the DHD ."
            }
          />
        </ol>
      </section>

      {/* COD Notice */}
      <section className="rounded-3xl bg-gradient-to-br from-accent/50 to-secondary border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8">
        <div className="flex gap-4">
          <span className="grid place-items-center h-12 w-12 rounded-full bg-card text-primary shrink-0 shadow-sm">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-xl mb-1">Paiement à la livraison (COD)</h3>
            <p className="text-sm text-foreground/80">
              Le montant de <span className="font-semibold text-primary">{formatCurrency(order.total)}</span> sera payé lors de la réception de votre commande.
            </p>
          </div>
        </div>
      </section>

      {/* WhatsApp */}
      <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-8 text-center">
        <span className="inline-grid place-items-center h-14 w-14 rounded-full bg-[#25D366]/15 text-[#128C7E] mb-4">
          <MessageCircle className="h-7 w-7" />
        </span>
        <h3 className="font-display text-2xl mb-2">Une question concernant votre commande ?</h3>
        <p className="text-sm text-muted-foreground mb-5">
        Notre équipe est disponible sur WhatsApp pour vous aider.
        </p>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-white font-semibold shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-95 transition"
        >
          <MessageCircle className="h-5 w-5" />
          Contacter sur WhatsApp
        </a>
      </section>

      {/* Continue shopping */}
      <div className="text-center pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-[var(--shadow-glow)] hover:brightness-110 active:scale-95 transition"
        >
          <Home className="h-5 w-5" />
          Retour à la boutique
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid place-items-center h-9 w-9 rounded-full bg-accent text-accent-foreground shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function TimelineStep({
  icon,
  title,
  desc,
  active = false,
  last = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <li className={`relative flex gap-4 ${last ? "" : "pb-7"}`}>
      <span
        className={`relative z-10 grid place-items-center h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0 border ${
          active
            ? "bg-gradient-to-br from-primary to-accent text-primary-foreground border-transparent shadow-[var(--shadow-soft)]"
            : "bg-card text-muted-foreground border-border"
        }`}
      >
        {icon}
      </span>
      <div className="pt-1 sm:pt-2">
        <p className="font-display text-lg leading-tight">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
    </li>
  );
}
