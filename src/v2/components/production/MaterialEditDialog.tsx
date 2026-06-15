import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MaterialRow {
  id?: string;
  larp_id: string;
  run_id: string | null;
  title: string;
  url: string | null;
  note: string | null;
  material_type: "doc" | "audio" | "video" | "other";
  sort_order?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  larpId: string;
  /** when null → LARP-scope (run_id = null); otherwise stored to this run */
  defaultRunId: string | null;
  material?: MaterialRow | null;
  onSaved: () => void;
}

export function MaterialEditDialog({ open, onOpenChange, larpId, defaultRunId, material, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<MaterialRow["material_type"]>("doc");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(material?.title ?? "");
    setUrl(material?.url ?? "");
    setType(material?.material_type ?? "doc");
    setNote(material?.note ?? "");
  }, [open, material]);

  async function save() {
    if (!title.trim()) { toast.error("Vyplň název"); return; }
    setSaving(true);
    try {
      if (material?.id) {
        const { error } = await supabase.from("production_materials").update({
          title: title.trim(),
          url: url.trim() || null,
          note: note.trim() || null,
          material_type: type,
        }).eq("id", material.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("production_materials").insert({
          larp_id: larpId,
          run_id: defaultRunId,
          title: title.trim(),
          url: url.trim() || null,
          note: note.trim() || null,
          material_type: type,
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
        <DialogHeader><DialogTitle>{material?.id ? "Upravit soubor" : "Nový soubor / odkaz"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Název</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mapa hlavního sálu" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label>Odkaz (URL)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" />
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={type} onValueChange={(v) => setType(v as MaterialRow["material_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doc">Dokument / odkaz</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="other">Jiné</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Poznámka</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Vytisknout barevně, A3…" />
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
