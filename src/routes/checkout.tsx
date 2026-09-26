import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ChevronRight, MapPin, Package, Phone, User, Wallet, Search } from "lucide-react";
import { CartProvider, useCart } from "@/lib/cart-context";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import {
  DELIVERY_METHODS,
  type DeliveryMethod,
} from "@/lib/shipping-config";
import { shippingService } from "@/lib/shipping-service";
import { createOrder } from "@/lib/orders";
import { productsService } from "@/lib/products-service";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Nail Beauty" },
      { name: "description", content: "Complete your order with Cash on Delivery across Algeria." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Header />
        <Checkout />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}

function Checkout() {
  const { detailed, subtotal, clear, hasOutOfStock, outOfStockItems } = useCart();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaCode, setWilayaCode] = useState<string>("");
  const [method, setMethod] = useState<DeliveryMethod>("home");
  const [address, setAddress] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [wilayaRates, setWilayaRates] = useState<{
    home: number;
    office: number;
  } | null>(null);

 // Load shipping rates when the Wilaya changes
  useEffect(() => {
  async function loadShippingRates() {
    if (!wilayaCode) {
      setWilayaRates(null);
      setShippingFee(null);
      return;
    }

    const wilaya = await shippingService.get(wilayaCode);

    if (!wilaya || !wilaya.enabled) {
      setWilayaRates(null);
      setShippingFee(null);
      return;
    }

    setWilayaRates(wilaya.rates);
    setShippingFee(wilaya.rates[method]);
  }

  loadShippingRates();
 }, [wilayaCode, method]);

  const total = subtotal + (shippingFee ?? 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!/^[0-9+\s-]{8,}$/.test(phone.trim())) e.phone = "Enter a valid phone number.";
    if (!wilayaCode) e.wilaya = "Please select your Wilaya.";
    if (method === "home" && !address.trim()) e.address = "Address is required.";
    if (method === "office" && !officeLocation.trim())
      e.office = "Please enter the DHD office name or location.";
    if (detailed.length === 0) e.cart = "Your cart is empty.";
    if (hasOutOfStock)
      e.cart = `Some items are out of stock: ${outOfStockItems
        .map((i) => i.product.name)
        .join(", ")}. Please remove them to continue.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate() || shippingFee == null) return;
    
    setSubmitting(true);

    try {
      // Re-check stock against source of truth right before placing the order
      const freshOOS: string[] = [];
      for (const d of detailed) {
        const fresh = await productsService.getStorefront(d.product.id);
        if (!fresh || fresh.stock <= 0) {
          freshOOS.push(d.product.name);
        }
      }
      
      if (freshOOS.length > 0) {
        setErrors((prev) => ({
          ...prev,
          cart: `Some items are out of stock: ${freshOOS.join(", ")}. Please remove them to continue.`,
        }));
        setSubmitting(false);
        return;
      }
      
      // Verify requested quantities against current stock
      const overQty: string[] = [];
      for (const d of detailed) {
        const fresh = await productsService.getStorefront(d.product.id);
        if (fresh && d.quantity > fresh.stock) {
          overQty.push(`${d.product.name} (only ${fresh.stock} left, requested ${d.quantity})`);
        }
      }
      
      if (overQty.length > 0) {
        setErrors((prev) => ({
          ...prev,
          cart: `Requested quantity exceeds available stock: ${overQty.join(", ")}.`,
        }));
        setSubmitting(false);
        return;
      }

      const w = await shippingService.get(wilayaCode);
      if (!w) {
        setErrors((prev) => ({ ...prev, wilaya: "Invalid wilaya" }));
        setSubmitting(false);
        return;
      }

      const result = await createOrder({
        customer: {
          fullName: fullName.trim(),
          phone: phone.trim(),
        },
        delivery: {
          wilayaCode,
          wilayaName: w.name,
          method,
          address: method === "home" ? address.trim() : undefined,
          officeLocation: method === "office" ? officeLocation.trim() : undefined,
        },
        items: detailed.map(({ product, quantity }) => ({
          id: product.id,
          quantity,
        })),
        paymentMethod: "cod",
        notes: undefined,
      });

      if (!result.success) {
        setErrors((prev) => ({ ...prev, cart: result.error || "Failed to create order" }));
        setSubmitting(false);
        return;
      }

      clear();
      navigate({ to: "/order-success" });
    } catch (err) {
      setErrors((prev) => ({ ...prev, cart: err instanceof Error ? err.message : "Failed to place order" }));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10 sm:py-14">
      {/* Breadcrumb + title */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <Link to="/" className="hover:text-foreground transition">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Checkout</span>
      </nav>
      <h1 className="font-display text-4xl sm:text-5xl mb-2">Checkout</h1>
      <p className="text-muted-foreground mb-8">
        Almost there — just a few details for your delivery.
      </p>

      <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-6">
          <Section icon={<User className="h-4 w-4" />} title="Customer Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name" error={errors.fullName}>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sara Bensalem"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone Number" error={errors.phone}>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0555 12 34 56"
                    inputMode="tel"
                    className={`${inputCls} pl-11`}
                  />
                </div>
              </Field>
            </div>
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Delivery Information">
  <Field label="Wilaya" error={errors.wilaya}>
    <WilayaSelect value={wilayaCode} onChange={setWilayaCode} />
  </Field>

  <div className="grid sm:grid-cols-2 gap-3 mt-4">
    {DELIVERY_METHODS.map((m) => {
      const active = method === m.value;

      return (
        <button
          type="button"
          key={m.value}
          onClick={() => setMethod(m.value)}
          className={`text-left p-4 rounded-2xl border transition shadow-[var(--shadow-soft)] ${
            active
              ? "border-primary bg-secondary"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {m.description}
              </p>
            </div>

            <span
              className={`mt-0.5 grid place-items-center h-5 w-5 rounded-full border ${
                active ? "border-primary bg-primary" : "border-border"
              }`}
            >
              {active && (
                <span className="h-2 w-2 rounded-full bg-primary-foreground" />
              )}
            </span>
          </div>

          {/* ✅ FIX BUG ICI */}
          <p className="mt-3 text-sm font-medium text-primary">
            {formatCurrency(m.value === "home" ? 1200 : 900)}
          </p>
        </button>
      );
    })}
  </div>

  <div className="mt-4">
    {method === "home" ? (
      <Field label="Full Address" error={errors.address}>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, building, apartment, city…"
          rows={3}
          className={`${inputCls} py-3 resize-none`}
        />
      </Field>
    ) : (
      <Field label="DHD Office Name / Location" error={errors.office}>
        <input
          value={officeLocation}
          onChange={(e) => setOfficeLocation(e.target.value)}
          placeholder="e.g. DHD Bab Ezzouar"
          className={inputCls}
        />
      </Field>
    )}
  </div>
