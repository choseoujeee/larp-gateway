import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  runId: string;
  larpSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface RunForm {
  name: string;
  slug: string;
  date_from: string;
  date_to: string;
  location: string;
  address: string;
  contact: string;
  mission_briefing: string;
  footer_text: string;
  payment_account: string;
  is_active: boolean;
}

const empty: RunForm = {
  name: "", slug: "", date_from: "", date_to: "",
  location: "", address: "", contact: "",
  mission_briefing: "", footer_text: "", payment_account: "",
  is_active: false,
};

/** Fields that make sense to copy to other runs of the same LARP. Identity fields stay per-run. */
const SHARED_FIELDS = ["location", "address", "contact", "mission_briefing", "footer_text", "payment_account"] as const;

export function RunEditDialog({ runId, larpSlug, open, onOpenChange, onSaved }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<RunForm>(empty);
  const [originalSlug, setOriginalSlug] = useState("");
  const [larpId, setLarpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<"this" | "all">("this");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setScope("this");
      const { data, error } = await supabase
        .from("runs")
        .select("name, slug, date_from, date_to, location, address, contact, mission_briefing, footer_text, payment_account, is_active, larp_id")
        .eq("id", runId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { toast.error("Nepodařilo se načíst běh"); setLoading(false); return; }
      setForm({
        name: data.name ?? "",
        slug: data.slug ?? "",
        date_from: data.date_from ?? "",
        date_to: data.date_to ?? "",
        location: data.location ?? "",
        address: data.address ?? "",
        contact: data.contact ?? "",
        mission_briefing: data.mission_briefing ?? "",
        footer_text: data.footer_text ?? "",
        payment_account: data.payment_account ?? "",
        is_active: data.is_active ?? false,
      });
      setOriginalSlug(data.slug ?? "");
      setLarpId(data.larp_id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [runId, open]);

  function set<K extends keyof RunForm>(key: K, value: RunForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Název je povinný"); return; }
    if (!form.slug.trim()) { toast.error("Slug je povinný"); return; }
    if (form.date_from && form.date_to && form.date_to < form.date_from) {
      toast.error("Datum konce musí být po datu začátku"); return;
    }

    setSaving(true);

    if (form.is_active && larpId) {
      await supabase.from("runs").update({ is_active: false }).eq("larp_id", larpId).neq("id", runId);
    }

    const { error } = await supabase
      .from("runs")
      .update({
        name: form.name.trim(),
        slug: form.slug.trim(),
        date_from: form.date_from || null,
        date_to: form.date_to || null,
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        contact: form.contact.trim() || null,
        mission_briefing: form.mission_briefing || null,
        footer_text: form.footer_text || null,
        payment_account: form.payment_account.trim() || null,
        is_active: form.is_active,
      })
      .eq("id", runId);

    if (error) {
      setSaving(false);
      if (error.code === "23505") toast.error("Slug už pro tento LARP existuje");
      else toast.error("Uložení selhalo: " + error.message);
      return;
    }

    if (scope === "all" && larpId) {
      const sharedUpdate: Record<string, string | null> = {
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        contact: form.contact.trim() || null,
        mission_briefing: form.mission_briefing || null,
        footer_text: form.footer_text || null,
        payment_account: form.payment_account.trim() || null,
      };
      const { error: bulkErr } = await supabase
        .from("runs").update(sharedUpdate).eq("larp_id", larpId).neq("id", runId);
      if (bulkErr) {
        setSaving(false);
        toast.error("Tento běh uložen, ale propagace selhala: " + bulkErr.message);
        return;
      }
      toast.success("Uloženo pro všechny běhy LARPu");
    } else {
      toast.success("Běh uložen");
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();

    if (form.slug.trim() !== originalSlug) {
      navigate(`/larp/${larpSlug}/beh/${form.slug.trim()}`, { replace: true });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upravit běh</DialogTitle>
          <DialogDescription>Termín, místo, kontakt a další parametry konkrétního běhu.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Název *</Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug (v URL) *</Label>
                <Input id="slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date_from">Začátek</Label>
                <Input id="date_from" type="date" value={form.date_from} onChange={(e) => set("date_from", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date_to">Konec</Label>
                <Input id="date_to" type="date" value={form.date_to} onChange={(e) => set("date_to", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Místo (krátký název)</Label>
              <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="např. Penzion Pod Lipou" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Adresa</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Ulice 123, Město, PSČ" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact">Kontakt na org</Label>
              <Input id="contact" value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="e-mail, telefon" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mission_briefing">Mission briefing (úvodní info pro hráče)</Label>
              <Textarea id="mission_briefing" rows={4} value={form.mission_briefing} onChange={(e) => set("mission_briefing", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="footer_text">Patička (zobrazená v portále)</Label>
              <Textarea id="footer_text" rows={2} value={form.footer_text} onChange={(e) => set("footer_text", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment_account">Číslo účtu (pro platby hráčů)</Label>
              <Input id="payment_account" value={form.payment_account} onChange={(e) => set("payment_account", e.target.value)} placeholder="1234567890/0100" />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <div>
                <div className="text-sm font-medium">Aktivní běh</div>
                <div className="text-xs text-muted-foreground">Aktivní běh je viditelný v portálech hráčů a CP. Najednou může být aktivní jen jeden běh LARPu.</div>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="text-sm font-medium">Rozsah uložení</div>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as "this" | "all")} className="space-y-1">
                <label className="flex items-start gap-2 text-sm">
                  <RadioGroupItem value="this" id="scope-this" className="mt-0.5" />
                  <span>
                    <span className="font-medium">Uložit jen tento běh</span>
                    <span className="block text-xs text-muted-foreground">Změny se promítnou pouze do běhu „{form.name || "?"}".</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <RadioGroupItem value="all" id="scope-all" className="mt-0.5" />
                  <span>
                    <span className="font-medium">Uložit pro všechny běhy LARPu</span>
                    <span className="block text-xs text-muted-foreground">
                      Místo, adresa, kontakt, mission briefing, patička a číslo účtu se zapíší do všech ostatních běhů.
                      Název, slug, datum a aktivnost zůstávají per-běh.
                    </span>
                  </span>
                </label>
              </RadioGroup>
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
