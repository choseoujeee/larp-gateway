import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlayerHistoryEntry {
  key: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  /** Number of runs they've played */
  runs_count: number;
}

/**
 * Aggregates all players that have ever been assigned to any run in the given LARP.
 * Used for autocomplete when inviting a player to a new run.
 */
export function useLarpPlayerHistory(larpId?: string) {
  const [players, setPlayers] = useState<PlayerHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!larpId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("run_person_assignments")
        .select("player_name, player_email, player_phone, run:runs!inner(larp_id)")
        .eq("run.larp_id", larpId);
      if (cancelled) return;
      const map = new Map<string, PlayerHistoryEntry>();
      for (const r of (data ?? []) as { player_name: string | null; player_email: string | null; player_phone: string | null }[]) {
        const email = r.player_email?.trim().toLowerCase() || null;
        const name = r.player_name?.trim() || null;
        if (!email && !name) continue;
        const key = email ?? `name:${name?.toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          existing.runs_count += 1;
          if (!existing.phone && r.player_phone) existing.phone = r.player_phone;
          if (!existing.email && email) existing.email = email;
          if (!existing.display_name && name) existing.display_name = name;
        } else {
          map.set(key, {
            key,
            display_name: name || email || "—",
            email,
            phone: r.player_phone || null,
            runs_count: 1,
          });
        }
      }
      setPlayers(Array.from(map.values()).sort((a, b) => b.runs_count - a.runs_count));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [larpId]);

  return { players, loading };
}

/**
 * Aggregates all CP performers that have ever been assigned to any run in this LARP.
 */
export function useLarpPerformerHistory(larpId?: string) {
  const [performers, setPerformers] = useState<PlayerHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!larpId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cp_performers")
        .select("performer_name, performer_email, performer_phone, run:runs!inner(larp_id)")
        .eq("run.larp_id", larpId);
      if (cancelled) return;
      const map = new Map<string, PlayerHistoryEntry>();
      for (const r of (data ?? []) as { performer_name: string | null; performer_email: string | null; performer_phone: string | null }[]) {
        const email = r.performer_email?.trim().toLowerCase() || null;
        const name = r.performer_name?.trim() || null;
        if (!email && !name) continue;
        const key = email ?? `name:${name?.toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          existing.runs_count += 1;
          if (!existing.phone && r.performer_phone) existing.phone = r.performer_phone;
          if (!existing.email && email) existing.email = email;
          if (!existing.display_name && name) existing.display_name = name;
        } else {
          map.set(key, {
            key,
            display_name: name || email || "—",
            email,
            phone: r.performer_phone || null,
            runs_count: 1,
          });
        }
      }
      setPerformers(Array.from(map.values()).sort((a, b) => b.runs_count - a.runs_count));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [larpId]);

  return { performers, loading };
}
