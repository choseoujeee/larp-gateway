import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Loader2, Search, Trash2, ArrowLeft, UserPlus, Copy, Pencil, Mail, Phone } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { PersonFormDialog } from "../components/PersonFormDialog";
import { PerformerEditDialog } from "../components/PerformerEditDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useRun } from "../hooks/useRun";
import { useLarpPerformerHistory } from "../hooks/useLarpPlayerHistory";
import { toast } from "sonner";

interface CP {
  id: string;
  name: string;
  slug: string;
  group_name: string | null;
}
interface Performer {
  id?: string;
  run_id: string;
  cp_id: string;
  performer_name: string;
  performer_email: string | null;
  performer_phone: string | null;
  dirty?: boolean;
}

export default function V2RunCpPage() {
  const { larpSlug, runSlug } = useParams<{ larpSlug: string; runSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { run, loading: runLoading, notFound } = useRun(larpSlug, runSlug);
  const [cps, setCps] = useState<CP[]>([]);
  const [performers, setPerformers] = useState<Record<string, Performer>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "missing">("all");
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const { performers: history } = useLarpPerformerHistory(run?.larp_id);

  const load = useCallback(async () => {
    if (!run) return;
    setLoading(true);
    const [{ data: ps }, { data: pf }] = await Promise.all([
      supabase.from("persons").select("id, name, slug, group_name").eq("larp_id", run.larp_id).eq("type", "cp").order("name"),
      supabase.from("cp_performers").select("id, run_id, cp_id, performer_name, performer_email, performer_phone").eq("run_id", run.id),
    ]);
    setCps((ps ?? []) as CP[]);
    const map: Record<string, Performer> = {};
    (pf ?? []).forEach((p) => { map[p.cp_id] = p as Performer; });
    setPerformers(map);
    setLoading(false);
  }, [run]);

  useEffect(() => { load(); }, [load]);

  function update(cpId: string, patch: Partial<Performer>) {
    setPerformers((prev) => {
      const existing = prev[cpId] ?? { run_id: run!.id, cp_id: cpId, performer_name: "", performer_email: "", performer_phone: "" };
      return { ...prev, [cpId]: { ...existing, ...patch, dirty: true } };
    });
  }

  async function save(cpId: string) {
    const p = performers[cpId];
    if (!p?.performer_name?.trim()) { toast.error("Vyplň jméno performera"); return; }
    setSavingId(cpId);
    try {
      if (p.id) {
        const { error } = await supabase.from("cp_performers").update({
          performer_name: p.performer_name.trim(),
          performer_email: p.performer_email?.trim() || null,
          performer_phone: p.performer_phone?.trim() || null,
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cp_performers").insert({
          run_id: run!.id,
          cp_id: cpId,
          performer_name: p.performer_name.trim(),
          performer_email: p.performer_email?.trim() || null,
          performer_phone: p.performer_phone?.trim() || null,
        });
        if (error) throw error;
      }
      toast.success("Uloženo");
      await load();
    } catch (e) {
      toast.error("Chyba: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingId(null);
    }
  }

  async function remove(cpId: string) {
    const p = performers[cpId];
    if (!p?.id) return;
    if (!confirm("Odebrat performera z tohoto CP v běhu?")) return;
    const { error } = await supabase.from("cp_performers").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Odebráno");
    load();
  }

  async function copyFromPreviousRun() {
    if (!run) return;
    const { data: prev } = await supabase
      .from("runs")
      .select("id, name")
      .eq("larp_id", run.larp_id)
      .neq("id", run.id)
      .lte("date_from", run.date_from ?? new Date().toISOString().slice(0, 10))
      .order("date_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prev) { toast.error("Nenašel jsem žádný dřívější běh"); return; }
    if (!confirm(`Zkopírovat performery z běhu „${prev.name}"? Stávající přiřazení v tomto běhu zůstanou.`)) return;
    const { data: src } = await supabase.from("cp_performers").select("cp_id, performer_name, performer_email, performer_phone").eq("run_id", prev.id);
    let copied = 0;
    for (const s of (src ?? [])) {
      if (performers[s.cp_id]?.id) continue; // skip if already set
      const { error } = await supabase.from("cp_performers").insert({
        run_id: run.id, cp_id: s.cp_id,
        performer_name: s.performer_name,
        performer_email: s.performer_email,
        performer_phone: s.performer_phone,
      });
      if (!error) copied++;
    }
    toast.success(`Zkopírováno ${copied} performerů`);
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cps.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.group_name ?? "").toLowerCase().includes(q)) return false;
      if (filter === "missing" && performers[c.id]?.id) return false;
      return true;
    });
  }, [cps, performers, search, filter]);

  const totalAssigned = Object.values(performers).filter((p) => p.id).length;

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/beh/${runSlug}/cp`} replace />;
  if (notFound) return <Navigate to={`/larp/${larpSlug}`} replace />;

  return (
    <V2Shell larpName={run?.larp_name} runName={run?.name}>
      {runLoading || !run ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2">
              <Link to={`/larp/${larpSlug}/beh/${runSlug}`}><ArrowLeft className="mr-1 h-4 w-4" />Přehled běhu</Link>
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">CP performeři — {run.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Přiřazeno {totalAssigned} z {cps.length} CP
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPersonDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />Nové CP
                </Button>
                <Button variant="outline" size="sm" onClick={copyFromPreviousRun}>
                  <Copy className="mr-2 h-4 w-4" />Z předchozího běhu
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat CP nebo skupinu…" className="pl-9" />
            </div>
            <div className="flex gap-1">
              <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Vše</Button>
              <Button variant={filter === "missing" ? "default" : "outline"} size="sm" onClick={() => setFilter("missing")}>Bez performera</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {cps.length === 0 ? "Tento LARP ještě nemá žádné CP." : "Žádné CP nevyhovuje filtru."}
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const p = performers[c.id] ?? { run_id: run.id, cp_id: c.id, performer_name: "", performer_email: "", performer_phone: "" };
                const hasPerformer = !!p.id;
                return (
                  <Card key={c.id} className={hasPerformer ? "border-l-4 border-l-green-500" : ""}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-typewriter text-base">{c.name}</div>
                          {c.group_name && <div className="text-xs text-muted-foreground">{c.group_name}</div>}
                        </div>
                        <div className="flex gap-1">
                          {hasPerformer && (
                            <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <ContactAutocomplete
                          field="name"
                          suggestions={history}
                          value={p.performer_name ?? ""}
                          onChange={(v) => update(c.id, { performer_name: v })}
                          onPick={(s) => update(c.id, { performer_name: s.display_name, performer_email: p.performer_email || s.email || "", performer_phone: p.performer_phone || s.phone || "" })}
                          placeholder="Jméno performera"
                        />
                        <ContactAutocomplete
                          field="email"
                          suggestions={history}
                          value={p.performer_email ?? ""}
                          onChange={(v) => update(c.id, { performer_email: v })}
                          onPick={(s) => update(c.id, { performer_name: p.performer_name || s.display_name, performer_email: s.email ?? "", performer_phone: p.performer_phone || s.phone || "" })}
                          placeholder="E-mail"
                          type="email"
                        />
                        <ContactAutocomplete
                          field="phone"
                          suggestions={history}
                          value={p.performer_phone ?? ""}
                          onChange={(v) => update(c.id, { performer_phone: v })}
                          onPick={(s) => update(c.id, { performer_name: p.performer_name || s.display_name, performer_email: p.performer_email || s.email || "", performer_phone: s.phone ?? "" })}
                          placeholder="Telefon"
                        />
                      </div>
                      {p.dirty && (
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => save(c.id)} disabled={savingId === c.id}>
                            {savingId === c.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            {hasPerformer ? "Uložit změny" : "Přiřadit performera"}
                          </Button>
                        </div>
                      )}
                      {!p.dirty && !hasPerformer && (
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">Bez performera</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <PersonFormDialog
            open={personDialogOpen}
            onOpenChange={setPersonDialogOpen}
            larpId={run.larp_id}
            type="cp"
            person={null}
            onSaved={() => load()}
          />
        </div>
      )}
    </V2Shell>
  );
}
