import { EVENT_TYPE_LABELS } from "./scheduleConstants";
import type { ScheduleEventRow, PortalScheduleEvent } from "./scheduleTypes";

/** Přidá minuty k času ve formátu HH:MM nebo HH:MM:SS; vrací HH:MM:00 */
export function addMinutesToTime(timeStr: string, addMinutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = (h ?? 0) * 60 + (m ?? 0) + addMinutes;
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:00`;
}

/** Celkové minuty od půlnoci → HH:MM:00 */
export function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Třídy a barva boxu podle typu události */
export function eventBoxStyle(ev: ScheduleEventRow | PortalScheduleEvent): { className: string; style?: React.CSSProperties } {
  const base = "rounded-md border text-card-foreground overflow-hidden text-left flex flex-col transition-all duration-200 ";
  if (ev.event_type === "vystoupeni_cp") {
    const color = (ev.persons as { schedule_color?: string } | null)?.schedule_color;
    if (color) {
      return { className: base + "border-l-4", style: { backgroundColor: color + "18", borderLeftColor: color, borderColor: color + "40" } };
    }
    return { className: base + "border-l-4 bg-primary/10 border-primary/30 border-l-primary/60" };
  }
  if (ev.event_type === "material") return { className: base + "border-l-4 bg-muted/60 border-muted-foreground/20 border-l-muted-foreground/40" };
  if (ev.event_type === "organizacni") return { className: base + "bg-accent/40 border-accent-foreground/15" };
  if (ev.event_type === "jidlo") return { className: base + "bg-green-500/8 border-green-500/25" };
  if (ev.event_type === "presun") return { className: base + "bg-muted/30 border-border" };
  if (ev.event_type === "informace") return { className: base + "bg-blue-500/8 border-blue-500/20" };
  return { className: base + "bg-muted/40 border-border" };
}