</Section>
          <Section icon={<Wallet className="h-4 w-4" />} title="Payment Method">
            <label className="flex items-start gap-3 p-4 rounded-2xl border-2 border-primary bg-secondary cursor-pointer">
              <input type="radio" checked readOnly className="mt-1 accent-primary" />
              <div>
                <p className="font-semibold">Cash on Delivery (COD)</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Pay when you receive your order.
                </p>
              </div>
            </label>
          </Section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="rounded-3xl bg-card border border-border shadow-[var(--shadow-glow)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="font-display text-2xl">Order Summary</h2>
            </div>

            {detailed.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Your cart is empty.</p>
                <Link
                  to="/"
                  className="inline-block px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                >
                  Continue shopping
                </Link>
              </div>
            ) : (
              <>
                <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {detailed.map(({ product, quantity }) => (
                    <li key={product.id} className="flex gap-3 items-center">
                      <div className="relative shrink-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-14 w-14 rounded-xl object-cover border border-border"
                        />
                        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold grid place-items-center">
                          {quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.price)} × {quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(product.price * quantity)}</p>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-5 border-t border-border space-y-2 text-sm">
                  <Row label="Subtotal" value={formatCurrency(subtotal)} />
                  <Row
                    label="Shipping"
                    value={
                      shippingFee == null ? (
                        <span className="text-muted-foreground">Select wilaya</span>
                      ) : (
                        formatCurrency(shippingFee)
                      )
                    }
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-display text-lg">Total</span>
                  <span className="font-display text-2xl text-primary">{formatCurrency(total)}</span>
                </div>

                {errors.cart && (
                  <p className="mt-3 text-sm text-destructive">{errors.cart}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || detailed.length === 0 || hasOutOfStock}
                  className="mt-6 w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-[var(--shadow-soft)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Placing order…" : "Confirm Order"}
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  By confirming, you agree to pay {shippingFee != null ? formatCurrency(total) : "the total"} in cash upon delivery.
                </p>
              </>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}

/* ---------- helpers ---------- */

const inputCls =
  "w-full h-12 px-4 rounded-2xl bg-background border border-border shadow-[var(--shadow-soft)] text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring transition";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-5">
        <span className="grid place-items-center h-7 w-7 rounded-full bg-accent text-accent-foreground">
          {icon}
        </span>
        <h2 className="font-display text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-destructive mt-1.5">{error}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function WilayaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [wilayas, setWilayas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWilayas() {
      const data = await shippingService.list();
      setWilayas(data);
      setLoading(false);
    }
    loadWilayas();
  }, []);

  const selected = wilayas.find((w) => w.code === value);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = wilayas.filter((w) => w.enabled);
    if (!q) return base;
    return base.filter(
      (w) => w.name.toLowerCase().includes(q) || w.code.includes(q),
    );
  }, [query, wilayas]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className={selected ? "" : "text-muted-foreground/70"}>
          {selected ? `${selected.code} — ${selected.name}` : "Select your wilaya"}
        </span>
        <ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="fixed left-4 right-4 top-[15%] z-50 max-h-[70vh] overflow-hidden rounded-2xl bg-popover border border-border shadow-[var(--shadow-glow)] sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:max-h-64 sm:w-full">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 58 wilayas…"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {list.length === 0 ? (
                <li className="px-4 py-3 text-sm text-muted-foreground">No matches.</li>
              ) : (
                list.map((w) => (
                  <li key={w.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(w.code);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-secondary transition ${
                        w.code === value ? "bg-secondary" : ""
                      }`}
                    >
                      <span>
                        <span className="text-muted-foreground mr-2">{w.code}</span>
                        {w.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(w.rates.home)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
