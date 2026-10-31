import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Gift, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminSession } from "@/lib/admin-auth";
import { ambassadorService } from "@/lib/ambassador-service";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ambassadors")({
  head: () => ({ meta: [{ title: "Ambassadrices — Administration Nail Beauty" }, { name: "robots", content: "noindex" }] }),
  component: AdminAmbassadorsPage,
});

function AdminAmbassadorsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, ready } = useAdminSession();
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const refresh = async (selectedId = selected) => {
    setLoading(true);
    try {
      const data = await ambassadorService.listAdmin();
      setRows(data);
      if (selectedId) {
        const detail = await ambassadorService.getAdminDetails(selectedId);
        setDetails(detail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/admin/login" });
    if (isAuthenticated) void refresh(null);
  }, [ready, isAuthenticated]);

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await ambassadorService.createAccount({ fullName, email, referralCode });
      toast.success("Invitation envoyée à l'ambassadrice.");
      setFullName(""); setEmail(""); setReferralCode("");
      await refresh(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  };

  const choose = async (id: string) => {
    setSelected(id);
    setDetails(null);
    setLoading(true);
    try { setDetails(await ambassadorService.getAdminDetails(id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Détails indisponibles."); }
    finally { setLoading(false); }
  };

  const changeStatus = async (row: Record<string, any>) => {
    setBusy(true);
    try {
      await ambassadorService.setStatus(row.id, !row.is_active);
      toast.success(row.is_active ? "Compte suspendu." : "Compte réactivé.");
      await refresh(row.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Modification impossible."); }
    finally { setBusy(false); }
  };

  const changeCode = async (row: Record<string, any>) => {
    const code = window.prompt("Nouveau code ambassadrice", row.referral_code);
    if (!code) return;
    setBusy(true);
    try {
      await ambassadorService.setCode(row.id, code);
      toast.success("Code modifié.");
      await refresh(row.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Code impossible à modifier."); }
    finally { setBusy(false); }
  };

  const pay = async (row: Record<string, any>) => {
    const localMonth = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Algiers",
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
    const [year, monthNumber] = localMonth.split("-").map(Number);
    const previousMonthDate = new Date(Date.UTC(year, monthNumber - 2, 1));
    const defaultPeriod = previousMonthDate.toISOString().slice(0, 10);
    const enteredPeriod = window.prompt(
      "Mois des commissions à régler (AAAA-MM). Par défaut : mois précédent",
      defaultPeriod.slice(0, 7),
    );
    if (enteredPeriod === null) return;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(enteredPeriod.trim())) {
      toast.error("Veuillez saisir un mois valide au format AAAA-MM.");
      return;
    }
    const period = `${enteredPeriod.trim()}-01`;
    const reference = window.prompt("Référence du règlement CCP / BaridiMob");
    if (reference === null) return;
    const note = window.prompt("Note facultative", "") ?? "";
    setBusy(true);
    try {
      const result = await ambassadorService.recordPayout(row.id, period, reference, note);
      toast.success(`Règlement enregistré : ${formatCurrency(Number(result?.paid_amount ?? 0))}`);
      await refresh(row.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Règlement impossible."); }
    finally { setBusy(false); }
  };

  const updateGift = async (reward: Record<string, any>) => {
    const giftName = window.prompt("Nom du cadeau", reward.gift_name ?? "");
    if (giftName === null) return;
    const status = window.prompt("Statut : eligible, prepared, given ou cancelled", reward.status);
    if (!status) return;
    setBusy(true);
    try {
      await ambassadorService.updateReward(reward.id, giftName, status);
      toast.success("Suivi du cadeau mis à jour.");
      if (selected) await refresh(selected);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Modification impossible."); }
    finally { setBusy(false); }
  };

  if (!ready || !isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Administration</p><h1 className="font-display text-2xl">Programme ambassadrices</h1></div>
          <Button variant="outline" onClick={() => navigate({ to: "/admin" })}><ArrowLeft className="mr-2 h-4 w-4" /> Retour admin</Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 grid xl:grid-cols-[360px_1fr] gap-6">
        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-xl mb-4">Inviter une ambassadrice</h2>
            <form onSubmit={createAccount} className="space-y-3">
              <div className="space-y-1"><Label>Nom complet</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Code personnel</Label><Input value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} minLength={3} maxLength={24} pattern="[A-Z0-9_-]{3,24}" required /></div>
              <Button type="submit" className="w-full" disabled={busy}><Plus className="mr-2 h-4 w-4" /> Envoyer l'invitation</Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">L'ambassadrice reçoit un e-mail d'invitation pour définir son mot de passe.</p>
          </section>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-display text-xl">Comptes</h2><Button variant="ghost" size="icon" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /></Button></div>
            <div className="space-y-2">
              {rows.map((row) => <button key={row.id} type="button" onClick={() => void choose(row.id)} className={`w-full text-left rounded-2xl border p-3 transition ${selected === row.id ? "border-primary bg-secondary" : "border-border hover:bg-secondary/50"}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-sm">{row.full_name}</span><Badge variant={row.is_active ? "default" : "destructive"}>{row.is_active ? "Actif" : "Suspendu"}</Badge></div>
                <p className="text-xs text-muted-foreground mt-1">{row.referral_code} · {row.email}</p>
                <p className="text-xs mt-2">{row.month_delivered ?? 0} livrées ce mois · {formatCurrency(Number(row.payable_amount ?? 0))} à régler</p>
              </button>)}
              {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">Aucune ambassadrice enregistrée.</p>}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 min-h-96">
          {!selected || !details ? <div className="h-full min-h-72 grid place-items-center text-center text-muted-foreground"><div><ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>Sélectionnez une ambassadrice pour gérer son compte.</p></div></div> : <>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-5">
              <div><h2 className="font-display text-2xl">{details.profile.full_name}</h2><p className="text-sm text-muted-foreground">{details.profile.email} · Code : {details.profile.referral_code}</p><p className="text-sm mt-2">Paiement : {details.profile.payment_method?.toUpperCase() ?? "Non renseigné"} · {details.profile.payment_identifier ?? "—"}</p></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void changeCode({ ...details.profile })}>Modifier le code</Button><Button variant={details.profile.is_active ? "destructive" : "default"} disabled={busy} onClick={() => void changeStatus({ ...details.profile })}>{details.profile.is_active ? "Suspendre" : "Réactiver"}</Button><Button disabled={busy} onClick={() => void pay({ id: selected })}><Wallet className="mr-2 h-4 w-4" /> Enregistrer un paiement</Button></div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 py-5">
              <Metric label="Commandes livrées ce mois" value={String(rows.find((r) => r.id === selected)?.month_delivered ?? 0)} />
              <Metric label="Commissions disponibles" value={formatCurrency(Number(rows.find((r) => r.id === selected)?.payable_amount ?? 0))} />
              <Metric label="Total déjà réglé" value={formatCurrency(Number(rows.find((r) => r.id === selected)?.total_paid ?? 0))} />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div><h3 className="font-display text-xl mb-3">Historique des commandes</h3><div className="max-h-80 overflow-auto space-y-2">{(details.orders ?? []).map((order: Record<string, any>, i: number) => <div key={i} className="border-b border-border/60 pb-2 flex justify-between gap-3 text-sm"><div><p className="font-medium">{order.order_number}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("fr-DZ")} · {order.status}</p></div><p className="font-semibold">{formatCurrency(Number(order.commission_amount ?? 0))}</p></div>)}</div></div>
              <div><h3 className="font-display text-xl mb-3">Historique des paiements</h3><div className="max-h-80 overflow-auto space-y-2">{(details.payouts ?? []).map((p: Record<string, any>) => <div key={p.id} className="border-b border-border/60 pb-2 text-sm flex justify-between gap-3"><div><p className="font-medium">{p.payment_reference ?? "Règlement"}</p><p className="text-xs text-muted-foreground">{p.payment_method?.toUpperCase() ?? "—"} · {new Date(p.paid_at).toLocaleDateString("fr-DZ")}</p></div><p className="font-semibold">{formatCurrency(Number(p.amount))}</p></div>)}</div></div>
            </div>
            <div className="mt-6"><h3 className="font-display text-xl mb-3 flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> Cadeaux mensuels</h3><div className="space-y-2">{(details.rewards ?? []).map((reward: Record<string, any>) => <div key={reward.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3"><div><p className="font-medium text-sm">{reward.gift_name ?? "Cadeau à définir"}</p><p className="text-xs text-muted-foreground">{reward.delivered_count}/{reward.threshold} commandes · {reward.status}</p></div><Button size="sm" variant="outline" disabled={busy} onClick={() => void updateGift(reward)}>Gérer</Button></div>)}{(details.rewards ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun seuil atteint pour le moment.</p>}</div></div>
          </>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-xl mt-1">{value}</p></div>;
}
