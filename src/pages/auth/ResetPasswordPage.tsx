import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileText, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setSessionReady(true);
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    // Timeout after 8 seconds
    timeoutId = setTimeout(() => {
      setSessionReady((current) => {
        if (!current) {
          setError("Odkaz pro reset hesla vypršel nebo je neplatný. Požádejte o nový odkaz.");
        }
        return current;
      });
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Heslo musí mít alespoň 6 znaků");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Hesla se neshodují");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      toast.error("Chyba při změně hesla", {
        description: error.message,
      });
      return;
    }

    setSuccess(true);
    toast.success("Heslo bylo změněno");

    // Redirect to admin after 2 seconds
    setTimeout(() => {
      navigate("/admin");
    }, 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-primary">
                <FileText className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h1 className="font-typewriter text-2xl tracking-wider text-foreground">
                  LARP PORTÁL
                </h1>
              </div>
            </Link>
          </div>

          <PaperCard>
            <PaperCardHeader>
              <PaperCardTitle>Neplatný odkaz</PaperCardTitle>
            </PaperCardHeader>
            <PaperCardContent className="space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Link to="/zapomenute-heslo">
                <Button className="w-full btn-vintage">
                  Požádat o nový odkaz
                </Button>
              </Link>
            </PaperCardContent>
          </PaperCard>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Ověřuji odkaz...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-primary">
                <FileText className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h1 className="font-typewriter text-2xl tracking-wider text-foreground">
                  LARP PORTÁL
                </h1>
              </div>
            </Link>
          </div>

          <PaperCard>
            <PaperCardHeader>
              <PaperCardTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Heslo změněno
              </PaperCardTitle>
            </PaperCardHeader>
            <PaperCardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vaše heslo bylo úspěšně změněno. Přesměrováváme vás do administrace...
              </p>
            </PaperCardContent>
          </PaperCard>
        </div>
      </div>
    );
  }

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
                Nastavení nového hesla
              </p>
            </div>
          </Link>
        </div>

        <PaperCard>
          <PaperCardHeader>
            <PaperCardTitle>Nastavit nové heslo</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-mono">Nové heslo</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input-vintage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-mono">Potvrzení hesla</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
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
                    Ukládám...
                  </>
                ) : (
                  "Nastavit heslo"
                )}
              </Button>
            </form>
          </PaperCardContent>
        </PaperCard>
      </div>
    </div>
  );
}
