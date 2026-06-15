import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  larpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface LarpForm {
  name: string;
  slug: string;
  motto: string;
  description: string;
  theme: string;
  footer_text: string;
  payment_account: string;
}

const empty: LarpForm = {
  name: "", slug: "", motto: "", description: "", theme: "wwii",
  footer_text: "", payment_account: "",
};

export function LarpEditDialog({ larpId, open, onOpenChange, onSaved }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<LarpForm>(empty);
  const [originalSlug, setOriginalSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("larps")
        .select("name, slug, motto, description, theme, footer_text, payment_account")
        .eq("id", larpId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { toast.error("Nepodařilo se načíst LARP"); setLoading(false); return; }
      setForm({
        name: data.name ?? "",
        slug: data.slug ?? "",
        motto: data.motto ?? "",
        description: data.description ?? "",
        theme: data.theme ?? "wwii",
        footer_text: data.footer_text ?? "",
        payment_account: (data as any).payment_account ?? "",
      });
      setOriginalSlug(data.slug ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [larpId, open]);

  function set<K extends keyof LarpForm>(key: K, value: LarpForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Název je povinný"); return; }
    if (!form.slug.trim()) { toast.error("Slug je povinný"); return; }
    setSaving(true);
    const { error } = await supabase.from("larps").update({
      name: form.name.trim(),
      slug: form.slug.trim(),
      motto: form.motto.trim() || null,
      description: form.description.trim() || null,
      theme: form.theme.trim() || null,
      footer_text: form.footer_text.trim() || null,
      payment_account: form.payment_account.trim() || null,
    }).eq("id", larpId);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Slug už existuje");
      else toast.error("Uložení selhalo: " + error.message);
      return;
    }
    toast.success("LARP uložen");
    onOpenChange(false);
    onSaved();
    if (form.slug.trim() !== originalSlug) {
      navigate(`/larp/${form.slug.trim()}`, { replace: true });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upravit LARP</DialogTitle>
          <DialogDescription>Název, motto, popis, patička a číslo účtu pro platby hráčů.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="larp-name">Název *</Label>
                <Input id="larp-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="larp-slug">Slug (v URL) *</Label>
                <Input id="larp-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="larp-motto">Motto</Label>
              <Input id="larp-motto" value={form.motto} onChange={(e) => set("motto", e.target.value)} placeholder="krátký podtitul" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="larp-desc">Popis</Label>
              <Textarea id="larp-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="larp-theme">Téma (interní označení)</Label>
              <Input id="larp-theme" value={form.theme} onChange={(e) => set("theme", e.target.value)} placeholder="např. wwii" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="larp-account">Číslo účtu (pro platby hráčů)</Label>
              <Input id="larp-account" value={form.payment_account} onChange={(e) => set("payment_account", e.target.value)} placeholder="1234567890/0100" />
              <p className="text-xs text-muted-foreground">Použije se jako výchozí pro všechny běhy, pokud běh nemá nastavený vlastní účet.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="larp-footer">Patička (zobrazená v portálech)</Label>
              <Textarea id="larp-footer" rows={2} value={form.footer_text} onChange={(e) => set("footer_text", e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Zrušit</Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
