import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { randomPassword } from "../lib/slug";
import { toast } from "sonner";
import { ContactAutocomplete } from "./ContactAutocomplete";
import type { PlayerHistoryEntry } from "../hooks/useLarpPlayerHistory";

interface CharacterOption {
  id: string;
  name: string;
  group_name: string | null;
}

interface ExistingAssignment {
  id: string;
  person_id: string;
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  runId: string;
  characters: CharacterOption[];
  /** ids of characters already assigned (excluded from select unless editing this one) */
  takenPersonIds: Set<string>;
  existing?: ExistingAssignment | null;
  history: PlayerHistoryEntry[];
  onSaved: () => void;
}

export function PlayerEditDialog({
  open, onOpenChange, runId, characters, takenPersonIds, existing, history, onSaved,
}: Props) {
  const [personId, setPersonId] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPersonId(existing?.person_id ?? "");
    setName(existing?.player_name ?? "");
    setEmail(existing?.player_email ?? "");
    setPhone(existing?.player_phone ?? "");
  }, [open, existing]);

  const available = characters.filter((c) => !takenPersonIds.has(c.id) || c.id === existing?.person_id);

  async function save() {
    if (!personId) { toast.error("Vyber postavu"); return; }
    if (!name.trim()) { toast.error("Vyplň jméno hráče"); return; }
    setSaving(true);
    try {
      if (existing) {
        const { error } = await supabase.from("run_person_assignments").update({
          player_name: name.trim(),
          player_email: email.trim() || null,
          player_phone: phone.trim() || null,
        }).eq("id", existing.id);
        if (error) throw error;
        toast.success("Uloženo");
      } else {
        const pw = randomPassword();
        const { data: newId, error } = await supabase.rpc("create_person_assignment_with_password", {
          p_run_id: runId,
          p_person_id: personId,
          p_password: pw,
          p_player_name: name.trim(),
          p_player_email: email.trim() || null,
        });
        if (error) throw error;
        if (phone.trim()) {
          await supabase.from("run_person_assignments").update({ player_phone: phone.trim() }).eq("id", newId as string);
        }
        toast.success(`Hráč přidán · heslo do portálu: ${pw}`, { duration: 12000 });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error("Chyba: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Upravit hráče" : "Nový hráč"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Postava</Label>
            <Select value={personId} onValueChange={setPersonId} disabled={!!existing}>
              <SelectTrigger><SelectValue placeholder="Vyber postavu…" /></SelectTrigger>
              <SelectContent>
                {available.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Žádné volné postavy</div>
                ) : available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.group_name ? ` · ${c.group_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Jméno hráče</Label>
            <ContactAutocomplete
              field="name"
              suggestions={history}
              value={name}
              onChange={setName}
              onPick={(s) => { setName(s.display_name); if (!email) setEmail(s.email ?? ""); if (!phone) setPhone(s.phone ?? ""); }}
              placeholder="Jméno a příjmení"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <ContactAutocomplete
                field="email"
                suggestions={history}
                value={email}
                onChange={setEmail}
                onPick={(s) => { if (!name) setName(s.display_name); setEmail(s.email ?? ""); if (!phone) setPhone(s.phone ?? ""); }}
                placeholder="email@…"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+420…" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? "Uložit změny" : "Přidat hráče"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
