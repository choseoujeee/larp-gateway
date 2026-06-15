import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Check, X, KeyRound, Trash2, Mail, Phone, User, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { randomPassword } from "../lib/slug";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Run {
  id: string;
  name: string;
  date_from: string | null;
  is_active: boolean | null;
}

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
 * Shows ONLY the active run. View-only by default; click pencil to edit.
 */
export function ActiveRunAssignmentCard({ personId, larpId, personType }: Props) {
  const [run, setRun] = useState<Run | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: r } = await supabase
      .from("runs")
      .select("id, name, date_from, is_active")
      .eq("larp_id", larpId)
      .eq("is_active", true)
      .maybeSingle();
    if (!r) { setRun(null); setAssignment(null); setLoading(false); return; }
    setRun(r as Run);
    const { data: a } = await supabase
      .from("run_person_assignments")
      .select("id, run_id, person_id, player_name, player_email, player_phone")
      .eq("person_id", personId)
      .eq("run_id", r.id)
      .maybeSingle();
    setAssignment((a as Assignment) ?? null);
    setLoading(false);
  }, [personId, larpId]);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    setDraft(assignment ?? { run_id: run!.id, person_id: personId, player_name: "", player_email: "", player_phone: "" });
    setEditing(true);
  }

  async function save() {
    if (!draft || !run) return;
    setSaving(true);
    try {
      if (draft.id) {
        const { error } = await supabase.from("run_person_assignments").update({
          player_name: draft.player_name || null,
          player_email: draft.player_email || null,
          player_phone: draft.player_phone || null,
        }).eq("id", draft.id);
        if (error) throw error;
      } else {
        const pwGen = randomPassword();
        const { data: newId, error } = await supabase.rpc("create_person_assignment_with_password", {
          p_run_id: run.id, p_person_id: personId, p_password: pwGen,
          p_player_name: draft.player_name || null, p_player_email: draft.player_email || null,
        });
        if (error) throw error;
        if (draft.player_phone) {
          await supabase.from("run_person_assignments").update({ player_phone: draft.player_phone }).eq("id", newId as string);
        }
        toast.info(`Heslo přiřazení: ${pwGen}`, { duration: 10000 });
      }
      toast.success("Uloženo");
      setEditing(false);
      await load();
    } catch (e) {
      toast.error("Chyba: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  }

  async function changePassword() {
    if (!assignment?.id || !pw.trim() || !run) return;
    setSaving(true);
    try {
      await supabase.from("run_person_assignments").delete().eq("id", assignment.id);
      const { error } = await supabase.rpc("create_person_assignment_with_password", {
        p_run_id: run.id, p_person_id: personId, p_password: pw.trim(),
        p_player_name: assignment.player_name, p_player_email: assignment.player_email,
      });
      if (error) throw error;
      toast.success("Heslo aktualizováno");
      setPwOpen(false);
      setPw("");
      await load();
    } catch (e) {
      toast.error("Chyba: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  }

  async function unassign() {
    if (!assignment?.id) return;
    if (!confirm("Zrušit přiřazení hráče k aktivnímu běhu?")) return;
    const { error } = await supabase.from("run_person_assignments").delete().eq("id", assignment.id);
    if (error) { toast.error("Selhalo"); return; }
    toast.success("Přiřazení zrušeno");
    setEditing(false);
    await load();
  }

  if (loading) {
    return (
      <Card><CardContent className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
    );
  }

  if (!run) {
    return (
      <Card>
        <CardHeader><CardTitle className="font-typewriter text-lg">{personType === "cp" ? "Performer aktuálního běhu" : "Hráč aktuálního běhu"}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Žádný aktivní běh.</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="font-typewriter text-lg">{personType === "cp" ? "Performer aktuálního běhu" : "Hráč aktuálního běhu"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{run.name}{run.date_from && ` · ${new Date(run.date_from).toLocaleDateString("cs-CZ")}`}</p>
          </div>
          {!editing && (
            <div className="flex gap-1">
              {assignment?.id && (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setPw(randomPassword()); setPwOpen(true); }} title="Nastavit heslo">
                  <KeyRound className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={startEdit} title="Upravit">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!editing ? (
            assignment ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span>{assignment.player_name || <span className="italic text-muted-foreground">bez jména</span>}</span></div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span>{assignment.player_email || <span className="italic text-muted-foreground">—</span>}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{assignment.player_phone || <span className="italic text-muted-foreground">—</span>}</span></div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm italic text-muted-foreground">Nikdo nepřiřazen.</p>
                <Button size="sm" variant="outline" onClick={startEdit}>Přiřadit</Button>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <Input placeholder="Jméno hráče" value={draft?.player_name ?? ""} onChange={(e) => setDraft((d) => ({ ...(d!), player_name: e.target.value }))} />
              <Input placeholder="E-mail" type="email" value={draft?.player_email ?? ""} onChange={(e) => setDraft((d) => ({ ...(d!), player_email: e.target.value }))} />
              <Input placeholder="Telefon" value={draft?.player_phone ?? ""} onChange={(e) => setDraft((d) => ({ ...(d!), player_phone: e.target.value }))} />
              <div className="flex items-center justify-between pt-1">
                <div>
                  {assignment?.id && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={unassign} disabled={saving}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />Zrušit přiřazení
                    </Button>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}><X className="mr-1 h-4 w-4" />Zrušit</Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}Uložit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pwOpen} onOpenChange={(o) => { if (!saving) setPwOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-typewriter">Nové heslo do běhového portálu</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nové heslo" autoFocus />
              <Button type="button" variant="outline" onClick={() => setPw(randomPassword())}>Náhodné</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwOpen(false)} disabled={saving}>Zrušit</Button>
            <Button onClick={changePassword} disabled={saving || !pw.trim()}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
