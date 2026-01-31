import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState("");
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

    const { error } = await signIn(email, password);

    if (error) {
      toast.error("Přihlášení selhalo", {
        description: "Zkontrolujte e-mail a heslo",
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
                <Label htmlFor="email" className="font-mono">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
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

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Nemáte účet?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Zaregistrujte se
              </Link>
            </div>
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
