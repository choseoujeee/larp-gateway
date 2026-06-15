import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CpSceneList, type CpScene } from "@/components/admin/CpSceneList";

interface RunMini { id: string; name: string; slug: string; is_active: boolean | null; date_from: string | null; date_to: string | null; }

interface Props { larpId: string; cpId: string; }

export function CpScenesSection({ larpId, cpId }: Props) {
  const [runs, setRuns] = useState<RunMini[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<CpScene[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingScenes, setLoadingScenes] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingRuns(true);
      const { data } = await supabase
        .from("runs")
        .select("id, name, slug, is_active, date_from, date_to")
        .eq("larp_id", larpId)
        .order("date_from", { ascending: false });
      const list = (data ?? []) as RunMini[];
      setRuns(list);
      const active = list.find((r) => r.is_active) ?? list[0] ?? null;
      setSelectedRunId(active?.id ?? null);
      setLoadingRuns(false);
    })();
  }, [larpId]);

  const loadScenes = useCallback(async () => {
    if (!larpId) { setScenes([]); return; }
    setLoadingScenes(true);
    const { data } = await supabase
      .from("cp_scenes")
      .select("*")
      .eq("cp_id", cpId)
      .eq("larp_id", larpId)
      .order("day_number")
      .order("start_time");
    setScenes((data ?? []) as CpScene[]);
    setLoadingScenes(false);
  }, [cpId, larpId]);

  useEffect(() => { loadScenes(); }, [loadScenes]);

  const selectedRun = useMemo(() => runs.find((r) => r.id === selectedRunId) ?? null, [runs, selectedRunId]);
  const runDays = useMemo(() => {
    if (!selectedRun?.date_from || !selectedRun?.date_to) return 3;
    const a = new Date(selectedRun.date_from).getTime();
    const b = new Date(selectedRun.date_to).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [selectedRun]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="font-typewriter text-lg">Scény v harmonogramu</CardTitle>
        {runs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Dny podle běhu</span>
            <Select value={selectedRunId ?? ""} onValueChange={(v) => setSelectedRunId(v)}>
              <SelectTrigger className="h-8 w-auto min-w-[180px] text-sm"><SelectValue placeholder="Vyber běh…" /></SelectTrigger>
              <SelectContent>
                {runs.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}{r.is_active ? " · aktivní" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loadingRuns ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : loadingScenes ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <CpSceneList
            scenes={scenes}
            cpId={cpId}
            larpId={larpId}
            runDays={runDays}
            onScenesChange={loadScenes}
          />
        )}
      </CardContent>
    </Card>
  );
}
