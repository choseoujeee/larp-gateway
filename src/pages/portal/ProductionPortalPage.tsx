import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, Loader2, FileStack, ListChecks, Music, Video, FileQuestion, LogOut, ExternalLink, ChevronRight, ChevronDown, FoldVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";

const PRODUCTION_PORTAL_SESSION_KEY = "larp_production_portal_session";

interface ProductionPortalSession {
  token: string;
  larp_id: string;
  larp_name: string;
  larp_slug: string | null;
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
  checklist_group?: string;
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
  const [openDocuments, setOpenDocuments] = useState<Set<string>>(new Set());

  const toggleDocument = (docId: string) => {
    setOpenDocuments(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  // Check for passwordless access first
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
          setLoading(false);
          return;
        }
      } catch {
        localStorage.removeItem(PRODUCTION_PORTAL_SESSION_KEY);
      }
    }
    supabase.rpc("check_production_portal_passwordless" as any, { p_token: token })
      .then(({ data, error }) => {
        if (!error && data && typeof data === "object" && (data as any).larp_id) {
          const d = data as any;
          const newSession: ProductionPortalSession = {
            token,
            larp_id: d.larp_id,
            larp_name: d.larp_name ?? "",
            larp_slug: d.larp_slug ?? null,
            run_id: d.run_id ?? null,
            run_name: d.run_name ?? null,
          };
          setSession(newSession);
          localStorage.setItem(PRODUCTION_PORTAL_SESSION_KEY, JSON.stringify(newSession));
        }
        setLoading(false);
      });
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
      larp_slug: row.larp_slug ?? null,
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
    setOpenDocuments(new Set());
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
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
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Heslo vám poskytne organizátor.
                </p>
              </form>
            </PaperCardContent>
          </PaperCard>
        </div>
      </div>
    );
  }

  const hasAnyOpenDocs = openDocuments.size > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-8 px-4 text-center border-b border-border">
        <h1 className="font-typewriter text-4xl md:text-5xl tracking-widest text-foreground uppercase mb-2">
          {session.larp_name}
        </h1>
        <p className="text-muted-foreground text-lg">
          Produkční portál {session.run_name ? ` · ${session.run_name}` : ""}
        </p>
        {session.larp_slug && (
          <div className="flex items-center justify-center gap-2 mt-4 no-print">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/cp/${session.larp_slug}`}>
                CP portál
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Floating ThemeToggle */}
      <div className="fixed bottom-4 right-20 z-50 no-print">
        <ThemeToggle />
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {dataLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* 1. Checklist */}
              {checklist.length > 0 && (() => {
                const groups = [...new Set(checklist.map((i) => i.checklist_group || "Hlavní"))];
                const hasMultiple = groups.length > 1;
                return (
                <section aria-labelledby="prod-checklist-heading">
                <PaperCard>
                  <PaperCardContent className="py-4">
                    <h2 id="prod-checklist-heading" className="font-typewriter text-xl tracking-wider uppercase text-foreground flex items-center gap-2 mb-3">
                      <ListChecks className="h-5 w-5" />
                      Checklist před během
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">Zaškrtněte splněné úkoly – změny uvidí i organizátor v adminu.</p>
                    <div className={hasMultiple ? "grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : ""}>
                      {groups.sort((a, b) => a.localeCompare(b, "cs")).map((group) => {
                        const groupItems = checklist.filter((i) => (i.checklist_group || "Hlavní") === group);
                        return (
                          <div key={group} className={hasMultiple ? "border rounded-md p-3" : ""}>
                            {hasMultiple && (
                              <h3 className="font-typewriter text-sm tracking-wider uppercase mb-2 text-muted-foreground">{group}</h3>
                            )}
                            <ul className="space-y-2">
                              {groupItems.map((item) => (
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
                          </div>
                        );
                      })}
                    </div>
                  </PaperCardContent>
                </PaperCard>
                </section>
                );
              })()}

              {/* 2. Dokumenty – Collapsible styl jako hráčský portál */}
              {documents.length > 0 && (
                <section aria-labelledby="prod-docs-heading" className="pt-4">
                  <h2 id="prod-docs-heading" className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4 flex items-center gap-2">
                    <FileStack className="h-5 w-5" />
                    Dokumenty
                  </h2>
                  <PaperCard className="overflow-hidden">
                    <div className="divide-y divide-border">
                      {documents.map((doc, index) => (
                        <Collapsible
                          key={doc.id}
                          open={openDocuments.has(doc.id)}
                          onOpenChange={() => toggleDocument(doc.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <button
                              className={`w-full text-left py-3 px-4 flex items-center gap-2.5 hover:bg-muted/40 transition-colors sticky top-0 z-10 bg-background border-b border-border ${
                                index % 2 === 0 && !openDocuments.has(doc.id) ? "bg-muted/20" : ""
                              }`}
                            >
                              <ChevronRight
                                className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${
                                  openDocuments.has(doc.id) ? "rotate-90" : ""
                                }`}
                              />
                              <span className="text-base text-foreground">{doc.title}</span>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-5 py-5 bg-background">
                              {doc.content ? (
                                <div
                                  className="prose max-w-none text-base leading-relaxed text-foreground [&_h1]:mt-6 [&_h1]:mb-3 [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_p]:mb-3 [&_p:last-child]:mb-0"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">Bez obsahu.</p>
                              )}
                              <div className="border-t border-border mt-4 pt-3 text-center no-print">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDocument(doc.id);
                                  }}
                                  className="text-xs uppercase tracking-wider"
                                >
                                  <FoldVertical className="h-3.5 w-3.5 mr-1.5" />
                                  Sbalit
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </PaperCard>
                  {hasAnyOpenDocs && (
                    <div className="text-center pt-4 no-print">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenDocuments(new Set())}
                        className="btn-vintage"
                      >
                        <FoldVertical className="h-4 w-4 mr-2" />
                        Sbalit vše
                      </Button>
                    </div>
                  )}
                </section>
              )}

              {/* 3. Materiály */}
              {materials.length > 0 && (
                <section aria-labelledby="prod-materials-heading">
                <PaperCard>
                  <PaperCardContent className="py-4">
                    <h2 id="prod-materials-heading" className="font-typewriter text-xl tracking-wider uppercase text-foreground flex items-center gap-2 mb-3">
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
                </section>
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
        </div>
      </main>

      <footer className="no-print container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t border-border space-y-3">
        <p>Produkční portál · {session.larp_name}</p>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Odhlásit
        </Button>
      </footer>
    </div>
  );
}
