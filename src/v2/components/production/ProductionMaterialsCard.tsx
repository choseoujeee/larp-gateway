import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, Music, Video, FileQuestion, Pencil, Plus, Trash2, Loader2, Printer, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MaterialEditDialog, type MaterialRow } from "./MaterialEditDialog";
import { PrintableEditDialog, type PrintableRow } from "./PrintableEditDialog";

interface Props {
  larpId: string;
  /** when null → only run_id IS NULL (LARP-scope). When uuid → run_id = uuid OR run_id IS NULL.
   *  When "all" → all materials across LARP (run-scoped + LARP-scoped). */
  runId: string | null | "all";
  /** Default run_id assigned to new materials created from this card */
  newItemRunId: string | null;
}

function typeIcon(t: string) {
  if (t === "doc") return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (t === "audio") return <Music className="h-4 w-4 text-muted-foreground" />;
  if (t === "video") return <Video className="h-4 w-4 text-muted-foreground" />;
  return <FileQuestion className="h-4 w-4 text-muted-foreground" />;
}

interface MaterialRowExt extends MaterialRow { run_name?: string | null; _kind: "material" }
interface PrintableRowExt extends PrintableRow { run_name?: string | null; _kind: "printable" }
type AnyRow = MaterialRowExt | PrintableRowExt;

export function ProductionMaterialsCard({ larpId, runId, newItemRunId }: Props) {
  const [items, setItems] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [matDialogOpen, setMatDialogOpen] = useState(false);
  const [editingMat, setEditingMat] = useState<MaterialRow | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [editingPrint, setEditingPrint] = useState<PrintableRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    // Materials
    let mq = supabase
      .from("production_materials")
      .select("id, larp_id, run_id, title, url, note, material_type, sort_order, runs:run_id(name)")
      .eq("larp_id", larpId);
    if (runId === "all") {
      // no filter
    } else if (runId) {
      mq = mq.or(`run_id.eq.${runId},run_id.is.null`);
    } else {
      mq = mq.is("run_id", null);
    }
    const { data: mats, error: mErr } = await mq.order("sort_order").order("title");
    if (mErr) toast.error(mErr.message);

    // Printables (always have run_id NOT NULL)
    let pq = supabase
      .from("printables")
      .select("id, larp_id, run_id, title, url, print_instructions, sort_order, runs:run_id(name)")
      .eq("larp_id", larpId);
    if (runId === "all") {
      // no filter
    } else if (runId) {
      pq = pq.eq("run_id", runId);
    } else {
      // LARP-only scope → printables are always run-scoped, so none
      pq = pq.eq("run_id", "00000000-0000-0000-0000-000000000000");
    }
    const { data: prints, error: pErr } = await pq.order("sort_order").order("title");
    if (pErr) toast.error(pErr.message);

    const merged: AnyRow[] = [
      ...((mats ?? []) as any[]).map((m) => ({ ...m, run_name: m.runs?.name ?? null, _kind: "material" as const })),
      ...((prints ?? []) as any[]).map((p) => ({ ...p, run_name: p.runs?.name ?? null, _kind: "printable" as const })),
    ];
    merged.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.title ?? "").localeCompare(b.title ?? "", "cs"));
    setItems(merged);
    setLoading(false);
  }, [larpId, runId]);

  useEffect(() => { load(); }, [load]);

  async function removeMaterial(id: string) {
    if (!confirm("Smazat položku?")) return;
    const { error } = await supabase.from("production_materials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Smazáno");
    load();
  }
  async function removePrintable(id: string) {
    if (!confirm("Smazat tiskovinu?")) return;
    const { error } = await supabase.from("printables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Smazáno");
    load();
  }

  const canAddPrintable = !!newItemRunId;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-typewriter text-base">Soubory, odkazy a tiskoviny</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Nový<ChevronDown className="ml-1 h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingMat(null); setMatDialogOpen(true); }}>
              <FileText className="mr-2 h-4 w-4" />Soubor / odkaz
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { if (canAddPrintable) { setEditingPrint(null); setPrintDialogOpen(true); } else { toast.error("Tiskovinu lze přidat jen v rámci běhu."); } }}
              disabled={!canAddPrintable}
            >
              <Printer className="mr-2 h-4 w-4" />Tiskovina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-muted-foreground">Zatím žádné položky.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((m) => (
              <li key={`${m._kind}-${m.id}`} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5">
                  {m._kind === "printable"
                    ? <Printer className="h-4 w-4 text-muted-foreground" />
                    : typeIcon((m as MaterialRowExt).material_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    {m._kind === "printable" && <Badge variant="outline" className="text-[10px]">Tiskovina</Badge>}
                    {runId === "all" && (
                      m.run_id === null
                        ? <Badge variant="outline" className="text-[10px]">Sdílené</Badge>
                        : m.run_name ? <Badge variant="secondary" className="text-[10px]">{m.run_name}</Badge> : null
                    )}
                    {typeof runId === "string" && runId !== "all" && m.run_id === null && <Badge variant="outline" className="text-[10px]">Sdílené</Badge>}
                  </div>
                  {m._kind === "material" && (m as MaterialRowExt).note && (
                    <div className="text-xs text-muted-foreground">{(m as MaterialRowExt).note}</div>
                  )}
                  {m._kind === "printable" && (m as PrintableRowExt).print_instructions && (
                    <div className="text-xs text-muted-foreground">{(m as PrintableRowExt).print_instructions}</div>
                  )}
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate max-w-[36ch]">{m.url}</span>
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Upravit"
                    onClick={() => {
                      if (m._kind === "material") { setEditingMat(m as MaterialRow); setMatDialogOpen(true); }
                      else { setEditingPrint(m as PrintableRow); setPrintDialogOpen(true); }
                    }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Smazat"
                    onClick={() => m._kind === "material" ? removeMaterial(m.id!) : removePrintable(m.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <MaterialEditDialog
        open={matDialogOpen}
        onOpenChange={setMatDialogOpen}
        larpId={larpId}
        defaultRunId={newItemRunId}
        material={editingMat}
        onSaved={load}
      />
      {newItemRunId && (
        <PrintableEditDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          larpId={larpId}
          runId={editingPrint?.run_id ?? newItemRunId}
          printable={editingPrint}
          onSaved={load}
        />
      )}
    </Card>
  );
}
