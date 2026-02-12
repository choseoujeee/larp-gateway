import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, Loader2, ArrowLeft, Users, User, ChevronRight, ChevronDown, Gamepad2, Clock, Theater } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Stamp } from "@/components/ui/stamp";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { sanitizeHtml } from "@/lib/sanitize";

interface CpPerson {
  id: string;
  name: string;
  slug: string;
  performer: string | null;
  performance_times: string | null;
}

interface CpStats {
  documentsCount: number;
  scenesCount: number;
  sceneTimesSummary: string | null;
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
  visible_to_cp?: boolean;
}

interface LarpInfo {
  id: string;
  name: string;
  motto: string | null;
  theme: string | null;
  footer_text: string | null;
}

interface RunInfo {
  id: string;
  name: string;
}

export default function CpPortalPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [organizerChecking, setOrganizerChecking] = useState(true);
  
  const [larpInfo, setLarpInfo] = useState<LarpInfo | null>(null);
  const [runInfo, setRunInfo] = useState<RunInfo | null>(null);
  const [cpPersons, setCpPersons] = useState<CpPerson[]>([]);
  const [cpStats, setCpStats] = useState<Record<string, CpStats>>({});
  const [cpScenesByCpId, setCpScenesByCpId] = useState<Record<string, { day_number: number; start_time: string; title: string | null }[]>>({});
  const [playerPersons, setPlayerPersons] = useState<PlayerPerson[]>([]);
  const [cpDocuments, setCpDocuments] = useState<Document[]>([]);
  
  const [cpSearch, setCpSearch] = useState("");
  const [filterPerformer, setFilterPerformer] = useState<string>("");
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterTimeFrom, setFilterTimeFrom] = useState<string>("");
  const [filterTimeTo, setFilterTimeTo] = useState<string>("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerGroupFilter, setPlayerGroupFilter] = useState<string>("");
  const [playerViewMode, setPlayerViewMode] = useState<"groups" | "all">("groups");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openDocuments, setOpenDocuments] = useState<Set<string>>(new Set());

  // Stored session nebo přihlášený organizátor/super admin: vstup bez hesla
  useEffect(() => {
    if (!larpSlug) {
      setOrganizerChecking(false);
      return;
    }
    const stored = localStorage.getItem(`cp_portal_${larpSlug}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.authenticated && parsed.larpId) {
          setAuthenticated(true);
          loadPortalData(parsed.larpId, parsed.runId ?? null);
          setOrganizerChecking(false);
          return;
        }
      } catch {
        localStorage.removeItem(`cp_portal_${larpSlug}`);
      }
    }
    if (authLoading) return;
    if (!user) {
      setOrganizerChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // First get larp_id from slug, then check access
      const { data: larpData } = await supabase
        .from("larps")
        .select("id")
        .eq("slug", larpSlug)
        .single();
      if (!larpData) {
        setOrganizerChecking(false);
        return;
      }
      const { data: canAccess } = await supabase.rpc("can_access_larp", {
        p_larp_id: larpData.id,
      });
      if (cancelled || !canAccess) {
        setOrganizerChecking(false);
        return;
      }
      const { data: larpRow, error: larpErr } = await supabase
        .from("larps")
        .select("id, name, motto, theme, footer_text")
        .eq("slug", larpSlug)
        .single();
      if (larpErr || !larpRow) {
        setOrganizerChecking(false);
        return;
      }
      const larpId = larpRow.id as string;
      const { data: runRow } = await supabase
        .from("runs")
        .select("id, name")
        .eq("larp_id", larpId)
        .eq("is_active", true)
        .order("date_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      const runId = runRow?.id ?? null;
      const theme = (larpRow.theme as string)?.trim() || "wwii";
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(`cp_portal_${larpSlug}`, JSON.stringify({
        authenticated: true,
        larpId,
        runId,
      }));
      setLarpInfo({
        id: larpId,
        name: larpRow.name as string,
        motto: (larpRow.motto as string) ?? null,
        theme: (larpRow.theme as string) ?? null,
        footer_text: (larpRow.footer_text as string) ?? null,
      });
      setRunInfo(runRow ? { id: runRow.id as string, name: runRow.name as string } : null);
      setAuthenticated(true);
      await loadPortalData(larpId, runId);
      setOrganizerChecking(false);
    })();
    return () => { cancelled = true; };
  }, [larpSlug, authLoading, user]);

  const loadPortalData = async (larpId: string, runId: string | null) => {
    setLoading(true);
    try {
      // Use security definer RPC to bypass RLS for portal access
      const { data: portalData, error: rpcErr } = await supabase.rpc("get_cp_portal_full_data", {
        p_larp_id: larpId,
        p_run_id: runId,
      });

      if (rpcErr) {
        console.error("Error loading portal data:", rpcErr);
        setLoading(false);
        return;
      }

      const pd = portalData as any;

      // Update larp footer
      setLarpInfo((prev) =>
        prev ? { ...prev, footer_text: pd.larp_footer_text ?? null } : null
      );

      const cps: CpPerson[] = pd.cp_persons ?? [];
      setCpPersons(cps);
      setPlayerPersons(pd.player_persons ?? []);
      setCpDocuments(pd.cp_documents ?? []);

      // Process scenes
      type SceneRow = { cp_id: string; day_number: number; start_time: string; title: string | null };
      const allScenes: SceneRow[] = pd.cp_scenes ?? [];
      const scenesByCp = allScenes.reduce((acc, s) => {
        if (!acc[s.cp_id]) acc[s.cp_id] = [];
        acc[s.cp_id].push({ day_number: s.day_number, start_time: s.start_time, title: s.title });
        return acc;
      }, {} as Record<string, { day_number: number; start_time: string; title: string | null }[]>);
      setCpScenesByCpId(scenesByCp);

      // Build CP stats
      // We need per-CP document counts - fetch via RPC as well
      const { data: cpDocs } = await supabase.rpc("get_cp_portal_full_data", {
        p_larp_id: larpId,
        p_run_id: runId,
      });
      // Actually, for document counts per CP we need individual docs. Let's compute from what we have
      // or add a separate query. For now, let's get per-CP docs count via a simple approach:
      const stats: Record<string, CpStats> = {};
      for (const cp of cps) {
        const sceneList = scenesByCp[cp.id] ?? [];
        stats[cp.id] = {
          documentsCount: 0, // Will be loaded separately if needed
          scenesCount: sceneList.length,
          sceneTimesSummary:
            sceneList.length > 0
              ? sceneList
                  .map((s) => {
                    const time = `Den ${s.day_number} ${s.start_time.substring(0, 5)}`;
                    return s.title?.trim() ? `${time} · ${s.title.trim()}` : time;
                  })
                  .join(", ")
              : null,
        };
      }
      setCpStats(stats);
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
        footer_text: null,
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
    setCpStats({});
    setCpScenesByCpId({});
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

  const qCp = cpSearch.trim().toLowerCase();
  const dayNumFilter = filterDay === "" ? null : parseInt(filterDay, 10);

  const filteredCpPersons = cpPersons.filter((cp) => {
    if (qCp && !cp.name.toLowerCase().includes(qCp) && !(cp.performer?.toLowerCase().includes(qCp) ?? false))
      return false;
    if (filterPerformer && (cp.performer || "") !== filterPerformer) return false;
    const scenes = cpScenesByCpId[cp.id] ?? [];
    if (dayNumFilter != null && !scenes.some((s) => s.day_number === dayNumFilter)) return false;
    const timeFrom = filterTimeFrom.trim().substring(0, 5);
    const timeTo = filterTimeTo.trim().substring(0, 5);
    if (timeFrom && !scenes.some((s) => s.start_time.substring(0, 5) >= timeFrom)) return false;
    if (timeTo && !scenes.some((s) => s.start_time.substring(0, 5) <= timeTo)) return false;
    return true;
  });

  const qPlayer = playerSearch.trim().toLowerCase();
  const filteredPlayerPersons = playerPersons.filter((p) => {
    const matchesSearch =
      !qPlayer ||
      p.name.toLowerCase().includes(qPlayer) ||
      (p.group_name?.toLowerCase().includes(qPlayer) ?? false);
    const matchesGroup =
      !playerGroupFilter || (p.group_name || "Bez skupiny") === playerGroupFilter;
    return matchesSearch && matchesGroup;
  });

  const uniqueGroupNames = [...new Set(playerPersons.map((p) => p.group_name || "Bez skupiny"))].sort(
    (a, b) => a.localeCompare(b, "cs")
  );

  const uniquePerformers = [...new Set(cpPersons.map((cp) => cp.performer).filter((p): p is string => !!p))].sort(
    (a, b) => a.localeCompare(b, "cs")
  );
  const uniqueSceneDays = [...new Set(Object.values(cpScenesByCpId).flat().map((s) => s.day_number))].sort(
    (a, b) => a - b
  );

  const playersByGroup = filteredPlayerPersons.reduce((acc, player) => {
    const group = player.group_name || "Bez skupiny";
    if (!acc[group]) acc[group] = [];
    acc[group].push(player);
    return acc;
  }, {} as Record<string, PlayerPerson[]>);

  // Kontrola přístupu organizátora nebo načítání
  if (!authenticated) {
    if (organizerChecking) {
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
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Odhlásit se z CP portálu
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Společné dokumenty pro CP – vždy nahoře */}
          <section aria-labelledby="cp-docs-heading">
            <h2 id="cp-docs-heading" className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4 flex items-center gap-2">
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
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {openCategories.has("cp-docs") ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="font-typewriter text-sm tracking-wider uppercase">
                      Dokumenty pro všechny CP
                    </span>
                    <span className="text-sm text-muted-foreground">({cpDocuments.length})</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {cpDocuments.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Zatím zde nejsou žádné společné dokumenty. Přidáte je v adminu v sekci Dokumenty s cílením „Skupina: CP“.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {cpDocuments.map((doc, index) => (
                        <Collapsible
                          key={doc.id}
                          open={openDocuments.has(doc.id)}
                          onOpenChange={() => toggleDocument(doc.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <button 
                              className={`w-full text-left py-3 px-4 flex items-center gap-2.5 hover:bg-muted/50 transition-colors ${
                                index % 2 === 0 ? "bg-muted/20" : ""
                              }`}
                            >
                              <ChevronRight 
                                className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${
                                  openDocuments.has(doc.id) ? "rotate-90" : ""
                                }`} 
                              />
                              {doc.priority === 1 && (
                                <span className="text-xs font-bold text-accent uppercase tracking-wider flex-shrink-0">[PRIORITNÍ]</span>
                              )}
                              <span className="text-base text-foreground">{doc.title}</span>
                              {doc.priority === 3 && (
                                <span className="text-xs text-muted-foreground uppercase tracking-wider flex-shrink-0">[VOLITELNÉ]</span>
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-5 py-5 bg-background border-t border-border">
                              {doc.content && (
                                <div
                                  className="prose max-w-none text-base leading-relaxed text-foreground"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content) }}
                                />
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </PaperCard>
          </section>

          {/* CP Roles Section */}
          <section aria-labelledby="cp-roles-heading">
            <h2 id="cp-roles-heading" className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cizí postavy ({filteredCpPersons.length})
            </h2>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <Label htmlFor="cp-search" className="text-sm text-muted-foreground">
                  Vyhledat
                </Label>
                <Input
                  id="cp-search"
                  type="search"
                  placeholder="Podle názvu nebo performera..."
                  value={cpSearch}
                  onChange={(e) => setCpSearch(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="w-[180px]">
                <Label htmlFor="cp-filter-performer" className="text-sm text-muted-foreground">
                  Performer
                </Label>
                <Select value={filterPerformer || "all"} onValueChange={(v) => setFilterPerformer(v === "all" ? "" : v)}>
                  <SelectTrigger id="cp-filter-performer" className="mt-1">
                    <SelectValue placeholder="Všichni" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všichni</SelectItem>
                    {uniquePerformers.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[100px]">
                <Label htmlFor="cp-filter-day" className="text-sm text-muted-foreground">
                  Den scény
                </Label>
                <Select value={filterDay || "all"} onValueChange={(v) => setFilterDay(v === "all" ? "" : v)}>
                  <SelectTrigger id="cp-filter-day" className="mt-1">
                    <SelectValue placeholder="Vše" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vše</SelectItem>
                    {uniqueSceneDays.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Den {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[100px]">
                <Label htmlFor="cp-filter-time-from" className="text-sm text-muted-foreground">
                  Čas od
                </Label>
                <Input
                  id="cp-filter-time-from"
                  type="time"
                  value={filterTimeFrom}
                  onChange={(e) => setFilterTimeFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="w-[100px]">
                <Label htmlFor="cp-filter-time-to" className="text-sm text-muted-foreground">
                  Čas do
                </Label>
                <Input
                  id="cp-filter-time-to"
                  type="time"
                  value={filterTimeTo}
                  onChange={(e) => setFilterTimeTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCpPersons.map((cp) => {
                const stats = cpStats[cp.id];
                return (
                  <Link
                    key={cp.id}
                    to={larpSlug ? `/cp/${larpSlug}/${cp.slug}` : `/hrac/${cp.slug}?from_cp_portal=1`}
                    className="group"
                  >
                    <PaperCard className="p-4 hover:shadow-md transition-all cursor-pointer">
                      <h3 className="font-typewriter text-lg tracking-wide group-hover:text-primary transition-colors">
                        {cp.name}
                      </h3>
                      {stats?.sceneTimesSummary && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{stats.sceneTimesSummary}</span>
                        </p>
                      )}
                      {cp.performer && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{cp.performer}</span>
                        </p>
                      )}
                      {stats && (
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {stats.documentsCount} dok
                          </span>
                          <span className="flex items-center gap-1">
                            <Theater className="h-3 w-3" />
                            {stats.scenesCount} scén
                          </span>
                        </div>
                      )}
                    </PaperCard>
                  </Link>
                );
              })}
              {filteredCpPersons.length === 0 && (
                <p className="text-muted-foreground col-span-2 text-center py-8">
                  {cpPersons.length === 0
                    ? "Zatím nejsou vytvořeny žádné CP."
                    : "Žádná CP nevyhovuje vyhledávání."}
                </p>
              )}
            </div>
          </section>

          {/* Player Characters Section - grouped by group_name or flat */}
          <section>
            <h2 className="font-typewriter text-xl tracking-wider uppercase text-foreground mb-4 flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Herní postavy ({filteredPlayerPersons.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Kliknutím na postavu můžete nahlédnout do jejich materiálů (z CP portálu bez hesla).
            </p>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="player-search" className="text-sm text-muted-foreground sr-only">
                  Vyhledat postavu
                </Label>
                <Input
                  id="player-search"
                  type="search"
                  placeholder="Vyhledat podle názvu nebo skupiny..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                />
              </div>
              <div className="w-[200px]">
                <Label htmlFor="player-group" className="text-sm text-muted-foreground">
                  Skupina
                </Label>
                <Select
                  value={playerGroupFilter || "all"}
                  onValueChange={(v) => setPlayerGroupFilter(v === "all" ? "" : v)}
                >
                  <SelectTrigger id="player-group">
                    <SelectValue placeholder="Všechny skupiny" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny skupiny</SelectItem>
                    {uniqueGroupNames.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Zobrazení</Label>
                <Select value={playerViewMode} onValueChange={(v: "groups" | "all") => setPlayerViewMode(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="groups">Po skupinách</SelectItem>
                    <SelectItem value="all">Všichni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {playerViewMode === "groups" ? (
              Object.entries(playersByGroup).sort(([a], [b]) => a.localeCompare(b, "cs")).map(([groupName, players]) => (
                <div key={groupName} className="mb-6">
                  <h3 className="font-typewriter text-sm tracking-wider uppercase text-muted-foreground mb-2">
                    {groupName}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {players.map((player) => (
                      <Link
                        key={player.id}
                        to={`/hrac/${player.slug}?from_cp_portal=1`}
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
              ))
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {filteredPlayerPersons.map((player) => (
                  <Link
                    key={player.id}
                    to={`/hrac/${player.slug}?from_cp_portal=1`}
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
            )}
            
            {filteredPlayerPersons.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                {playerPersons.length === 0
                  ? "Zatím nejsou vytvořeny žádné herní postavy."
                  : "Žádná postava nevyhovuje vyhledávání nebo filtru skupiny."}
              </p>
            )}
          </section>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t border-border space-y-3">
        {larpInfo?.footer_text ? (
          <p className="whitespace-pre-line">{larpInfo.footer_text}</p>
        ) : null}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Odhlásit se z CP portálu
        </Button>
      </footer>
    </div>
  );
}
