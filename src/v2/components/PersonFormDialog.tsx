import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify, randomPassword } from "../lib/slug";
import { toast } from "sonner";

export interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  larpId: string;
  type: "postava" | "cp";
  /** If set, edit mode; otherwise create */
  person?: {
    id: string;
    name: string;
    slug: string;
    group_name: string | null;
    performer: string | null;
    performance_times: string | null;
  } | null;
  onSaved: (id: string) => void;
}

export function PersonFormDialog({ open, onOpenChange, larpId, type, person, onSaved }: PersonFormDialogProps) {
  const isEdit = !!person;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [groupName, setGroupName] = useState("");
  const [performer, setPerformer] = useState("");
  const [performanceTimes, setPerformanceTimes] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (person) {
      setName(person.name);
      setSlug(person.slug);
      setGroupName(person.group_name ?? "");
      setPerformer(person.performer ?? "");
      setPerformanceTimes(person.performance_times ?? "");
      setPassword("");
      setSlugTouched(true);
    } else {
      setName(""); setSlug(""); setGroupName(""); setPerformer(""); setPerformanceTimes("");
      setPassword(randomPassword());
      setSlugTouched(false);
    }
  }, [open, person]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function handleSave() {
    if (!name.trim() || !slug.trim()) { toast.error("Jméno a slug jsou povinné"); return; }
    setSaving(true);
    if (isEdit && person) {
      const { error } = await supabase.from("persons").update({
        name, slug, group_name: groupName || null,
        performer: performer || null, performance_times: performanceTimes || null,
      }).eq("id", person.id);
      setSaving(false);
      if (error) { toast.error("Uložení selhalo: " + error.message); return; }
      toast.success("Uloženo");
      onSaved(person.id);
      onOpenChange(false);
    } else {
      if (!password.trim()) { setSaving(false); toast.error("Heslo je povinné"); return; }
      const { data, error } = await supabase.rpc("create_person_with_password", {
        p_larp_id: larpId,
        p_name: name,
        p_slug: slug,
        p_type: type,
        p_password: password,
        p_group_name: groupName || null,
        p_performer: performer || null,
        p_performance_times: performanceTimes || null,
      });
      setSaving(false);
      if (error || !data) { toast.error("Vytvoření selhalo: " + (error?.message ?? "")); return; }
      toast.success(type === "cp" ? "CP vytvořeno" : "Postava vytvořena");
      onSaved(data as string);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-typewriter">
            {isEdit ? (type === "cp" ? "Upravit CP" : "Upravit postavu") : (type === "cp" ? "Nové CP" : "Nová postava")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Jméno *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input id="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
            <p className="mt-1 text-xs text-muted-foreground">Použito v URL portálu.</p>
          </div>
          <div>
            <Label htmlFor="group">Skupina</Label>
            <Input id="group" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </div>
          {type === "cp" && (
            <>
              <div>
                <Label htmlFor="performer">Performer</Label>
                <Input id="performer" value={performer} onChange={(e) => setPerformer(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ptimes">Časy vystoupení</Label>
                <Input id="ptimes" value={performanceTimes} onChange={(e) => setPerformanceTimes(e.target.value)} placeholder="např. Pá večer, So odpoledne" />
              </div>
            </>
          )}
          {!isEdit && (
            <div>
              <Label htmlFor="pw">Heslo do portálu *</Label>
              <div className="flex gap-2">
                <Input id="pw" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button type="button" variant="outline" onClick={() => setPassword(randomPassword())}>Nové</Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Hráč ho použije pro přístup do portálu.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
