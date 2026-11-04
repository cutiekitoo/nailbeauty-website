import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ambassadorService } from "@/lib/ambassador-service";

export const Route = createFileRoute("/ambassador/login")({
  head: () => ({ meta: [{ title: "Espace ambassadrice — MY QUEENAIL" }, { name: "robots", content: "noindex" }] }),
  component: AmbassadorLoginPage,
});

function AmbassadorLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Veuillez saisir votre e-mail et votre mot de passe.");
      return;
    }
    setLoading(true);
    try {
      const result = await ambassadorService.login(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate({ to: "/ambassador" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border/60 shadow-[var(--shadow-glow)] p-8 sm:p-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-display font-semibold">
            MY QUEENAIL <Sparkles className="h-5 w-5 text-primary" />
          </Link>
          <h1 className="mt-6 text-2xl font-display font-semibold">Espace ambassadrice</h1>
          <p className="mt-2 text-sm text-muted-foreground">Connectez-vous pour suivre vos commandes et commissions.</p>
        </div>

        {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="ambassador-email">Adresse e-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="ambassador-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11 rounded-xl" disabled={loading} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ambassador-password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="ambassador-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10 h-11 rounded-xl" disabled={loading} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">{loading ? "Connexion..." : "Se connecter"}</Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">Accès réservé aux ambassadrices invitées par MY QUEENAIL.</p>
      </div>
    </main>
  );
}
