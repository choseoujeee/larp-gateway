import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RunData {
  id: string;
  name: string;
  slug: string;
  date_from: string | null;
  date_to: string | null;
  location: string | null;
  address: string | null;
  is_active: boolean | null;
  larp_id: string;
  larp_name: string;
  larp_slug: string;
}

export type RunStatus = "active" | "upcoming" | "past" | "unknown";

export function getRunStatus(run: Pick<RunData, "is_active" | "date_from" | "date_to">): RunStatus {
  if (run.is_active) return "active";
  const today = new Date().toISOString().slice(0, 10);
  if (run.date_from && run.date_from > today) return "upcoming";
  if (run.date_to && run.date_to < today) return "past";
  if (run.date_from && run.date_from <= today && (!run.date_to || run.date_to >= today)) return "active";
  return "unknown";
}

export function useRun(larpSlug?: string, runSlug?: string) {
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!larpSlug || !runSlug) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: larp } = await supabase
        .from("larps")
        .select("id, name, slug")
        .eq("slug", larpSlug)
        .maybeSingle();
      if (cancelled) return;
      if (!larp) { setNotFound(true); setLoading(false); return; }

      const { data: r } = await supabase
        .from("runs")
        .select("id, name, slug, date_from, date_to, location, address, is_active, larp_id")
        .eq("larp_id", larp.id)
        .eq("slug", runSlug)
        .maybeSingle();
      if (cancelled) return;
      if (!r) { setNotFound(true); setLoading(false); return; }

      setRun({ ...r, larp_name: larp.name, larp_slug: larp.slug });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [larpSlug, runSlug]);

  return { run, loading, notFound };
}

export interface RunCockpitStats {
  persons: number;
  assigned: number;
  paid: number;
  cp: number;
  cp_with_performer: number;
  events: number;
  checklist_total: number;
  checklist_done: number;
}

export function useRunCockpitStats(runId?: string) {
  const [stats, setStats] = useState<RunCockpitStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_run_cockpit_stats", { p_run_id: runId });
      if (cancelled) return;
      setStats((data as RunCockpitStats | null) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [runId]);

  return { stats, loading };
}
