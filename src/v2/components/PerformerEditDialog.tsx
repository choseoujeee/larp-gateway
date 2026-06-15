import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContactAutocomplete } from "./ContactAutocomplete";
import type { PlayerHistoryEntry } from "../hooks/useLarpPlayerHistory";

interface ExistingPerformer {
  id?: string;
  performer_name: string;
  performer_email: string | null;
  performer_phone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  runId: string;
  cpId: string;
  cpName: string;
  existing?: ExistingPerformer | null;
  history: PlayerHistoryEntry[];
  onSaved: () => void;
}

export function PerformerEditDialog({
  open, onOpenChange, runId, cpId, cpName, existing, history, onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(existing?.performer_name ?? "");
    setEmail(existing?.performer_email ?? "");
    setPhone(existing?.performer_phone ?? "");
  }, [open, existing]);

  async function save() {
    if (!name.trim()) { toast.error("Vyplň jméno performera"); return; }
    setSaving(true);
    try {
      if (existing?.id) {
        const { error } = await supabase.from("cp_performers").update({
          performer_name: name.trim(),
          performer_email: email.trim() || null,
          performer_phone: phone.trim() || null,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cp_performers").insert({
          run_id: runId,
          cp_id: cpId,
          performer_name: name.trim(),
          performer_email: email.trim() || null,
          performer_phone: phone.trim() || null,
        });
        if (error) throw error;
      }
      toast.success("Uloženo");
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
          <DialogTitle>{existing?.id ? "Upravit performera" : "Přiřadit performera"} — {cpName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Jméno performera</Label>
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
            {existing?.id ? "Uložit změny" : "Přiřadit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
