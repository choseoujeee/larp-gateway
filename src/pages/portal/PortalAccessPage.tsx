import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FileText, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";
import { usePortalSession } from "@/hooks/usePortalSession";

export default function PortalAccessPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { verifyAccess, loading, error } = usePortalSession();
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    const success = await verifyAccess(token, password);
    
    if (success) {
      navigate(`/portal/${token}/view`);
    }
  };

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
                  Zadejte heslo
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Vaše přístupové heslo"
                  required
                  className="input-vintage text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">
                  {error}
                </p>
              )}

              <Button 
                type="submit" 
                className="w-full btn-vintage"
                disabled={loading}
              >
                {loading ? (
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
              Heslo jste obdrželi od organizátora hry.
              <br />
              Pokud ho neznáte, kontaktujte organizátory.
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
