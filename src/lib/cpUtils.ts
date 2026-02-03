/**
 * Utilita pro detekci časových kolizí performerů (CP).
 * Performer hraje v jednom běhu jednu CP; pokud má tato CP více scén,
 * které se časově překrývají s jinými scénami téže CP, nejde o kolizi.
 * Kolize nastane, když jeden performer hraje více CP v jednom běhu – to
 * v aktuálním modelu (jedna CP = jeden performer v běhu) nenastane.
 * Kolize tedy hledáme mezi scénami různých CP, které sdílí stejného
 * performera – tj. když cp_performers má pro daný run_id více záznamů
 * se stejným performer_name (týž člověk hraje více CP).
 */

import { supabase } from "@/integrations/supabase/client";

export interface CpSceneForConflict {
  id: string;
  cp_id: string;
  run_id: string;
  day_number: number;
  start_time: string;
  duration_minutes: number;
  location?: string | null;
}

export interface PerformerAssignment {
  cp_id: string;
  performer_name: string;
}

/** Jeden konflikt: dva časové bloky téhož performera se překrývají */
export interface PerformerConflict {
  performerName: string;
  cpIdA: string;
  cpIdB: string;
  dayNumber: number;
  timeStartA: string;
  timeEndA: string;
  timeStartB: string;
  timeEndB: string;
}

/**
 * Načte scény běhu a přiřazení performerů, seskupí scény podle performera
 * (performer může mít více CP v jednom běhu pouze pokud je to stejný
 * performer_name u různých cp_id – neplatí v aktuálním schématu, ale
 * pro jistotu seskupíme podle performer_name). Pro každého performera
 * zkontroluje překryvy časů (den + čas začátku a konce).
 */
export async function detectPerformerConflicts(runId: string): Promise<PerformerConflict[]> {
  const [scenesRes, performersRes] = await Promise.all([
    supabase
      .from("cp_scenes")
      .select("id, cp_id, run_id, day_number, start_time, duration_minutes, location")
      .eq("run_id", runId)
      .eq("is_preherni", false),
    supabase
      .from("cp_performers")
      .select("cp_id, performer_name")
      .eq("run_id", runId),
  ]);

  const scenes = (scenesRes.data ?? []) as CpSceneForConflict[];
  const performers = (performersRes.data ?? []) as PerformerAssignment[];

  // cp_id -> performer_name (bere se první záznam, v běhu má CP jednoho performera)
  const cpToPerformer = new Map<string, string>();
  for (const p of performers) {
    cpToPerformer.set(p.cp_id, p.performer_name);
  }

  // performer_name -> scény (scény všech CP, které hraje tento performer)
  const byPerformer = new Map<string, CpSceneForConflict[]>();
  for (const s of scenes) {
    const name = cpToPerformer.get(s.cp_id);
    if (!name) continue;
    if (!byPerformer.has(name)) byPerformer.set(name, []);
    byPerformer.get(name)!.push(s);
  }

  const conflicts: PerformerConflict[] = [];

  for (const [performerName, performerScenes] of byPerformer) {
    if (performerScenes.length < 2) continue;

    const withEnd = performerScenes.map((s) => {
      const [h, m, sec] = s.start_time.split(":").map(Number);
      const startMinutesInDay = (h ?? 0) * 60 + (m ?? 0) + (sec ?? 0) / 60;
      const endMinutesInDay = startMinutesInDay + s.duration_minutes;
      return {
        ...s,
        startMinutesInDay,
        endMinutesInDay,
        timeEndFormatted: formatMinutesToTime(endMinutesInDay),
      };
    });

    for (let i = 0; i < withEnd.length; i++) {
      for (let j = i + 1; j < withEnd.length; j++) {
        const a = withEnd[i];
        const b = withEnd[j];
        if (a.day_number !== b.day_number) continue;
        if (a.endMinutesInDay <= b.startMinutesInDay || b.endMinutesInDay <= a.startMinutesInDay) continue;
        conflicts.push({
          performerName,
          cpIdA: a.cp_id,
          cpIdB: b.cp_id,
          dayNumber: a.day_number,
          timeStartA: a.start_time.substring(0, 5),
          timeEndA: a.timeEndFormatted,
          timeStartB: b.start_time.substring(0, 5),
          timeEndB: b.timeEndFormatted,
        });
      }
    }
  }

  return conflicts;
}

function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Vrátí množinu cp_id, které mají alespoň jednu kolizi (jako performer).
 */
export function getCpIdsWithConflicts(conflicts: PerformerConflict[]): Set<string> {
  const set = new Set<string>();
  for (const c of conflicts) {
    set.add(c.cpIdA);
    set.add(c.cpIdB);
  }
  return set;
}
