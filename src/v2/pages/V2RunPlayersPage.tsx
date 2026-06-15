import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2, Plus, Search, KeyRound, Trash2, Check, Pencil, UserCircle } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { PlayerEditDialog } from "../components/PlayerEditDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useRun } from "../hooks/useRun";
import { useLarpPlayerHistory } from "../hooks/useLarpPlayerHistory";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { randomPassword } from "../lib/slug";
import { toast } from "sonner";

interface Person {
  id: string;
  name: string;
  group_name: string | null;
}
interface Assignment {
  id: string;
  person_id: string;
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
  paid_at: string | null;
}

export default function V2RunPlayersPage() {
  const { larpSlug, runSlug } = useParams<{ larpSlug: string; runSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { run, loading: runLoading, notFound } = useRun(larpSlug, runSlug);
  const [persons, setPersons] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const { players: history } = useLarpPlayerHistory(run?.larp_id);

  const load = useCallback(async () => {
    if (!run) return;
    setLoading(true);
    const [{ data: ps }, { data: as }] = await Promise.all([
      supabase.from("persons").select("id, name, group_name").eq("larp_id", run.larp_id).eq("type", "postava").order("name"),
      supabase.from("run_person_assignments").select("id, person_id, player_name, player_email, player_phone, paid_at").eq("run_id", run.id),
    ]);
    setPersons((ps ?? []) as Person[]);
    setAssignments((as ?? []) as Assignment[]);
    setLoading(false);
  }, [run]);

  useEffect(() => { load(); }, [load]);

  const personById = useMemo(() => {
    const m = new Map<string, Person>();
    persons.forEach((p) => m.set(p.id, p));
    return m;
  }, [persons]);

  const takenPersonIds = useMemo(() => new Set(assignments.map((a) => a.person_id)), [assignments]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return assignments
      .filter((a) => {
        if (filter === "unpaid" && a.paid_at) return false;
        if (!q) return true;
        const p = personById.get(a.person_id);
        return (
          (a.player_name ?? "").toLowerCase().includes(q) ||
          (a.player_email ?? "").toLowerCase().includes(q) ||
          (a.player_phone ?? "").toLowerCase().includes(q) ||
          (p?.name ?? "").toLowerCase().includes(q) ||
          (p?.group_name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.player_name ?? "").localeCompare(b.player_name ?? "", "cs"));
  }, [assignments, filter, debounced, personById]);

  async function togglePaid(a: Assignment) {
    const newVal = a.paid_at ? null : new Date().toISOString();
    const { error } = await supabase.from("run_person_assignments").update({ paid_at: newVal }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    setAssignments((prev) => prev.map((x) => x.id === a.id ? { ...x, paid_at: newVal } : x));
  }

  async function remove(a: Assignment) {
    if (!confirm(`Smazat hráče „${a.player_name ?? "?"}"?`)) return;
    const { error } = await supabase.from("run_person_assignments").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Smazáno");
    load();
  }

  async function resetPassword(a: Assignment) {
    const pw = prompt("Nové heslo do portálu:", randomPassword());
    if (!pw?.trim()) return;
    await supabase.from("run_person_assignments").delete().eq("id", a.id);
    const { error } = await supabase.rpc("create_person_assignment_with_password", {
      p_run_id: run!.id, p_person_id: a.person_id, p_password: pw.trim(),
      p_player_name: a.player_name, p_player_email: a.player_email,
    });
    if (error) { toast.error(error.message); return; }
    if (a.player_phone) {
      const { data: created } = await supabase
        .from("run_person_assignments").select("id").eq("run_id", run!.id).eq("person_id", a.person_id).maybeSingle();
      if (created) await supabase.from("run_person_assignments").update({ player_phone: a.player_phone }).eq("id", created.id);
    }
    toast.success(`Heslo nastaveno: ${pw.trim()}`);
    load();
  }

  const totalPaid = assignments.filter((a) => a.paid_at).length;
  const freeCount = persons.length - assignments.length;

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/beh/${runSlug}/hraci`} replace />;
  if (notFound) return <Navigate to={`/larp/${larpSlug}`} replace />;

  return (
    <V2Shell larpName={run?.larp_name} runName={run?.name}>
      {runLoading || !run ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Hráči</h1>
              <p className="text-sm text-muted-foreground">
                {assignments.length} hráčů · {totalPaid} zaplaceno · {freeCount} volných postav
              </p>
            </div>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={freeCount === 0}>
              <Plus className="mr-2 h-4 w-4" />Nový hráč
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unpaid")} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="all">Vše</TabsTrigger>
                <TabsTrigger value="unpaid">Nezaplacené</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hledat hráče nebo postavu…" className="pl-9" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {assignments.length === 0 ? "Zatím žádní hráči. Přidej prvního tlačítkem „Nový hráč“." : "Žádný hráč nevyhovuje filtru."}
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hráč</TableHead>
                      <TableHead>Postava</TableHead>
                      <TableHead className="hidden md:table-cell">Kontakt</TableHead>
                      <TableHead className="w-32">Stav</TableHead>
                      <TableHead className="w-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => {
                      const p = personById.get(a.person_id);
                      return (
                        <TableRow key={a.id} className="cursor-pointer" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{a.player_name || <span className="italic text-muted-foreground">bez jména</span>}</div>
                                {a.player_email && <div className="truncate text-xs text-muted-foreground md:hidden">{a.player_email}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-typewriter">{p?.name ?? "—"}</div>
                            {p?.group_name && <div className="text-xs text-muted-foreground">{p.group_name}</div>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {a.player_email && <div className="truncate text-sm">{a.player_email}</div>}
                            {a.player_phone && <div className="text-xs text-muted-foreground">{a.player_phone}</div>}
                          </TableCell>
                          <TableCell>
                            {a.paid_at ? (
                              <Badge className="gap-1 bg-green-600 hover:bg-green-600"><Check className="h-3 w-3" />Zaplaceno</Badge>
                            ) : (
                              <Badge variant="outline">Nezaplaceno</Badge>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePaid(a)} title="Přepnout zaplaceno">
                                <Check className={`h-4 w-4 ${a.paid_at ? "text-green-600" : "text-muted-foreground"}`} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(a); setDialogOpen(true); }} title="Upravit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => resetPassword(a)} title="Reset hesla">
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(a)} title="Smazat">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <PlayerEditDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            runId={run.id}
            characters={persons}
            takenPersonIds={takenPersonIds}
            existing={editing}
            history={history}
            onSaved={load}
          />
        </div>
      )}
    </V2Shell>
  );
}
