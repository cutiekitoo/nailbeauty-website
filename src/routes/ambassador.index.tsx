import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Sparkles, Wallet, PackageCheck, Gift, Copy, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ambassadorService, type AmbassadorDashboard } from "@/lib/ambassador-service";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/ambassador/")({
  head: () => ({ meta: [{ title: "Mon espace ambassadrice — MY QUEENAIL" }, { name: "robots", content: "noindex" }] }),
  component: AmbassadorDashboardPage,
});

const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString("fr-DZ") : "—";
const statusLabel: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", shipped: "Expédiée", delivered: "Livrée",
  cancelled: "Annulée", returned: "Retournée", deferred: "Reportée",
  pending_delivery: "En attente de livraison", under_review: "Délai de validation",
  pending_review: "Délai de validation", payable: "À régler", paid: "Payée", reversed: "Annulée",
};

function AmbassadorDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AmbassadorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"ccp" | "baridimob">("ccp");
  const [accountName, setAccountName] = useState("");
  const [identifier, setIdentifier] = useState("");

  const load = async () => {
    try {
      const data = await ambassadorService.getMyDashboard();
      if (!data.profile.is_active) {
        await ambassadorService.logout();
        navigate({ to: "/ambassador/login" });
        return;
      }
      setDashboard(data);
      setPaymentMethod(data.profile.payment_method ?? "ccp");
      setAccountName(data.profile.payment_account_name ?? "");
      setIdentifier(data.profile.payment_identifier ?? "");
    } catch {
      navigate({ to: "/ambassador/login" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const savePayment = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await ambassadorService.updatePaymentDetails({ paymentMethod, accountName, identifier });
      toast.success("Coordonnées de paiement enregistrées.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    if (!dashboard) return;
    await navigator.clipboard.writeText(dashboard.profile.referral_code);
    toast.success("Code copié.");
  };

  const logout = async () => {
    await ambassadorService.logout();
    navigate({ to: "/ambassador/login" });
  };

  if (loading) return <main className="min-h-screen grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></main>;
  if (!dashboard) return null;

  const month = dashboard.current_month;
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl font-semibold">MY QUEENAIL <Sparkles className="inline h-4 w-4 text-primary" /></Link>
          <Button variant="outline" size="sm" onClick={() => void logout()}><LogOut className="mr-2 h-4 w-4" /> Déconnexion</Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-7">
        <div>
          <p className="text-sm text-muted-foreground">Bienvenue</p>
          <h1 className="font-display text-3xl sm:text-4xl">{dashboard.profile.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Votre espace personnel ambassadrice</p>
        </div>

        <section className="rounded-3xl border border-primary/20 bg-secondary/50 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Votre code ambassadrice</p>
            <p className="font-display text-3xl font-bold tracking-wider mt-1">{dashboard.profile.referral_code}</p>
            <p className="text-xs text-muted-foreground mt-2">Partagez ce code avec vos clientes.</p>
          </div>
          <Button onClick={() => void copyCode()}><Copy className="mr-2 h-4 w-4" /> Copier le code</Button>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={<PackageCheck className="h-5 w-5" />} label="Commandes livrées ce mois" value={String(month.delivered_count)} />
          <Stat icon={<Wallet className="h-5 w-5" />} label="Commissions en validation" value={formatCurrency(month.commission_under_review)} />
          <Stat icon={<Wallet className="h-5 w-5" />} label="Commissions disponibles" value={formatCurrency(month.commission_payable)} />
          <Stat icon={<Gift className="h-5 w-5" />} label="Cadeau mensuel" value={`${month.reward_progress}/${month.reward_threshold}`} />
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Progression du cadeau</h2>
            <span className="text-sm font-semibold">{month.reward_progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden mt-4"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${month.reward_progress}%` }} /></div>
          <p className="text-sm text-muted-foreground mt-3">Atteignez 100 commandes livrées pendant le même mois pour débloquer votre cadeau.</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-2xl mb-4">Mes coordonnées de paiement</h2>
          <form onSubmit={savePayment} className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "ccp" | "baridimob")} className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="ccp">CCP</option><option value="baridimob">BaridiMob</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Nom du titulaire</Label><Input value={accountName} onChange={(e) => setAccountName(e.target.value)} required placeholder="Nom complet" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>{paymentMethod === "ccp" ? "Numéro de compte CCP / clé" : "Numéro de téléphone BaridiMob"}</Label><Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder={paymentMethod === "ccp" ? "Compte CCP" : "05 / 06 / 07..."} /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Enregistrement..." : "Enregistrer mes coordonnées"}</Button></div>
          </form>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-2xl mb-4">Mes commandes par code</h2>
          <p className="text-xs text-muted-foreground mb-3">Pour protéger les clientes, seules les références et les statuts sont affichés. Aucune coordonnée client ni montant de commande n'est accessible.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">Référence</th><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Statut</th><th className="py-3 pr-4">Commission</th><th className="py-3">État commission</th></tr></thead>
              <tbody>{dashboard.orders.map((order) => <tr key={order.order_number} className="border-b border-border/60"><td className="py-3 pr-4 font-medium">{order.order_number}</td><td className="py-3 pr-4">{dateLabel(order.created_at)}</td><td className="py-3 pr-4">{statusLabel[order.status] ?? order.status}</td><td className="py-3 pr-4">{formatCurrency(order.commission_amount)}</td><td className="py-3"><Badge variant="secondary">{statusLabel[order.commission_status] ?? order.commission_status}</Badge></td></tr>)}
              {dashboard.orders.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Aucune commande attribuée pour le moment.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-2xl mb-4">Historique des règlements</h2>
            {dashboard.payouts.length ? <div className="space-y-3">{dashboard.payouts.map((payout, index) => <div key={`${payout.period_month}-${index}`} className="border-b border-border/60 pb-3 flex justify-between gap-3"><div><p className="font-medium">{dateLabel(payout.period_month)}</p><p className="text-xs text-muted-foreground">{payout.payment_method?.toUpperCase() ?? "Ajustement"} · {payout.payment_reference ?? "—"}</p></div><div className="text-right"><p className="font-semibold">{formatCurrency(payout.amount)}</p><p className="text-xs text-muted-foreground">{dateLabel(payout.paid_at)}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">Aucun règlement enregistré.</p>}
          </section>
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-2xl mb-4">Mes cadeaux</h2>
            {dashboard.rewards.length ? <div className="space-y-3">{dashboard.rewards.map((reward, index) => <div key={`${reward.period_month}-${index}`} className="border-b border-border/60 pb-3"><div className="flex justify-between gap-3"><p className="font-medium">{dateLabel(reward.period_month)}</p><Badge variant="secondary">{statusLabel[reward.status] ?? reward.status}</Badge></div><p className="text-sm text-muted-foreground mt-1">{reward.delivered_count}/{reward.threshold} commandes · {reward.gift_name ?? "Cadeau à définir"}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Aucun cadeau débloqué pour le moment.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><div className="text-primary mb-3">{icon}</div><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>;
}
