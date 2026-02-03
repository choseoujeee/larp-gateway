import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FileText, Loader2, FileStack, ListChecks, Music, Video, FileQuestion, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";

const PRODUCTION_PORTAL_SESSION_KEY = "larp_production_portal_session";

interface ProductionPortalSession {
  token: string;
  larp_id: string;
  larp_name: string;
  run_id: string | null;
  run_name: string | null;
}

interface PortalDocument {
  id: string;
  title: string;
  content: string | null;
  run_id: string | null;
}

interface PortalMaterial {
  id: string;
  material_type: string;
  title: string;
  url: string | null;
  note: string | null;
  sort_order: number;
}

interface PortalChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  sort_order: number;
}

function materialTypeIcon(type: string) {
  switch (type) {
    case "doc": return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    case "audio": return <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    case "video": return <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    default: return <FileQuestion className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

export default function ProductionPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [session, setSession] = useState<ProductionPortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [materials, setMaterials] = useState<PortalMaterial[]>([]);
  const [checklist, setChecklist] = useState<PortalChecklistItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const raw = localStorage.getItem(PRODUCTION_PORTAL_SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ProductionPortalSession;
        if (parsed.token === token) {
          setSession(parsed);
        }
      } catch {
        localStorage.removeItem(PRODUCTION_PORTAL_SESSION_KEY);
      }
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    setDataLoading(true);
    supabase.rpc("get_production_portal_data", { p_token: session.token })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Chyba při načítání dat");
          setDataLoading(false);
          return;
        }
        const payload = data as { documents?: PortalDocument[]; materials?: PortalMaterial[]; checklist?: PortalChecklistItem[] } | null;
        if (payload) {
          setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
          setMaterials(Array.isArray(payload.materials) ? payload.materials : []);
          setChecklist(Array.isArray(payload.checklist) ? payload.checklist : []);
        }
        setDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [session?.token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password.trim()) {
      toast.error("Zadejte heslo");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.rpc("verify_production_portal_access", {
      p_token: token,
      p_password: password.trim(),
    });
    setVerifying(false);
    if (error) {
      toast.error("Nepodařilo se ověřit přístup");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.larp_id) {
      toast.error("Nesprávné heslo");
      return;
    }
    const newSession: ProductionPortalSession = {
      token,
      larp_id: row.larp_id,
      larp_name: row.larp_name ?? "",
      run_id: row.run_id ?? null,
      run_name: row.run_name ?? null,
    };
    setSession(newSession);
    localStorage.setItem(PRODUCTION_PORTAL_SESSION_KEY, JSON.stringify(newSession));
    toast.success("Přihlášeno");
  };

  const handleLogout = () => {
    setSession(null);
    setDocuments([]);
    setMaterials([]);
    setChecklist([]);
    localStorage.removeItem(PRODUCTION_PORTAL_SESSION_KEY);
  };

  const handleChecklistToggle = async (item: PortalChecklistItem) => {
    if (!session?.token) return;
    const { data, error } = await supabase.rpc("set_checklist_item_completed", {
      p_token: session.token,
      p_item_id: item.id,
      p_completed: !item.completed,
    });
    if (error) {
      toast.error("Chyba při změně");
      return;
    }
    if (data === true) {
      setChecklist((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i))
      );
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PaperCard>
          <PaperCardContent className="py-8 text-center">
            <p className="text-muted-foreground">Neplatný odkaz na produkční portál.</p>
          </PaperCardContent>
        </PaperCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="font-typewriter text-2xl tracking-wider">Produkční portál</h1>
            <p className="text-sm text-muted-foreground mt-1">Přístup pro tým produkce</p>
          </div>
          <PaperCard>
            <PaperCardContent className="py-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-portal-password">Heslo</Label>
                  <Input
                    id="prod-portal-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Zadejte heslo"
                    autoFocus
                    disabled={verifying}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifying}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Přihlásit
                </Button>
              </form>
            </PaperCardContent>
          </PaperCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-typewriter text-2xl tracking-wide">{session.larp_name}</h1>
            <p className="text-sm text-muted-foreground">
              Produkční portál {session.run_name ? ` · ${session.run_name}` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Odhlásit
          </Button>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 1. Checklist před během */}
            {checklist.length > 0 && (
              <PaperCard>
                <PaperCardContent className="py-4">
                  <h2 className="font-typewriter text-xl tracking-wide flex items-center gap-2 mb-3">
                    <ListChecks className="h-5 w-5" />
                    Checklist před během
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">Zaškrtněte splněné úkoly – změny uvidí i organizátor v adminu.</p>
                  <ul className="space-y-2">
                    {checklist.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-md border bg-muted/20 hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleChecklistToggle(item)}
                          aria-label={item.title}
                        />
                        <span className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                          {item.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </PaperCardContent>
              </PaperCard>
            )}

            {/* 2. Dokumenty */}
            {documents.length > 0 && (
              <PaperCard>
                <PaperCardContent className="py-4">
                  <h2 className="font-typewriter text-lg flex items-center gap-2 mb-3">
                    <FileStack className="h-5 w-5" />
                    Dokumenty
                  </h2>
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="rounded-md border bg-muted/20 p-3">
                        <h3 className="font-medium mb-2">{doc.title}</h3>
                        {doc.content && (
                          <div
                            className="prose prose-sm max-w-none text-foreground"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </PaperCardContent>
              </PaperCard>
            )}

            {/* 3. Materiály – boxíky ve dvou sloupcích, celý box je klikatelný */}
            {materials.length > 0 && (
              <PaperCard>
                <PaperCardContent className="py-4">
                  <h2 className="font-typewriter text-xl tracking-wide flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5" />
                    Materiály
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => mat.url && window.open(mat.url, "_blank", "noopener,noreferrer")}
                        disabled={!mat.url}
                        className="flex items-center gap-3 py-3 px-3 rounded-md border bg-muted/20 hover:bg-muted/40 text-left w-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {materialTypeIcon(mat.material_type)}
                        <div className="min-w-0 flex-1">
                          <span className="font-medium truncate block">{mat.title}</span>
                          {mat.note && (
                            <span className="text-xs text-muted-foreground line-clamp-2 block">{mat.note}</span>
                          )}
                        </div>
                        {mat.url && (
                          <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                        )}
                      </button>
                    ))}
                  </div>
                </PaperCardContent>
              </PaperCard>
            )}

            {documents.length === 0 && materials.length === 0 && checklist.length === 0 && (
              <PaperCard>
                <PaperCardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Zatím zde nejsou žádné dokumenty, materiály ani úkoly.</p>
                </PaperCardContent>
              </PaperCard>
            )}
          </>
        )}

        <footer className="mt-8 pt-6 text-center text-sm text-muted-foreground border-t border-border">
          Produkční portál · {session.larp_name}
        </footer>
      </div>
    </div>
  );
}
