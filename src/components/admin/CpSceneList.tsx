import { useState } from "react";
import { Clock, MapPin, Package, Pencil, Trash2, Plus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";
import { CpSceneDialog } from "./CpSceneDialog";

export interface CpScene {
  id: string;
  cp_id: string;
  run_id: string;
  start_time: string;
  duration_minutes: number;
  day_number: number;
  title: string | null;
  is_preherni?: boolean;
  location: string | null;
  props: string | null;
  description: string | null;
  sort_order: number | null;
  schedule_event_id: string | null;
}

interface CpSceneListProps {
  scenes: CpScene[];
  cpId: string;
  runId: string;
  onScenesChange: () => void;
  runDays?: number;
}

export function CpSceneList({ scenes, cpId, runId, onScenesChange, runDays = 3 }: CpSceneListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<CpScene | null>(null);

  const handleAddScene = () => {
    setSelectedScene(null);
    setDialogOpen(true);
  };

  const handleEditScene = (scene: CpScene) => {
    setSelectedScene(scene);
    setDialogOpen(true);
  };

  const handleDeleteScene = async () => {
    if (!selectedScene) return;

    const { error } = await supabase
      .from("cp_scenes")
      .delete()
      .eq("id", selectedScene.id);

    if (error) {
      toast.error("Chyba při mazání scény");
      return;
    }

    toast.success("Scéna smazána");
    setDeleteDialogOpen(false);
    setSelectedScene(null);
    onScenesChange();
  };

  const formatTime = (time: string) => {
    // time is in HH:MM:SS format, show only HH:MM
    return time.substring(0, 5);
  };

  const sortedScenes = [...scenes].sort((a, b) => {
    if (a.day_number !== b.day_number) return a.day_number - b.day_number;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-typewriter text-lg">Scény</h3>
        <Button variant="outline" size="sm" onClick={handleAddScene}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Nová scéna
        </Button>
      </div>

      {sortedScenes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Tato CP zatím nemá žádné scény
        </p>
      ) : (
        <div className="space-y-2">
          {sortedScenes.map((scene) => (
            <div
              key={scene.id}
              className="group flex items-start gap-3 rounded-md border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {scene.title && (
                    <span className="font-medium">{scene.title}</span>
                  )}
                  <span className={`flex items-center gap-1.5 ${scene.title ? "text-muted-foreground text-sm" : "font-medium"}`}>
                    <Clock className="h-3.5 w-3.5" />
                    Den {scene.day_number}, {formatTime(scene.start_time)}
                  </span>
                  {scene.duration_minutes !== 15 && (
                    <Badge variant="outline" className="text-xs">
                      {scene.duration_minutes} min
                    </Badge>
                  )}
                  {scene.is_preherni && (
                    <Badge variant="outline" className="text-xs">
                      Předherní
                    </Badge>
                  )}
                  {scene.schedule_event_id && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      V harmonogramu
                    </Badge>
                  )}
                </div>
                
                {scene.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {scene.location}
                  </p>
                )}
                
                {scene.props && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Package className="h-3.5 w-3.5" />
                    {scene.props}
                  </p>
                )}
                
                {scene.description && (
                  <div
                    className="text-sm mt-2 line-clamp-2 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(scene.description.startsWith("<") ? scene.description : scene.description.replace(/\n/g, "<br/>")),
                    }}
                  />
                )}
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleEditScene(scene)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedScene(scene);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CpSceneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scene={selectedScene}
        cpId={cpId}
        runId={runId}
        runDays={runDays}
        onSave={onScenesChange}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat scénu?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat tuto scénu?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScene}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
