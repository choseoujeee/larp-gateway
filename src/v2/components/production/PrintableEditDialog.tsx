import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PrintableRow {
  id?: string;
  larp_id: string;
  run_id: string;
  title: string;
  url: string | null;
  print_instructions: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  larpId: string;
  runId: string;
  printable?: PrintableRow | null;
  onSaved: () => void;
}

export function PrintableEditDialog({ open, onOpenChange, larpId, runId, printable, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(printable?.title ?? "");
    setUrl(printable?.url ?? "");
    setInstructions(printable?.print_instructions ?? "");
  }, [open, printable]);

  async function save() {
    if (!title.trim()) { toast.error("Vyplň název"); return; }
    setSaving(true);
    try {
      if (printable?.id) {
        const { error } = await supabase.from("printables").update({
          title: title.trim(),
          url: url.trim() || null,
          print_instructions: instructions.trim() || null,
        }).eq("id", printable.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("printables").insert({
          larp_id: larpId,
          run_id: runId,
          title: title.trim(),
          url: url.trim() || null,
          print_instructions: instructions.trim() || null,
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
        <DialogHeader><DialogTitle>{printable?.id ? "Upravit tiskovinu" : "Nová tiskovina"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Název</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pas pohraniční stráže A6" />
          </div>
          <div className="space-y-1.5">
            <Label>Odkaz na předlohu</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" />
          </div>
          <div className="space-y-1.5">
            <Label>Instrukce pro tisk</Label>
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="A4 barevně, papír 200 g, oboustranně" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
