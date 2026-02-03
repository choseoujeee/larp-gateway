import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CpScene } from "./CpSceneList";

interface CpSceneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scene: CpScene | null;
  cpId: string;
  runId: string;
  runDays?: number;
  onSave: () => void;
}

export function CpSceneDialog({
  open,
  onOpenChange,
  scene,
  cpId,
  runId,
  runDays = 3,
  onSave,
}: CpSceneDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    day_number: 1,
    start_time: "12:00",
    duration_minutes: 15,
    location: "",
    props: "",
    description: "",
    is_preherni: false,
    addToSchedule: false,
  });

  useEffect(() => {
    if (scene) {
      setFormData({
        title: scene.title || "",
        day_number: scene.day_number,
        start_time: scene.start_time.substring(0, 5),
        duration_minutes: scene.duration_minutes,
        location: scene.location || "",
        props: scene.props || "",
        description: scene.description || "",
        is_preherni: !!scene.is_preherni,
        addToSchedule: !!scene.schedule_event_id,
      });
    } else {
      setFormData({
        title: "",
        day_number: 1,
        start_time: "12:00",
        duration_minutes: 15,
        location: "",
        props: "",
        description: "",
        is_preherni: false,
        addToSchedule: true, // výchozí: scéna se rovnou propíše do harmonogramu
      });
    }
  }, [scene, open]);

  useEffect(() => {
    if (!open || !runId) return;
    supabase
      .from("cp_scenes")
      .select("location")
      .eq("run_id", runId)
      .not("location", "is", null)
      .then(({ data }) => {
        const distinct = [...new Set((data ?? []).map((r) => (r as { location: string }).location).filter(Boolean))].sort();
        setLocationSuggestions(distinct);
      });
  }, [open, runId]);

  const handleSave = async () => {
    if (!formData.start_time?.trim()) {
      toast.error("Zadejte čas zahájení");
      return;
    }

    setSaving(true);

    const [h, m] = formData.start_time.trim().split(":");
    const hour = Math.min(23, Math.max(0, parseInt(h, 10) || 0));
    const min = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
    const startTimeNormalized = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;

    const sceneData = {
      cp_id: cpId,
      run_id: runId,
      title: formData.title.trim() || null,
      day_number: formData.day_number,
      start_time: startTimeNormalized,
      duration_minutes: formData.duration_minutes,
      location: formData.location || null,
      props: formData.props || null,
      description: formData.description || null,
      is_preherni: formData.is_preherni,
    };

    try {
      let sceneId = scene?.id;
      let scheduleEventId = scene?.schedule_event_id;

      if (scene) {
        // Update existing scene – pouze měnitelné sloupce (bez cp_id, run_id)
        const updatePayload = {
          title: formData.title.trim() || null,
          day_number: formData.day_number,
          start_time: startTimeNormalized,
          duration_minutes: formData.duration_minutes,
          location: formData.location || null,
          props: formData.props || null,
          description: formData.description || null,
          is_preherni: formData.is_preherni,
        };
        const { error } = await supabase
          .from("cp_scenes")
          .update(updatePayload)
          .eq("id", scene.id);

        if (error) throw error;
      } else {
        // Create new scene
        const { data, error } = await supabase
          .from("cp_scenes")
          .insert(sceneData)
          .select("id")
          .single();

        if (error) throw error;
        sceneId = data.id;
      }

      // Handle schedule event synchronization
      if (formData.addToSchedule && !scheduleEventId) {
        // Fetch CP name for schedule event title
        const { data: cpData } = await supabase
          .from("persons")
          .select("name")
          .eq("id", cpId)
          .single();

        // Create schedule event
        const { data: eventData, error: eventError } = await supabase
          .from("schedule_events")
          .insert({
            run_id: runId,
            day_number: formData.day_number,
            start_time: startTimeNormalized,
            duration_minutes: formData.duration_minutes,
            event_type: "vystoupeni_cp",
            title: `CP: ${cpData?.name || "Neznámá CP"}`,
            location: formData.location || null,
            description: formData.description || null,
            cp_id: cpId,
            cp_scene_id: sceneId,
          })
          .select("id")
          .single();

        if (eventError) {
          console.error("Failed to create schedule event:", eventError);
        } else if (eventData) {
          // Link scene to schedule event
          await supabase
            .from("cp_scenes")
            .update({ schedule_event_id: eventData.id })
            .eq("id", sceneId);
        }
      } else if (!formData.addToSchedule && scheduleEventId) {
        // Remove schedule event
        await supabase
          .from("schedule_events")
          .delete()
          .eq("id", scheduleEventId);

        await supabase
          .from("cp_scenes")
          .update({ schedule_event_id: null })
          .eq("id", sceneId);
      } else if (formData.addToSchedule && scheduleEventId) {
        // Update existing schedule event
        await supabase
          .from("schedule_events")
          .update({
            day_number: formData.day_number,
            start_time: startTimeNormalized,
            duration_minutes: formData.duration_minutes,
            location: formData.location || null,
            description: formData.description || null,
          })
          .eq("id", scheduleEventId);
      }

      toast.success(scene ? "Scéna upravena" : "Scéna vytvořena");
      onOpenChange(false);
      onSave();
    } catch (err: unknown) {
      console.error("Error saving scene:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string })?.message === "string"
            ? (err as { message: string }).message
            : "Chyba při ukládání scény";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScene = async () => {
    if (!scene?.id) return;
    setDeleting(true);
    const { error } = await supabase.from("cp_scenes").delete().eq("id", scene.id);
    setDeleting(false);
    setDeleteConfirmOpen(false);
    if (error) {
      toast.error("Chyba při mazání scény");
      return;
    }
    toast.success("Scéna smazána");
    onOpenChange(false);
    onSave();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-card max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 border-b bg-background px-6 py-4">
          <DialogTitle className="font-typewriter">
            {scene ? "Upravit scénu" : "Nová scéna"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-6 py-4 pr-4">
          <div className="space-y-2">
            <Label>Název scény</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Např. Příchod do kanceláře"
              className="input-vintage"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Den</Label>
              <Select
                value={String(formData.day_number)}
                onValueChange={(v) => setFormData({ ...formData, day_number: parseInt(v) })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: runDays }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Den {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Čas zahájení (24 h)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="14:30"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                onBlur={() => {
                  const [h, m] = formData.start_time.split(":");
                  const hour = Math.min(23, Math.max(0, parseInt(h, 10) || 0));
                  const min = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
                  setFormData((prev) => ({
                    ...prev,
                    start_time: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
                  }));
                }}
                className="input-vintage w-24 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Délka (minuty)</Label>
            <Input
              type="number"
              min={5}
              max={240}
              step={5}
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 15 })}
              className="input-vintage w-24"
            />
          </div>

          <div className="space-y-2">
            <Label>Lokace</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Kancelář, Náměstí..."
              className="input-vintage"
              list="cp-scene-location-list"
            />
            {locationSuggestions.length > 0 && (
              <datalist id="cp-scene-location-list">
                {locationSuggestions.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-2">
            <Label>Rekvizity</Label>
            <Input
              value={formData.props}
              onChange={(e) => setFormData({ ...formData, props: e.target.value })}
              placeholder="průkaz, kufr, klíč..."
              className="input-vintage"
            />
          </div>

          <div className="space-y-2">
            <Label>Popis / úkol</Label>
            <RichTextEditor
              value={formData.description}
              onChange={(html) => setFormData({ ...formData, description: html })}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_preherni"
                checked={formData.is_preherni}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_preherni: checked === true })
                }
              />
              <Label htmlFor="is_preherni" className="cursor-pointer">
                Předherní scéna (nehlídá se kolize času)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="addToSchedule"
                checked={formData.addToSchedule}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, addToSchedule: checked === true })
                }
              />
              <Label htmlFor="addToSchedule" className="cursor-pointer">
                Automaticky přidat do harmonogramu
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4">
          {scene ? (
            <Button
              type="button"
              variant="outline"
              className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Smazat scénu
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={saving} className="btn-vintage">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent className="paper-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-typewriter">Smazat scénu?</AlertDialogTitle>
          <AlertDialogDescription>
            Opravdu chcete smazat tuto scénu? Událost v harmonogramu (pokud existuje) zůstane, ale přestane být propojená.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteScene}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
