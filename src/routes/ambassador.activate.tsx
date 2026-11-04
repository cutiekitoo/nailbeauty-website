import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ambassador/activate")({
  head: () => ({ meta: [{ title: "Activer mon compte — MY QUEENAIL" }, { name: "robots", content: "noindex" }] }),
  component: ActivateAmbassadorPage,
});

function ActivateAmbassadorPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate({ to: "/ambassador" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation impossible. Ouvrez à nouveau le lien reçu par e-mail.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border p-8 shadow-[var(--shadow-glow)]">
        <div className="text-center mb-7"><Link to="/" className="font-display text-2xl font-semibold">MY QUEENAIL <Sparkles className="inline h-4 w-4 text-primary" /></Link><h1 className="font-display text-2xl mt-6">Activer mon compte</h1><p className="text-sm text-muted-foreground mt-2">Choisissez le mot de passe de votre espace ambassadrice.</p></div>
        {!checking && !hasSession ? <Alert variant="destructive"><AlertDescription>Le lien d'invitation n'est pas actif ou a expiré. Ouvrez le lien reçu par e-mail ou contactez MY QUEENAIL pour recevoir une nouvelle invitation.</AlertDescription></Alert> : checking ? <p className="text-sm text-muted-foreground text-center">Vérification du lien...</p> : <form onSubmit={submit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2"><Label htmlFor="new-password">Nouveau mot de passe</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={8} /></div></div>
          <div className="space-y-2"><Label htmlFor="confirm-password">Confirmer le mot de passe</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} /></div>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Activation..." : "Activer mon compte"}</Button>
        </form>}
      </div>
    </main>
  );
}
