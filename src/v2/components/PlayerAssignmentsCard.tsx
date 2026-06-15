import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Trash2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { randomPassword } from "../lib/slug";

interface Run { id: string; name: string; slug: string; date_from: string | null; is_active: boolean | null; }
interface Assignment {
  id?: string;
  run_id: string;
  person_id: string;
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
}

interface Props {
  personId: string;
  larpId: string;
  personType: "postava" | "cp";
}

/**
 * Per-run player assignments for a character.
 * Allows assigning player_name/email/phone and (re)setting the run-portal password.
 */
export function PlayerAssignmentsCard({ personId, larpId, personType }: Props) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rs }, { data: as }] = await Promise.all([
      supabase.from("runs").select("id, name, slug, date_from, is_active").eq("larp_id", larpId).order("date_from", { ascending: false }),
      supabase.from("run_person_assignments").select("id, run_id, person_id, player_name, player_email, player_phone").eq("person_id", personId),
    ]);
    setRuns((rs ?? []) as Run[]);
    const map: Record<string, Assignment> = {};
    (as ?? []).forEach((a: Assignment) => { map[a.run_id] = a; });
    setAssignments(map);
    setLoading(false);
  }, [personId, larpId]);

  useEffect(() => { load(); }, [load]);

  function update(runId: string, patch: Partial<Assignment>) {
    setAssignments((prev) => ({
      ...prev,
      [runId]: { ...(prev[runId] ?? { run_id: runId, person_id: personId, player_name: "", player_email: "", player_phone: "" }), ...patch },
    }));
  }

  async function save(runId: string, opts?: { newPassword?: string }) {
    const a = assignments[runId] ?? { run_id: runId, person_id: personId, player_name: "", player_email: "", player_phone: "" };
    setSavingId(runId);
    try {
      if (a.id) {
        const update: Record<string, unknown> = {
          player_name: a.player_name || null,
          player_email: a.player_email || null,
          player_phone: a.player_phone || null,
        };
        if (opts?.newPassword) {
          // Direct hashing via pgcrypto extension; bcrypt salt
          const { data: hash } = await supabase.rpc("create_person_assignment_with_password" as never, {} as never).then(() => ({ data: null })).catch(() => ({ data: null }));
          void hash;
          // Fall back: re-create via RPC (RPC handles hashing); delete + recreate to reuse RPC
          await supabase.from("run_person_assignments").delete().eq("id", a.id);
          const { data: newId, error: rpcErr } = await supabase.rpc("create_person_assignment_with_password", {
            p_run_id: runId, p_person_id: personId, p_password: opts.newPassword,
            p_player_name: a.player_name || null, p_player_email: a.player_email || null,
          });
          if (rpcErr) throw rpcErr;
          if (a.player_phone) {
            await supabase.from("run_person_assignments").update({ player_phone: a.player_phone }).eq("id", newId as string);
          }
        } else {
          const { error } = await supabase.from("run_person_assignments").update(update).eq("id", a.id);
          if (error) throw error;
        }
      } else {
        const pw = opts?.newPassword || randomPassword();
        const { data: newId, error } = await supabase.rpc("create_person_assignment_with_password", {
          p_run_id: runId, p_person_id: personId, p_password: pw,
          p_player_name: a.player_name || null, p_player_email: a.player_email || null,
        });
        if (error) throw error;
        if (a.player_phone) {
          await supabase.from("run_person_assignments").update({ player_phone: a.player_phone }).eq("id", newId as string);
        }
        if (!opts?.newPassword) toast.info(`Heslo přiřazení: ${pw}`, { duration: 10000 });
      }
      toast.success(opts?.newPassword ? "Uloženo + nové heslo nastaveno" : "Uloženo");
      await load();
    } catch (e: unknown) {
      toast.error("Chyba: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingId(null);
    }
  }

  async function remove(runId: string) {
    const a = assignments[runId];
    if (!a?.id) return;
    if (!confirm("Smazat přiřazení hráče k tomuto běhu?")) return;
    const { error } = await supabase.from("run_person_assignments").delete().eq("id", a.id);
    if (error) { toast.error("Smazání selhalo"); return; }
    toast.success("Smazáno");
    load();
  }

  async function changePassword(runId: string) {
    const pw = prompt("Nové heslo do běhového portálu:", randomPassword());
    if (!pw?.trim()) return;
    await save(runId, { newPassword: pw.trim() });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-typewriter text-lg">
          {personType === "cp" ? "Performeři po bězích" : "Hráč po bězích"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : runs.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">Žádné běhy. Vytvoř běh v LARPu.</p>
        ) : (
          <div className="space-y-3">
            {runs.map((r) => {
              const a = assignments[r.id];
              const hasAssignment = !!a?.id;
              return (
                <div key={r.id} className="rounded border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-typewriter text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.date_from ? new Date(r.date_from).toLocaleDateString("cs-CZ") : "bez termínu"}
                        {r.is_active && " · aktivní"}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => changePassword(r.id)} title="Nastavit heslo přiřazení">
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      {hasAssignment && (
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Jméno hráče" value={a?.player_name ?? ""} onChange={(e) => update(r.id, { player_name: e.target.value })} />
                    <Input placeholder="E-mail" type="email" value={a?.player_email ?? ""} onChange={(e) => update(r.id, { player_email: e.target.value })} />
                    <Input placeholder="Telefon" value={a?.player_phone ?? ""} onChange={(e) => update(r.id, { player_phone: e.target.value })} />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={() => save(r.id)} disabled={savingId === r.id}>
                      {savingId === r.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                      {hasAssignment ? "Uložit" : "Přiřadit"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
