import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (larp: { id: string; slug: string }) => void;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function NewLarpDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const reset = () => {
    setName(""); setSlug(""); setSlugTouched(false);
    setMotto(""); setDescription(""); setSaving(false);
  };

  const submit = async () => {
    if (!user) { toast.error("Nejsi přihlášen"); return; }
    if (!name.trim() || !slug.trim()) {
      toast.error("Název a URL slug jsou povinné");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("larps")
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        motto: motto.trim() || null,
        description: description.trim() || null,
        owner_id: user.id,
      })
      .select("id, slug")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Tento slug už existuje" : `Chyba: ${error.message}`);
      return;
    }
    toast.success("LARP vytvořen");
    onCreated?.(data);
    onOpenChange(false);
    reset();
    navigate(`/larp/${data.slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový LARP</DialogTitle>
          <DialogDescription>Založíte novou hru. Detaily můžete doplnit později.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="larp-name">Název *</Label>
            <Input id="larp-name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Krypta 1942" />
          </div>
          <div>
            <Label htmlFor="larp-slug">URL slug *</Label>
            <Input
              id="larp-slug"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="krypta"
            />
            <p className="mt-1 text-xs text-muted-foreground">URL bude /larp/{slug || "..."}</p>
          </div>
          <div>
            <Label htmlFor="larp-motto">Motto</Label>
            <Input id="larp-motto" value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="Volitelné" />
          </div>
          <div>
            <Label htmlFor="larp-desc">Popis</Label>
            <Textarea id="larp-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Zrušit</Button>
          <Button onClick={submit} disabled={saving || !name.trim() || !slug.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vytvořit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
