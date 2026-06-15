import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus, Printer, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PrintableEditDialog, type PrintableRow } from "./PrintableEditDialog";

interface Props { larpId: string; runId: string; }

export function ProductionPrintablesCard({ larpId, runId }: Props) {
  const [items, setItems] = useState<PrintableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrintableRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("printables")
      .select("id, larp_id, run_id, title, url, print_instructions")
      .eq("run_id", runId).order("sort_order").order("title");
    if (error) toast.error(error.message);
    setItems((data ?? []) as PrintableRow[]);
    setLoading(false);
  }, [runId]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Smazat tiskovinu?")) return;
    const { error } = await supabase.from("printables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Smazáno");
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-typewriter text-base">Tiskoviny</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />Nová
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-muted-foreground">Zatím žádné tiskoviny.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                <Printer className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{p.title}</div>
                  {p.print_instructions && <div className="text-xs text-muted-foreground">{p.print_instructions}</div>}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate max-w-[36ch]">{p.url}</span>
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(p); setDialogOpen(true); }} title="Upravit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(p.id!)} title="Smazat">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <PrintableEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        larpId={larpId}
        runId={runId}
        printable={editing}
        onSaved={load}
      />
    </Card>
  );
}
