import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Sparkles, Wallet, PackageCheck, Gift, Copy, Save, Loader2, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ambassadorService, type AmbassadorDashboard, type AmbassadorNotification } from "@/lib/ambassador-service";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/ambassador/")({
  head: () => ({ meta: [{ title: "Mon espace ambassadrice — MY QUEENAIL" }, { name: "robots", content: "noindex" }] }),
  component: AmbassadorDashboardPage,
});

const ALGERIA_WILAYAS = ["Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arréridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent","Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar","Ouled Djellal","Béni Abbès","In Salah","In Guezzam","Touggourt","Djanet","El M'Ghair","El Meniaa"];

const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString("fr-DZ") : "—";
const statusLabel: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", shipped: "Expédiée", delivered: "Livrée",
  cancelled: "Annulée", returned: "Retournée", deferred: "Reportée",
  pending_delivery: "En attente de livraison", under_review: "Délai de validation",
  pending_review: "Délai de validation", payable: "À régler", paid: "Payée", reversed: "Annulée",
  eligible: "Débloqué", prepared: "En préparation", given: "Remis",
};

function AmbassadorDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AmbassadorDashboard | null>(null);
  const [notifications, setNotifications] = useState<AmbassadorNotification[]>([]);
  const [markingNotifications, setMarkingNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"ccp" | "baridimob">("ccp");
  const [accountName, setAccountName] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");

  const load = async () => {
    try {
      const data = await ambassadorService.getMyDashboard();
      try { setNotifications(await ambassadorService.getMyNotifications()); } catch { setNotifications([]); }
      if (!data.profile.is_active) {
        await ambassadorService.logout();
        navigate({ to: "/ambassador/login" });
        return;
      }
      setDashboard(data);
      setPaymentMethod(data.profile.payment_method ?? "ccp");
      setAccountName(data.profile.payment_account_name ?? "");
      setWilaya(data.profile.wilaya ?? "");
      setIdentifier(data.profile.payment_identifier ?? "");
      setPersonalPhone(data.profile.phone ?? "");
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
      await ambassadorService.updatePaymentDetails({ paymentMethod, accountName, identifier, wilaya, personalPhone });
      toast.success("Coordonnées de paiement enregistrées.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const markNotificationsRead = async () => {
    setMarkingNotifications(true);
    try {
      await ambassadorService.markMyNotificationsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? new Date().toISOString() })));
      toast.success("Notifications marquées comme lues.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible de mettre à jour les notifications."); }
    finally { setMarkingNotifications(false); }
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
  const giftTiers = [50, 100, 200].map((threshold) => ({
    threshold,
    reward: dashboard.rewards.find((reward) => reward.period_month === month.period_month && reward.threshold === threshold),
    setting: dashboard.gift_tiers.find((tier) => tier.threshold === threshold),
    progress: Math.min(100, Math.round((month.delivered_count / threshold) * 100)),
  }));
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
          <Stat icon={<Gift className="h-5 w-5" />} label="Progression des cadeaux" value={`${month.reward_progress}/200`} />
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-2xl flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Mes notifications {notifications.some((notification) => !notification.read_at) && <Badge>{notifications.filter((notification) => !notification.read_at).length} nouvelles</Badge>}</h2>
            {notifications.some((notification) => !notification.read_at) && <Button size="sm" variant="outline" disabled={markingNotifications} onClick={() => void markNotificationsRead()}><CheckCheck className="mr-2 h-4 w-4" />{markingNotifications ? "Mise à jour..." : "Tout marquer comme lu"}</Button>}
          </div>
          {notifications.length ? <div className="space-y-3">{notifications.map((notification) => <div key={notification.id} className={`rounded-2xl border p-4 ${notification.read_at ? "border-border/60 bg-background/40" : "border-primary/30 bg-secondary/50"}`}>
            <div className="flex items-start justify-between gap-3"><p className="font-semibold text-sm">{notification.title}</p><span className="text-xs text-muted-foreground shrink-0">{dateLabel(notification.created_at)}</span></div>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          </div>)}</div> : <p className="text-sm text-muted-foreground">Tu recevras ici les félicitations pour tes paliers cadeaux, les commissions validées et les paiements effectués.</p>}
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-2xl mb-2">Mes paliers cadeaux</h2>
          <p className="text-sm text-muted-foreground mb-5">Les commandes livrées sont comptabilisées chaque mois. Trois cadeaux maximum : à 50, 100 et 200 commandes.</p>
          <div className="space-y-5">
            {giftTiers.map(({ threshold, reward, setting, progress }) => (
              <div key={threshold} className="rounded-2xl border border-border/70 bg-background/60 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {setting?.image_url ? <img src={setting.image_url} alt={setting.gift_name || `Cadeau du palier ${threshold}`} className="h-28 w-28 shrink-0 rounded-2xl object-cover border border-border shadow-sm" /> : <div className="h-28 w-28 shrink-0 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground"><Gift className="h-8 w-8" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div><p className="font-semibold">{threshold} commandes livrées</p><p className="text-sm text-muted-foreground">{setting?.gift_name || reward?.gift_name || "Le cadeau sera bientôt dévoilé"}</p></div>
                      <Badge variant={reward?.status === "given" ? "default" : "secondary"}>{reward ? (statusLabel[reward.status] ?? reward.status) : `${Math.min(month.delivered_count, threshold)}/${threshold}`}</Badge>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                    <p className="text-xs text-muted-foreground mt-2">{month.delivered_count >= threshold ? "Palier atteint !" : `Encore ${threshold - month.delivered_count} commande${threshold - month.delivered_count > 1 ? "s" : ""} pour débloquer ce cadeau`}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {month.delivered_count >= 200 && <p className="text-sm text-muted-foreground mt-5">Les trois cadeaux du mois sont débloqués. Le prochain cycle commencera le mois prochain.</p>}
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
            <div className="space-y-2"><Label>Nom complet</Label><Input value={accountName} onChange={(e) => setAccountName(e.target.value)} required placeholder="Nom et prénom" /></div>
            <div className="space-y-2"><Label>Téléphone personnel</Label><Input type="tel" value={personalPhone} onChange={(e) => setPersonalPhone(e.target.value)} required placeholder="05 / 06 / 07..." /></div>
            <div className="space-y-2"><Label>Wilaya</Label><select value={wilaya} onChange={(e) => setWilaya(e.target.value)} required className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"><option value="">Choisir votre wilaya</option>{ALGERIA_WILAYAS.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
            <div className="space-y-2 sm:col-span-2"><Label>RIP (Relevé d’identité postal)</Label><Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="Votre RIP" /></div>
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
