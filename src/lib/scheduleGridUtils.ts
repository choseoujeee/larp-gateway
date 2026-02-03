/** Čas HH:MM nebo HH:MM:SS → celkové minuty od půlnoci */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Událost s časem a délkou – minimální tvar pro přiřazení lane */
export interface EventWithTime {
  start_time: string;
  duration_minutes: number;
}

/**
 * Přiřadí lane indexy událostem v jednom dni.
 * Překrývající se události (stejný start nebo druhý začne dřív, než první skončí) dostanou různé laneIndex.
 */
export function assignLanes<T extends EventWithTime>(
  events: T[]
): (T & { laneIndex: number })[] {
  const sorted = [...events].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
  const laneEnd: number[] = [];
  const result: (T & { laneIndex: number })[] = [];
  for (const ev of sorted) {
    const start = timeToMinutes(ev.start_time);
    const end = start + ev.duration_minutes;
    let lane = 0;
    while (lane < laneEnd.length && laneEnd[lane] > start) lane++;
    if (lane === laneEnd.length) laneEnd.push(0);
    laneEnd[lane] = end;
    result.push({ ...ev, laneIndex: lane });
  }
  return result;
}
