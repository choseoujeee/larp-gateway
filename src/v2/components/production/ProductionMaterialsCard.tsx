import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, Music, Video, FileQuestion, Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MaterialEditDialog, type MaterialRow } from "./MaterialEditDialog";

interface Props {
  larpId: string;
  /** when null → only run_id IS NULL (LARP-scope). When uuid → run_id = uuid OR run_id IS NULL */
  runId: string | null;
  /** Default run_id assigned to new materials created from this card */
  newItemRunId: string | null;
}

function typeIcon(t: string) {
  if (t === "doc") return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (t === "audio") return <Music className="h-4 w-4 text-muted-foreground" />;
  if (t === "video") return <Video className="h-4 w-4 text-muted-foreground" />;
  return <FileQuestion className="h-4 w-4 text-muted-foreground" />;
}

export function ProductionMaterialsCard({ larpId, runId, newItemRunId }: Props) {
  const [items, setItems] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("production_materials").select("id, larp_id, run_id, title, url, note, material_type, sort_order").eq("larp_id", larpId);
    if (runId) q = q.or(`run_id.eq.${runId},run_id.is.null`);
    else q = q.is("run_id", null);
    const { data, error } = await q.order("sort_order").order("title");
    if (error) toast.error(error.message);
    setItems((data ?? []) as MaterialRow[]);
    setLoading(false);
  }, [larpId, runId]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Smazat soubor?")) return;
    const { error } = await supabase.from("production_materials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Smazáno");
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-typewriter text-base">Soubory a odkazy</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />Nový
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-muted-foreground">Zatím žádné soubory.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((m) => (
              <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5">{typeIcon(m.material_type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    {runId && m.run_id === null && <Badge variant="outline" className="text-[10px]">Sdílené</Badge>}
                  </div>
                  {m.note && <div className="text-xs text-muted-foreground">{m.note}</div>}
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate max-w-[36ch]">{m.url}</span>
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(m); setDialogOpen(true); }} title="Upravit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(m.id!)} title="Smazat">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <MaterialEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        larpId={larpId}
        defaultRunId={newItemRunId}
        material={editing}
        onSaved={load}
      />
    </Card>
  );
}
