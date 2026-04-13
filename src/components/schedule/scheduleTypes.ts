import type { Database } from "@/integrations/supabase/types";

export type ScheduleEventRow = Database["public"]["Tables"]["schedule_events"]["Row"] & {
  material_id?: string | null;
  document_id?: string | null;
  performer_text?: string | null;
  persons?: { access_token?: string; name: string; performer?: string | null; schedule_color?: string | null } | null;
  cp_scenes?: { title: string | null } | null;
};

export interface EventWithLane extends ScheduleEventRow {
  laneIndex: number;
}

export interface PortalScheduleEvent {
  id: string;
  day_number: number;
  start_time: string;
  duration_minutes: number;
  event_type: string;
  title: string;
  description: string | null;
  location: string | null;
  cp_id: string | null;
  cp_scene_id: string | null;
  material_id: string | null;
  document_id: string | null;
  performer_text?: string | null;
  persons?: { name: string; performer?: string | null; schedule_color?: string | null } | null;
  cp_scenes?: { title: string | null } | null;
}

export interface PortalEventWithLane extends PortalScheduleEvent {
  laneIndex: number;
}

export interface CP {
  id: string;
  name: string;
  performer?: string | null;
  schedule_color?: string | null;
}

export interface ScheduleMaterial {
  id: string;
  title: string;
  material_type: string;
}

export interface ScheduleProductionDoc {
  id: string;
  title: string;
}

export interface ScheduleCpScene {
  id: string;
  cp_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start_time: string;
  duration_minutes: number;
  day_number: number;
  persons?: { name: string } | null;
}

export interface GridTimeRange {
  minStartMinutes: number;
  maxEndMinutes: number;
  slotLabels: string[];
  totalSlots: number;
}
