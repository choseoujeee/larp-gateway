import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = email.trim().toLowerCase();
    
    if (!emailTrim) {
      toast.error("Vyplňte e-mail");
      return;
    }

    setLoading(true);

    // First lookup auth_email from organizer_accounts by matching login or auth_email
    const { data: account } = await supabase
      .from("organizer_accounts")
      .select("auth_email")
      .or(`login.eq.${emailTrim},auth_email.eq.${emailTrim}`)
      .maybeSingle();

    const authEmail = account?.auth_email ?? emailTrim;

    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${window.location.origin}/reset-heslo`,
    });

    setLoading(false);

    if (error) {
      toast.error("Chyba při odesílání", {
        description: error.message,
      });
      return;
    }

    setSent(true);
    toast.success("E-mail odeslán");
  };

  if (sent) {
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
                  Obnova hesla
                </p>
              </div>
            </Link>
          </div>

          <PaperCard>
            <PaperCardHeader>
              <PaperCardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-mail odeslán
              </PaperCardTitle>
            </PaperCardHeader>
            <PaperCardContent className="space-y-4">
              <p className="text-muted-foreground">
                Pokud účet s tímto e-mailem existuje, obdržíte odkaz pro nastavení nového hesla.
              </p>
              <p className="text-sm text-muted-foreground">
                Zkontrolujte také složku spam/nevyžádaná pošta.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zpět na přihlášení
                </Button>
              </Link>
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
                Obnova hesla
              </p>
            </div>
          </Link>
        </div>

        <PaperCard>
          <PaperCardHeader>
            <PaperCardTitle>Zapomenuté heslo</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Zadejte svůj login nebo e-mail a my vám zašleme odkaz pro nastavení nového hesla.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono">Login nebo e-mail</Label>
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="váš login nebo e-mail"
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
                    Odesílám...
                  </>
                ) : (
                  "Odeslat odkaz pro reset hesla"
                )}
              </Button>
            </form>
          </PaperCardContent>
        </PaperCard>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/login" className="hover:text-foreground">
            ← Zpět na přihlášení
          </Link>
        </p>
      </div>
    </div>
  );
}
