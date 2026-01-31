import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [formData, setFormData] = useState({
    day_number: 1,
    start_time: "12:00",
    duration_minutes: 15,
    location: "",
    props: "",
    description: "",
    addToSchedule: false,
  });

  useEffect(() => {
    if (scene) {
      setFormData({
        day_number: scene.day_number,
        start_time: scene.start_time.substring(0, 5),
        duration_minutes: scene.duration_minutes,
        location: scene.location || "",
        props: scene.props || "",
        description: scene.description || "",
        addToSchedule: !!scene.schedule_event_id,
      });
    } else {
      setFormData({
        day_number: 1,
        start_time: "12:00",
        duration_minutes: 15,
        location: "",
        props: "",
        description: "",
        addToSchedule: false,
      });
    }
  }, [scene, open]);

  const handleSave = async () => {
    if (!formData.start_time) {
      toast.error("Zadejte čas zahájení");
      return;
    }

    setSaving(true);

    const sceneData = {
      cp_id: cpId,
      run_id: runId,
      day_number: formData.day_number,
      start_time: formData.start_time + ":00",
      duration_minutes: formData.duration_minutes,
      location: formData.location || null,
      props: formData.props || null,
      description: formData.description || null,
    };

    try {
      let sceneId = scene?.id;
      let scheduleEventId = scene?.schedule_event_id;

      if (scene) {
        // Update existing scene
        const { error } = await supabase
          .from("cp_scenes")
          .update(sceneData)
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
            start_time: formData.start_time + ":00",
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
            start_time: formData.start_time + ":00",
            duration_minutes: formData.duration_minutes,
            location: formData.location || null,
            description: formData.description || null,
          })
          .eq("id", scheduleEventId);
      }

      toast.success(scene ? "Scéna upravena" : "Scéna vytvořena");
      onOpenChange(false);
      onSave();
    } catch (error) {
      console.error("Error saving scene:", error);
      toast.error("Chyba při ukládání scény");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-typewriter">
            {scene ? "Upravit scénu" : "Nová scéna"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              <Label>Čas zahájení</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="input-vintage"
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
            />
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
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Co má CP v této scéně dělat..."
              rows={3}
              className="input-vintage"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
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

        <DialogFooter>
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
  );
}
