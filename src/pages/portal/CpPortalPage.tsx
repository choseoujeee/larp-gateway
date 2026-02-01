import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, Loader2, ArrowLeft, Users, User, ChevronRight, ChevronDown, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { sanitizeHtml } from "@/lib/sanitize";

interface CpPerson {
  id: string;
  name: string;
  slug: string;
  performer: string | null;
  performance_times: string | null;
}

interface PlayerPerson {
  id: string;
  name: string;
  slug: string;
  group_name: string | null;
}

interface Document {
  id: string;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: string;
  sort_order: number;
  priority: number;
}

interface LarpInfo {
  id: string;
  name: string;
  motto: string | null;
  theme: string | null;
}

interface RunInfo {
  id: string;
  name: string;
}

export default function CpPortalPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  
  const [larpInfo, setLarpInfo] = useState<LarpInfo | null>(null);
  const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
  const [cpPersons, setCpPersons] = useState<CpPerson[]>([]);
  const [playerPersons, setPlayerPersons] = useState<PlayerPerson[]>([]);
  const [cpDocuments, setCpDocuments] = useState<Document[]>([]);
  
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openDocuments, setOpenDocuments] = useState<Set<string>>(new Set());

  // Check for stored session
  useEffect(() => {
    const stored = localStorage.getItem(`cp_portal_${larpSlug}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.authenticated && parsed.larpId) {
          setAuthenticated(true);
          loadPortalData(parsed.larpId, parsed.runId);
        }
      } catch {
        localStorage.removeItem(`cp_portal_${larpSlug}`);
      }
    }
  }, [larpSlug]);

  const loadPortalData = async (larpId: string, runId: string | null) => {
    setLoading(true);
    try {
      // Load all CP persons for this larp
      const { data: cps } = await supabase
        .from("persons")
        .select("id, name, slug, performer, performance_times")
        .eq("larp_id", larpId)
        .eq("type", "cp")
        .order("name");
      
      if (cps) setCpPersons(cps);

      // Load all player persons (postavy) for this larp
      const { data: players } = await supabase
        .from("persons")
        .select("id, name, slug, group_name")
        .eq("larp_id", larpId)
        .eq("type", "postava")
        .order("name");
      
      if (players) setPlayerPersons(players);

      // Load CP documents (doc_type = 'cp')
      const { data: docs } = await supabase
        .from("documents")
        .select("id, title, content, doc_type, target_type, sort_order, priority")
        .eq("larp_id", larpId)
        .eq("doc_type", "cp")
        .order("priority")
        .order("sort_order");
      
      if (docs) setCpDocuments(docs as Document[]);
    } catch (err) {
      console.error("Error loading portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!larpSlug) return;

    setLoading(true);
    setError(null);

    try {
      // Verify password against any CP in this larp
      const { data, error: rpcError } = await supabase.rpc("verify_cp_portal_access", {
        p_larp_slug: larpSlug,
        p_password: password,
      });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        setError("Chyba při ověřování přístupu");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setError("Neplatné heslo");
        setLoading(false);
        return;
      }

      const row = data[0];
      setLarpInfo({
        id: row.larp_id,
        name: row.larp_name,
        motto: row.larp_motto,
        theme: row.larp_theme,
      });
      setRunInfo(row.run_id ? {
        id: row.run_id,
        name: row.run_name,
      } : null);

      // Apply theme
      const theme = row.larp_theme?.trim() || "wwii";
      document.documentElement.dataset.theme = theme;

      // Store session
      localStorage.setItem(`cp_portal_${larpSlug}`, JSON.stringify({
        authenticated: true,
        larpId: row.larp_id,
        runId: row.run_id,
      }));

      setAuthenticated(true);
      await loadPortalData(row.larp_id, row.run_id);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Neočekávaná chyba");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(`cp_portal_${larpSlug}`);
    setAuthenticated(false);
    setLarpInfo(null);
    setCpPersons([]);
    setPlayerPersons([]);
    setCpDocuments([]);
    document.documentElement.removeAttribute("data-theme");
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleDocument = (docId: string) => {
    setOpenDocuments(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Group players by group_name
  const playersByGroup = playerPersons.reduce((acc, player) => {
    const group = player.group_name || "Bez skupiny";
    if (!acc[group]) acc[group] = [];
    acc[group].push(player);
    return acc;
  }, {} as Record<string, PlayerPerson[]>);

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-primary">
                <Users className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h1 className="font-typewriter text-2xl tracking-wider text-foreground">
                  CP PORTÁL
                </h1>
                <p className="text-xs text-muted-foreground tracking-widest uppercase">
                  Rozcestník pro cizí postavy
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
                    Zadejte CP heslo
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Heslo pro CP"
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
                Toto heslo jste obdrželi jako performer CP.
                <br />
                Pro přístup k jednotlivým postavám použijte jejich vlastní hesla.
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

  // Authenticated view
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-8 px-4 text-center border-b border-border">
        <h1 className="font-typewriter text-4xl md:text-5xl tracking-widest text-foreground uppercase mb-2">
          {larpInfo?.name || "CP Portál"}
        </h1>
        {larpInfo?.motto && (
          <p className="text-muted-foreground italic text-lg max-w-2xl mx-auto">
            „{larpInfo.motto}"
          </p>
        )}
        {runInfo && (
          <Badge variant="secondary" className="mt-4">
            {runInfo.name}
          </Badge>
        )}
        
        <div className="flex items-center justify-center gap-2 mt-6 no-print">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Odhlásit se z CP portálu
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* CP Documents Section */}
          {cpDocuments.length > 0 && (
            <section>
              <h2 className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Společné dokumenty pro CP
              </h2>
              <PaperCard className="overflow-hidden">
                <Collapsible 
                  open={openCategories.has("cp-docs")} 
                  onOpenChange={() => toggleCategory("cp-docs")}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {openCategories.has("cp-docs") ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-typewriter text-sm tracking-wider uppercase">
                        CP materiály
                      </span>
                      <span className="text-sm text-muted-foreground">({cpDocuments.length})</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="divide-y divide-border/50">
                      {cpDocuments.map((doc, index) => (
                        <Collapsible
                          key={doc.id}
                          open={openDocuments.has(doc.id)}
                          onOpenChange={() => toggleDocument(doc.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <button 
                              className={`w-full text-left py-2 px-4 flex items-center gap-2 hover:bg-muted/50 transition-colors ${
                                index % 2 === 0 ? "bg-muted/20" : ""
                              }`}
                            >
                              <ChevronRight 
                                className={`h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0 ${
                                  openDocuments.has(doc.id) ? "rotate-90" : ""
                                }`} 
                              />
                              {doc.priority === 1 && (
                                <span className="text-xs font-bold text-accent uppercase tracking-wider flex-shrink-0">[PRIORITNÍ]</span>
                              )}
                              <span className="text-sm text-foreground">{doc.title}</span>
                              {doc.priority === 3 && (
                                <span className="text-xs text-muted-foreground uppercase tracking-wider flex-shrink-0">[VOLITELNÉ]</span>
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 py-4 bg-background border-t border-border">
                              {doc.content && (
                                <div
                                  className="prose prose-sm max-w-none text-muted-foreground"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                                />
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </PaperCard>
            </section>
          )}

          {/* CP Roles Section */}
          <section>
            <h2 className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cizí postavy ({cpPersons.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cpPersons.map((cp) => (
                <Link
                  key={cp.id}
                  to={`/hrac/${cp.slug}`}
                  className="group"
                >
                  <PaperCard className="p-4 hover:shadow-md transition-all cursor-pointer">
                    <h3 className="font-typewriter text-lg tracking-wide group-hover:text-primary transition-colors">
                      {cp.name}
                    </h3>
                    {cp.performer && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {cp.performer}
                      </p>
                    )}
                    {cp.performance_times && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {cp.performance_times.length > 50 
                          ? cp.performance_times.substring(0, 50) + "..." 
                          : cp.performance_times}
                      </p>
                    )}
                  </PaperCard>
                </Link>
              ))}
              {cpPersons.length === 0 && (
                <p className="text-muted-foreground col-span-2 text-center py-8">
                  Zatím nejsou vytvořeny žádné CP.
                </p>
              )}
            </div>
          </section>

          {/* Player Characters Section - grouped by group_name */}
          <section>
            <h2 className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4 flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Herní postavy ({playerPersons.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Kliknutím na postavu můžete nahlédnout do jejich materiálů (použijte CP heslo).
            </p>
            
            {Object.entries(playersByGroup).sort(([a], [b]) => a.localeCompare(b, "cs")).map(([groupName, players]) => (
              <div key={groupName} className="mb-6">
                <h3 className="font-typewriter text-sm tracking-wider uppercase text-muted-foreground mb-2">
                  {groupName}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {players.map((player) => (
                    <Link
                      key={player.id}
                      to={`/hrac/${player.slug}`}
                      className="group"
                    >
                      <div className="p-3 rounded border bg-card hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          {player.name}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            
            {playerPersons.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Zatím nejsou vytvořeny žádné herní postavy.
              </p>
            )}
          </section>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>
          Pro vstup do konkrétní CP použijte její individuální heslo.
        </p>
      </footer>
    </div>
  );
}
