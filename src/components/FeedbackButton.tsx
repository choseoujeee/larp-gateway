import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLarpContext } from "@/hooks/useLarpContext";

function extractPageName(pathname: string): string {
  // Portal pages
  if (pathname.includes("/portal/") && pathname.endsWith("/view")) {
    return "portal-view";
  }
  if (pathname.includes("/portal/")) {
    return "portal-access";
  }

  // Admin pages - extract last segment
  if (pathname.startsWith("/admin/")) {
    const segment = pathname.replace("/admin/", "");
    return segment || "admin-dashboard";
  }
  if (pathname === "/admin") {
    return "admin-dashboard";
  }

  // Auth pages
  if (pathname === "/login") return "login";
  if (pathname === "/register") return "register";

  // Landing
  if (pathname === "/") return "landing";

  return pathname.replace(/^\//, "") || "unknown";
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const { currentLarpId } = useLarpContext();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Prázdná zpráva",
        description: "Napište prosím nějakou zpětnou vazbu.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const sourcePage = extractPageName(location.pathname);

      // Get current user if logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("portal_feedback").insert({
        larp_id: currentLarpId || null,
        user_id: user?.id || null,
        source_page: sourcePage,
        content: content.trim(),
      });

      if (error) throw error;

      toast({
        title: "Děkujeme!",
        description: "Vaše zpětná vazba byla odeslána.",
      });
      setContent("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat zpětnou vazbu. Zkuste to znovu.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-4 right-4 z-50 gap-2 shadow-lg bg-background hover:bg-accent"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Zpětná vazba</span>
      </Button>

      {/* Feedback dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Zpětná vazba
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Máte nápad na vylepšení PORTÁLU nebo jste narazili na problém? Dejte nám vědět! Prosím dávejte zpětnou
              vazbu jen na funkce a vzhled POTRTÁLU, nikoli na obsah LARPu.
            </p>

            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              Stránka: <span className="font-mono">{extractPageName(location.pathname)}</span>
            </div>

            <Textarea
              placeholder="Napište svůj návrh nebo připomínku..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={4}
              className="resize-none"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{content.length}/2000</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
                  <X className="h-4 w-4 mr-1" />
                  Zrušit
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
                  <Send className="h-4 w-4 mr-1" />
                  {submitting ? "Odesílám..." : "Odeslat"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
