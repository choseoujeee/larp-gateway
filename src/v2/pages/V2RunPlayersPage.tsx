import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Loader2, Search, Plus, KeyRound, Trash2, Check, X, ArrowLeft, UserPlus } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { ContactAutocomplete } from "../components/ContactAutocomplete";
import { PersonFormDialog } from "../components/PersonFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useRun } from "../hooks/useRun";
import { useLarpPlayerHistory } from "../hooks/useLarpPlayerHistory";
import { randomPassword } from "../lib/slug";
import { toast } from "sonner";

interface Person {
  id: string;
  name: string;
  slug: string;
  group_name: string | null;
}
interface Assignment {
  id?: string;
  run_id: string;
  person_id: string;
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
  paid_at: string | null;
  dirty?: boolean;
}

export default function V2RunPlayersPage() {
  const { larpSlug, runSlug } = useParams<{ larpSlug: string; runSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { run, loading: runLoading, notFound } = useRun(larpSlug, runSlug);
  const [persons, setPersons] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unassigned" | "unpaid">("all");
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const { players: history } = useLarpPlayerHistory(run?.larp_id);

  const load = useCallback(async () => {
    if (!run) return;
    setLoading(true);
    const [{ data: ps }, { data: as }] = await Promise.all([
      supabase.from("persons").select("id, name, slug, group_name").eq("larp_id", run.larp_id).eq("type", "postava").order("name"),
      supabase.from("run_person_assignments").select("id, run_id, person_id, player_name, player_email, player_phone, paid_at").eq("run_id", run.id),
    ]);
    setPersons((ps ?? []) as Person[]);
    const map: Record<string, Assignment> = {};
    (as ?? []).forEach((a) => { map[a.person_id] = a as Assignment; });
    setAssignments(map);
    setLoading(false);
  }, [run]);

  useEffect(() => { load(); }, [load]);

  function update(personId: string, patch: Partial<Assignment>) {
    setAssignments((prev) => {
      const existing = prev[personId] ?? { run_id: run!.id, person_id: personId, player_name: "", player_email: "", player_phone: "", paid_at: null };
      return { ...prev, [personId]: { ...existing, ...patch, dirty: true } };
    });
  }

  async function save(personId: string) {
    const a = assignments[personId];
    if (!a) return;
    setSavingId(personId);
    try {
      if (a.id) {
        const { error } = await supabase.from("run_person_assignments").update({
          player_name: a.player_name?.trim() || null,
          player_email: a.player_email?.trim() || null,
          player_phone: a.player_phone?.trim() || null,
        }).eq("id", a.id);
        if (error) throw error;
      } else {
        const pw = randomPassword();
        const { data: newId, error } = await supabase.rpc("create_person_assignment_with_password", {
          p_run_id: run!.id,
          p_person_id: personId,
          p_password: pw,
          p_player_name: a.player_name?.trim() || null,
          p_player_email: a.player_email?.trim() || null,
        });
        if (error) throw error;
        if (a.player_phone) {
          await supabase.from("run_person_assignments").update({ player_phone: a.player_phone.trim() }).eq("id", newId as string);
        }
        toast.info(`Heslo do portálu: ${pw}`, { duration: 12000 });
      }
      toast.success("Uloženo");
      await load();
    } catch (e) {
      toast.error("Chyba: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingId(null);
    }
  }

  async function togglePaid(personId: string) {
    const a = assignments[personId];
    if (!a?.id) {
      toast.error("Nejprve přiřaď hráče (Uložit)");
      return;
    }
    const newVal = a.paid_at ? null : new Date().toISOString();
    const { error } = await supabase.from("run_person_assignments").update({ paid_at: newVal }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    setAssignments((prev) => ({ ...prev, [personId]: { ...a, paid_at: newVal } }));
  }

  async function remove(personId: string) {
    const a = assignments[personId];
    if (!a?.id) return;
    if (!confirm("Odebrat přiřazení hráče k této postavě?")) return;
    const { error } = await supabase.from("run_person_assignments").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Odebráno");
    load();
  }

  async function changePassword(personId: string) {
    const a = assignments[personId];
    if (!a?.id) { toast.error("Nejprve přiřaď hráče"); return; }
    const pw = prompt("Nové heslo do portálu:", randomPassword());
    if (!pw?.trim()) return;
    // Re-issue via RPC for bcrypt
    await supabase.from("run_person_assignments").delete().eq("id", a.id);
    const { error } = await supabase.rpc("create_person_assignment_with_password", {
      p_run_id: run!.id, p_person_id: personId, p_password: pw.trim(),
      p_player_name: a.player_name, p_player_email: a.player_email,
    });
    if (error) { toast.error(error.message); return; }
    if (a.player_phone) {
      // refetch id
      await load();
    }
    toast.success(`Heslo nastaveno: ${pw.trim()}`);
    await load();
  }

  async function assignAll() {
    if (!confirm("Vytvořit prázdné přiřazení pro všechny dosud nepřiřazené postavy?")) return;
    const toCreate = persons.filter((p) => !assignments[p.id]?.id);
    for (const p of toCreate) {
      const pw = randomPassword();
      await supabase.rpc("create_person_assignment_with_password", {
        p_run_id: run!.id, p_person_id: p.id, p_password: pw, p_player_name: null, p_player_email: null,
      });
    }
    toast.success(`Vytvořeno ${toCreate.length} přiřazení`);
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return persons.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.group_name ?? "").toLowerCase().includes(q)) return false;
      const a = assignments[p.id];
      if (filter === "unassigned" && a?.player_name) return false;
      if (filter === "unpaid" && a?.paid_at) return false;
      return true;
    });
  }, [persons, assignments, search, filter]);

  const totalAssigned = Object.values(assignments).filter((a) => a.id).length;
  const totalPaid = Object.values(assignments).filter((a) => a.paid_at).length;

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/beh/${runSlug}/hraci`} replace />;
  if (notFound) return <Navigate to={`/larp/${larpSlug}`} replace />;

  return (
    <V2Shell larpName={run?.larp_name} runName={run?.name}>
      {runLoading || !run ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2">
              <Link to={`/larp/${larpSlug}/beh/${runSlug}`}><ArrowLeft className="mr-1 h-4 w-4" />Cockpit běhu</Link>
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Hráči — {run.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Přiřazeno {totalAssigned} z {persons.length} postav · zaplaceno {totalPaid}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPersonDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />Nová postava
                </Button>
                <Button variant="outline" size="sm" onClick={assignAll}>
                  <Plus className="mr-2 h-4 w-4" />Přiřadit všechny
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat postavu nebo skupinu…" className="pl-9" />
            </div>
            <div className="flex gap-1">
              <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Vše</Button>
              <Button variant={filter === "unassigned" ? "default" : "outline"} size="sm" onClick={() => setFilter("unassigned")}>Bez hráče</Button>
              <Button variant={filter === "unpaid" ? "default" : "outline"} size="sm" onClick={() => setFilter("unpaid")}>Nezaplacené</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {persons.length === 0 ? "Tento LARP ještě nemá žádné postavy." : "Žádná postava nevyhovuje filtru."}
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => {
                const a = assignments[p.id] ?? { run_id: run.id, person_id: p.id, player_name: "", player_email: "", player_phone: "", paid_at: null };
                const hasAssignment = !!a.id;
                return (
                  <Card key={p.id} className={a.paid_at ? "border-l-4 border-l-green-500" : hasAssignment ? "border-l-4 border-l-amber-500" : ""}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-typewriter text-base">{p.name}</div>
                          {p.group_name && <div className="text-xs text-muted-foreground">{p.group_name}</div>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant={a.paid_at ? "default" : "outline"}
                            onClick={() => togglePaid(p.id)}
                            disabled={!hasAssignment}
                            title={a.paid_at ? "Označit jako nezaplaceno" : "Označit jako zaplaceno"}
                          >
                            {a.paid_at ? <><Check className="mr-1 h-3.5 w-3.5" />Zaplaceno</> : <><X className="mr-1 h-3.5 w-3.5" />Nezapl.</>}
                          </Button>
                          {hasAssignment && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => changePassword(p.id)} title="Nastavit heslo">
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <ContactAutocomplete
                          field="name"
                          suggestions={history}
                          value={a.player_name ?? ""}
                          onChange={(v) => update(p.id, { player_name: v })}
                          onPick={(s) => update(p.id, { player_name: s.display_name, player_email: a.player_email || s.email || "", player_phone: a.player_phone || s.phone || "" })}
                          placeholder="Jméno hráče"
                        />
                        <ContactAutocomplete
                          field="email"
                          suggestions={history}
                          value={a.player_email ?? ""}
                          onChange={(v) => update(p.id, { player_email: v })}
                          onPick={(s) => update(p.id, { player_name: a.player_name || s.display_name, player_email: s.email ?? "", player_phone: a.player_phone || s.phone || "" })}
                          placeholder="E-mail"
                          type="email"
                        />
                        <ContactAutocomplete
                          field="phone"
                          suggestions={history}
                          value={a.player_phone ?? ""}
                          onChange={(v) => update(p.id, { player_phone: v })}
                          onPick={(s) => update(p.id, { player_name: a.player_name || s.display_name, player_email: a.player_email || s.email || "", player_phone: s.phone ?? "" })}
                          placeholder="Telefon"
                        />
                      </div>
                      {a.dirty && (
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => save(p.id)} disabled={savingId === p.id}>
                            {savingId === p.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            {hasAssignment ? "Uložit změny" : "Přiřadit hráče"}
                          </Button>
                        </div>
                      )}
                      {!a.dirty && !hasAssignment && (
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">Bez hráče</Badge>
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
            type="postava"
            person={null}
            onSaved={() => load()}
          />
        </div>
      )}
    </V2Shell>
  );
}
