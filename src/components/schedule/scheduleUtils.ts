import { EVENT_TYPE_LABELS } from "./scheduleConstants";
import type { ScheduleEventRow, PortalScheduleEvent } from "./scheduleTypes";

/** Strip HTML tags from string for compact text-only display */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

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

/** Pastel color classes by event type */
export function eventBoxStyle(ev: ScheduleEventRow | PortalScheduleEvent): { className: string; style?: React.CSSProperties } {
  const base = "rounded-xl border overflow-hidden text-left transition-all duration-150 ";

  if (ev.event_type === "vystoupeni_cp") {
    const color = (ev.persons as { schedule_color?: string } | null)?.schedule_color;
    if (color) {
      return {
        className: base + "border-l-[3px] shadow-sm",
        style: { backgroundColor: color + "14", borderLeftColor: color, borderColor: color + "30" },
      };
    }
    return { className: base + "border-l-[3px] bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 border-l-rose-400 dark:border-l-rose-400 shadow-sm" };
  }
  if (ev.event_type === "material")
    return { className: base + "border-l-[3px] bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25 border-l-violet-400 dark:border-l-violet-400 shadow-sm" };
  if (ev.event_type === "organizacni")
    return { className: base + "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/25 shadow-sm" };
  if (ev.event_type === "jidlo")
    return { className: base + "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 shadow-sm" };
  if (ev.event_type === "presun")
    return { className: base + "bg-stone-100 dark:bg-stone-500/10 border-stone-200 dark:border-stone-500/25 shadow-sm" };
  if (ev.event_type === "informace")
    return { className: base + "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 shadow-sm" };
  if (ev.event_type === "programovy_blok")
    return { className: base + "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/25 shadow-sm" };

  return { className: base + "bg-muted/40 border-border shadow-sm" };
}
