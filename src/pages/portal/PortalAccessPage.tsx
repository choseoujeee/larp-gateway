import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { FileText, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";
import { usePortalSession } from "@/hooks/usePortalSession";
import { useAuth } from "@/hooks/useAuth";

export default function PortalAccessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { verifyAccess, enterAsOrganizer, loading: portalLoading, error } = usePortalSession();
  const [password, setPassword] = useState("");
  const [accessChecking, setAccessChecking] = useState(true);

  const returnTo = searchParams.get("return_to");
  const fromCpPortal = searchParams.get("from_cp_portal") === "1";

  // Přihlášený organizátor/super admin: vstup bez hesla. Jinak from_cp_portal: zkusit vstup bez hesla (CP).
  // Počkáme na auth – dokud authLoading, neukončujeme checking (aby se neukázal formulář a pak redirect).
  useEffect(() => {
    if (!slug) {
      setAccessChecking(false);
      return;
    }
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        if (user) {
          const success = await enterAsOrganizer(slug);
          if (cancelled) return;
          if (success) {
            navigate(returnTo || `/hrac/${slug}/view`, { replace: true });
            return;
          }
        }
        if (!user && fromCpPortal) {
          const success = await verifyAccess(slug, "");
          if (cancelled) return;
          if (success) {
            navigate(returnTo || `/hrac/${slug}/view`, { replace: true });
            return;
          }
        }
      } finally {
        if (!cancelled) setAccessChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, authLoading, user, fromCpPortal, returnTo, navigate]);
  // Zobrazit "Ověřování..." i během načítání auth (ne přebliknout formulář)
  const showChecking = accessChecking || authLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    const success = await verifyAccess(slug, password);
    if (success) {
      navigate(returnTo || `/hrac/${slug}/view`);
    }
  };

  if (showChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Ověřování přístupu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="font-typewriter text-2xl tracking-wider text-foreground">
                LARP PORTÁL
              </h1>
              <p className="text-xs text-muted-foreground tracking-widest uppercase">
                Přístup k materiálům
              </p>
            </div>
          </div>
        </div>

        <PaperCard>
          <PaperCardHeader className="text-center">
            <Stamp variant="red" className="mb-4">
              Přísně tajné
            </Stamp>
            <PaperCardTitle>Ověření přístupu</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-mono">
                  Heslo (volitelné pro CP)
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Přístupové heslo – pro CP není potřeba"
                  className="input-vintage text-center text-lg tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Pro přístup jako CP (odkaz od organizátora) heslo není potřeba. Postavy zadají heslo od organizátora.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">
                  {error}
                </p>
              )}

              <Button 
                type="submit" 
                className="w-full btn-vintage"
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ověřování...
                  </>
                ) : (
                  "Vstoupit"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Heslo (pro postavy) jste obdrželi od organizátora hry.
              <br />
              CP vstupují přes odkaz bez hesla.
            </p>
          </PaperCardContent>
        </PaperCard>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground flex items-center justify-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Zpět na úvodní stránku
          </Link>
        </p>
      </div>
    </div>
  );
}
