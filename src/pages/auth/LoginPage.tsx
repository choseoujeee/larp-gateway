import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const loginTrim = login.trim().toLowerCase();
    if (!loginTrim) {
      toast.error("Vyplňte login");
      setLoading(false);
      return;
    }

    const { data: authEmail, error: rpcError } = await supabase.rpc("get_organizer_auth_email", {
      p_login: loginTrim,
    });

    if (rpcError || !authEmail) {
      toast.error("Přihlášení selhalo", {
        description: "Neplatný login nebo heslo",
      });
      setLoading(false);
      return;
    }

    const { error } = await signIn(authEmail, password);

    if (error) {
      toast.error("Přihlášení selhalo", {
        description: "Neplatný login nebo heslo",
      });
      setLoading(false);
      return;
    }

    toast.success("Přihlášení úspěšné");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="font-typewriter text-2xl tracking-wider text-foreground">
                LARP PORTÁL
              </h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase">
                Přihlášení organizátora
              </p>
            </div>
          </Link>
        </div>

        <PaperCard>
          <PaperCardHeader>
            <PaperCardTitle>Přihlášení</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login" className="font-mono">Login</Label>
                <Input
                  id="login"
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="váš login (např. janovak)"
                  required
                  className="input-vintage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-mono">Heslo</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-vintage"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full btn-vintage"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Přihlašování...
                  </>
                ) : (
                  "Přihlásit se"
                )}
              </Button>
            </form>
          </PaperCardContent>
        </PaperCard>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Zpět na úvodní stránku
          </Link>
        </p>
      </div>
    </div>
  );
}
