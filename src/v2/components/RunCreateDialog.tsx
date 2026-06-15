import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  larpId: string;
  larpSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function RunCreateDialog({ larpId, larpSlug, open, onOpenChange, onCreated }: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [location, setLocation] = useState("");
  const [makeActive, setMakeActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setSlug(""); setSlugTouched(false);
      setDateFrom(""); setDateTo(""); setLocation("");
      setMakeActive(true); setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Název je povinný"); return; }
    if (!slug.trim()) { toast.error("Slug je povinný"); return; }
    if (dateFrom && dateTo && dateTo < dateFrom) {
      toast.error("Datum konce musí být po datu začátku"); return;
    }

    setSaving(true);

    if (makeActive) {
      await supabase.from("runs").update({ is_active: false }).eq("larp_id", larpId);
    }

    const { data, error } = await supabase
      .from("runs")
      .insert({
        larp_id: larpId,
        name: name.trim(),
        slug: slug.trim(),
        date_from: dateFrom || null,
        date_to: dateTo || null,
        location: location.trim() || null,
        is_active: makeActive,
      })
      .select("id, slug")
      .single();

    setSaving(false);

    if (error || !data) {
      if (error?.code === "23505") toast.error("Slug už pro tento LARP existuje");
      else toast.error("Vytvoření selhalo: " + (error?.message ?? ""));
      return;
    }

    toast.success("Běh vytvořen");
    onOpenChange(false);
    onCreated?.();
    navigate(`/larp/${larpSlug}/beh/${data.slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nový běh</DialogTitle>
          <DialogDescription>
            Postavy a CP z katalogu LARPu jsou pro nový běh automaticky k dispozici — hráče přiřadíte v sekci Hráči.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rc-name">Název *</Label>
            <Input id="rc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Duben 2026" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rc-slug">Slug (v URL) *</Label>
            <Input
              id="rc-slug"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="duben-2026"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rc-from">Začátek</Label>
              <Input id="rc-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-to">Konec</Label>
              <Input id="rc-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rc-loc">Místo</Label>
            <Input id="rc-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="např. Penzion Pod Lipou" />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div>
              <div className="text-sm font-medium">Označit jako aktuální běh</div>
              <div className="text-xs text-muted-foreground">Předchozí aktuální běh se přesune do dřívějších.</div>
            </div>
            <Switch checked={makeActive} onCheckedChange={setMakeActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Zrušit</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vytvořit běh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
