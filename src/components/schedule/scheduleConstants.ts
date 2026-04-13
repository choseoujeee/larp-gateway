import type { Database } from "@/integrations/supabase/types";

export type EventType = Database["public"]["Enums"]["event_type"];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  programovy_blok: "Programový blok",
  jidlo: "Jídlo",
  presun: "Přesun",
  informace: "Informace",
  vystoupeni_cp: "CP VSTUP",
  material: "Materiál",
  organizacni: "Organizační",
};

export const CP_SCHEDULE_COLORS = [
  { value: "", label: "Výchozí" },
  { value: "#94a3b8", label: "Šedá" },
  { value: "#f97316", label: "Oranžová" },
  { value: "#eab308", label: "Žlutá" },
  { value: "#22c55e", label: "Zelená" },
  { value: "#06b6d4", label: "Tyrkysová" },
  { value: "#3b82f6", label: "Modrá" },
  { value: "#8b5cf6", label: "Fialová" },
  { value: "#ec4899", label: "Růžová" },
];

export const MINUTES_PER_SLOT = 5;
/** 1 minuta = 4px → 15min = 60px, 60min = 240px */
export const PX_PER_MINUTE = 4;
export const SLOT_HEIGHT_PX = MINUTES_PER_SLOT * PX_PER_MINUTE;
/** Min box height for draggable */
export const SCHEDULE_BOX_MIN_PX = 40;
