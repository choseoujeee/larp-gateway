import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRunContext } from "@/hooks/useRunContext";
import { useLarpContext } from "@/hooks/useLarpContext";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Play, Square, Clock, MapPin, User, Loader2, Pencil, Trash2, FileText, GripVertical, KeyRound, Copy, Drama } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { CpSceneDialog } from "@/components/admin/CpSceneDialog";
import type { CpScene } from "@/components/admin/CpSceneList";
import { assignLanes, timeToMinutes } from "@/lib/scheduleGridUtils";

type EventType = Database["public"]["Enums"]["event_type"];

type ScheduleEventRow = Database["public"]["Tables"]["schedule_events"]["Row"] & {
  material_id?: string | null;
  document_id?: string | null;
  performer_text?: string | null;
  persons?: { access_token: string; name: string; performer?: string | null; schedule_color?: string | null } | null;
  cp_scenes?: { title: string | null } | null;
};

interface CP {
  id: string;
  name: string;
  performer?: string | null;
  schedule_color?: string | null;
}

interface ScheduleMaterial {
  id: string;
  title: string;
  material_type: string;
}

interface ScheduleProductionDoc {
  id: string;
  title: string;
}

/** CP scéna pro výběr „předvyplnit z existujícího“ */
interface ScheduleCpScene {
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  programovy_blok: "Programový blok",
  jidlo: "Jídlo",
  presun: "Přesun",
  informace: "Informace",
  vystoupeni_cp: "CP VSTUP",
  material: "Materiál",
  organizacni: "Organizační",
};

const CP_SCHEDULE_COLORS = [
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

const MINUTES_PER_SLOT = 15;
/** Min. šířka/výška boxu události – grid se roztáhne horizontálně i vertikálně, aby se boxy nepřekrývaly */
const SCHEDULE_BOX_MIN_PX = 88;
/** Výška jednoho časového slotu (15 min) = min. výška boxu, aby se boxy vertikálně nepřekrývaly */
const SLOT_HEIGHT_PX = SCHEDULE_BOX_MIN_PX;

/** Přidá minuty k času ve formátu HH:MM nebo HH:MM:SS; vrací HH:MM:00 */
function addMinutesToTime(timeStr: string, addMinutes: number): string {
  const [h, m, s] = timeStr.split(":").map(Number);
  const totalMins = (h ?? 0) * 60 + (m ?? 0) + addMinutes;
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:00`;
}

/** Celkové minuty od půlnoci → HH:MM:00 */
function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Událost s přiřazeným lane indexem pro grid (události vedle sebe) */
interface EventWithLane extends ScheduleEventRow {
  laneIndex: number;
}

/** Třídy a barva boxu podle typu události – tlumená bež/hnědá paleta jako v původní apce */
function eventBoxStyle(ev: ScheduleEventRow): { className: string; style?: React.CSSProperties } {
  const base = "rounded-md border border-stone-400/80 text-stone-800 overflow-hidden text-left flex flex-col ";
  if (ev.event_type === "vystoupeni_cp") {
    const color = (ev.persons as { schedule_color?: string } | null)?.schedule_color;
    if (color) {
      return { className: base + "border-2", style: { backgroundColor: color + "25", borderColor: color } };
    }
    return { className: base + "bg-amber-50/90 border-amber-300" };
  }
  if (ev.event_type === "material") return { className: base + "bg-amber-50/80 border-amber-300/80" };
  if (ev.event_type === "organizacni") return { className: base + "bg-stone-100 border-stone-400" };
  if (ev.event_type === "jidlo") return { className: base + "bg-amber-50/80 border-amber-400/80" };
  if (ev.event_type === "presun") return { className: base + "bg-stone-50 border-stone-300" };
  if (ev.event_type === "informace") return { className: base + "bg-stone-100/80 border-stone-400" };
  return { className: base + "bg-stone-50/90 border-stone-400" };
}

/** Řádek události v harmonogramu – přetahovatelný, layout podle obrázku (DEN + čas vlevo, detaily vpravo) */
function SortableScheduleRow({
  event: ev,
  isCurrent,
  onEdit,
  onDelete,
}: {
  event: ScheduleEventRow;
  isCurrent: boolean;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ev.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const timeDisplay = ev.start_time.length >= 5 ? ev.start_time.substring(0, 5) : ev.start_time;
  const sceneTitle =
    (ev as ScheduleEventRow & { cp_scenes?: { title: string | null } | null }).cp_scenes?.title ??
    (ev.cp_scene_id ? "Scéna" : null) ??
    ev.title;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-stretch border border-border rounded-md overflow-hidden bg-card text-card-foreground ${
        isCurrent ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
    >
      <button
        type="button"
        className="flex items-center justify-center w-8 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:bg-muted/50 border-r border-border"
        {...attributes}
        {...listeners}
        title="Přetáhnout pro změnu pořadí"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 flex-1">
        <div className="shrink-0 w-24 py-3 px-3 border-r border-border bg-muted/30 flex flex-col justify-center">
          <span className="text-xs text-muted-foreground font-medium">DEN {ev.day_number}</span>
          <span className="text-lg font-semibold font-mono">{timeDisplay}</span>
        </div>
        <div className="flex-1 min-w-0 py-3 px-4 flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
          </span>
          {ev.cp_id && (
            <span className="flex items-center gap-1.5 text-sm">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              {(ev.persons as { name?: string } | null)?.name ?? "—"}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            {sceneTitle}
          </span>
          {ev.location && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {ev.location}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [.group:focus-within_&]:opacity-100">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Upravit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Smazat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Jedna 15min slot zóna v gridu – přijímá drop události pro změnu času/dne */
function GridSlotDroppable({
  dayNum,
  slotIndex,
  heightPx,
}: {
  dayNum: number;
  slotIndex: number;
  heightPx: number;
}) {
  const id = `grid-slot-${dayNum}-${slotIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { dayNum, slotIndex } });
  return (
    <div
      ref={setNodeRef}
      style={{ height: heightPx, minHeight: heightPx }}
      className={`border-b border-border/50 transition-colors ${isOver ? "bg-primary/20" : ""}`}
    />
  );
}

/** Box události v gridu – TYP + ikony: CP (které cp), papír (scéna), lokace, maska (jméno performera); draggable */
function ScheduleEventBox({
  event: ev,
  sceneOrder,
  runPerformerByCpId,
  topPx,
  heightPx,
  leftPct,
  widthPct,
  isCurrent,
  onEdit,
  onDelete,
}: {
  event: ScheduleEventRow;
  sceneOrder?: number;
  runPerformerByCpId?: Record<string, string>;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
  isCurrent: boolean;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ev.id });
  const { className, style } = eventBoxStyle(ev);
  const typeLabel = EVENT_TYPE_LABELS[ev.event_type] || ev.event_type;
  const persons = ev.persons as { name?: string; performer?: string } | null;
  const cpName = ev.cp_id ? (persons?.name?.trim() || null) : null;
  // Přednost: performer_text (jednorázová role) > přiřazení z běhu > globální performer CP
  const performerLabel =
    ev.cp_id
      ? ((ev as ScheduleEventRow).performer_text?.trim() || runPerformerByCpId?.[ev.cp_id] || persons?.performer?.trim() || "NEPŘIŘAZENO")
      : null;
  const sceneTitleRaw = (ev as ScheduleEventRow & { cp_scenes?: { title: string | null } | null }).cp_scenes?.title?.trim();
  const sceneTitle = sceneTitleRaw || (ev.cp_scene_id && sceneOrder != null ? `Scéna ${sceneOrder}` : null) || ev.title || "—";
  const timeDisplay = ev.start_time.length >= 5 ? ev.start_time.substring(0, 5) : ev.start_time;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute left-0 right-0 group cursor-grab active:cursor-grabbing ${className} ${isCurrent ? "ring-2 ring-amber-600 ring-inset" : ""} ${isDragging ? "opacity-50 z-20" : ""}`}
      style={{
        top: topPx,
        height: Math.max(heightPx, SCHEDULE_BOX_MIN_PX),
        minHeight: SCHEDULE_BOX_MIN_PX,
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 4px)`,
        minWidth: SCHEDULE_BOX_MIN_PX - 4,
        marginLeft: 2,
        marginRight: 2,
        ...style,
      }}
      onClick={(e) => { if (!isDragging) onEdit(); }}
      title={[ev.title, typeLabel, cpName ?? undefined, performerLabel ?? undefined, ev.location ?? undefined].filter(Boolean).join(" · ")}
    >
      <div className="p-1.5 h-full flex flex-col min-w-0 text-stone-800">
        <div className="font-bold text-stone-800 uppercase tracking-wide text-xs border-b border-stone-400/80 pb-0.5 mb-1 shrink-0 flex items-baseline gap-1.5 flex-wrap">
          <span className="font-mono">{timeDisplay}</span>
          <span>·</span>
          <span>{typeLabel}</span>
        </div>
        <div className="flex flex-col gap-0.5 min-h-0 flex-1 text-xs">
          {cpName != null && (
            <span className="flex items-center gap-1.5 truncate">
              <User className="h-3.5 w-3 shrink-0 text-stone-600" aria-hidden />
              {cpName || "—"}
            </span>
          )}
          <span className="flex items-center gap-1.5 truncate">
            <FileText className="h-3.5 w-3 shrink-0 text-stone-600" aria-hidden />
            {sceneTitle}
          </span>
          {ev.location && (
            <span className="flex items-center gap-1.5 truncate text-stone-700">
              <MapPin className="h-3.5 w-3 shrink-0 text-stone-600" aria-hidden />
              {ev.location}
            </span>
          )}
          {performerLabel != null && (
            <span className="flex items-center gap-1.5 truncate">
              <Drama className="h-3.5 w-3 shrink-0 text-stone-600" aria-hidden />
              {performerLabel}
            </span>
          )}
        </div>
      </div>
      <div
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-600" onClick={onEdit} title="Upravit">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={onDelete}
          title="Smazat"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { runs, selectedRunId } = useRunContext();
  const { currentLarpId } = useLarpContext();
  const [events, setEvents] = useState<ScheduleEventRow[]>([]);
  const [cps, setCps] = useState<CP[]>([]);
  const [scheduleMaterials, setScheduleMaterials] = useState<ScheduleMaterial[]>([]);
  const [scheduleProductionDocs, setScheduleProductionDocs] = useState<ScheduleProductionDoc[]>([]);
  const [scheduleCpScenes, setScheduleCpScenes] = useState<ScheduleCpScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveDayNumber, setLiveDayNumber] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDay, setFilterDay] = useState<number | "all">("all");
  const [filterEventType, setFilterEventType] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEventRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [cpSceneDialogOpen, setCpSceneDialogOpen] = useState(false);
  const [cpSceneForDialog, setCpSceneForDialog] = useState<CpScene | null>(null);
  const [cpSceneDialogCpId, setCpSceneDialogCpId] = useState("");
  const [cpSceneDialogRunId, setCpSceneDialogRunId] = useState("");

  const [formData, setFormData] = useState({
    day_number: 1,
    start_time: "09:00",
    duration_minutes: 15,
    event_type: "programovy_blok" as EventType,
    title: "",
    description: "",
    location: "",
    cp_id: "",
    cp_scene_id: "",
    createSceneForEvent: false,
    material_id: "",
    document_id: "",
    cp_schedule_color: "",
    performer_text: "",
  });
  const [prefillSource, setPrefillSource] = useState("");

  /** Jména performerů/hráčů z minulých běhů téhož LARPu – pro výběr v harmonogramu */
  const [pastRunPeopleNames, setPastRunPeopleNames] = useState<string[]>([]);

  // Portál harmonogramu (token + heslo pro read-only zobrazení)
  const [schedulePortalAccess, setSchedulePortalAccess] = useState<{ id: string; token: string } | null>(null);
  const [schedulePortalLoading, setSchedulePortalLoading] = useState(false);
  const [schedulePortalPasswordDialogOpen, setSchedulePortalPasswordDialogOpen] = useState(false);
  const [schedulePortalPassword, setSchedulePortalPassword] = useState("");
  const [schedulePortalNewPasswordDialogOpen, setSchedulePortalNewPasswordDialogOpen] = useState(false);
  const [schedulePortalNewPassword, setSchedulePortalNewPassword] = useState("");
  const [schedulePortalSaving, setSchedulePortalSaving] = useState(false);

  const fetchEvents = async () => {
    if (!selectedRunId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("schedule_events")
      .select("*, persons!schedule_events_cp_id_fkey(access_token, name, performer, schedule_color), cp_scenes!schedule_events_cp_scene_id_fkey(title)")
      .eq("run_id", selectedRunId)
      .order("day_number", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) {
      toast.error("Chyba při načítání harmonogramu", { description: error.message });
      setEvents([]);
    } else {
      setEvents((data as ScheduleEventRow[]) ?? []);
    }
    setLoading(false);
  };

  const fetchCps = async () => {
    if (!currentLarpId) return;
    const { data } = await supabase
      .from("persons")
      .select("id, name, performer, schedule_color")
      .eq("larp_id", currentLarpId)
      .eq("type", "cp")
      .order("name");
    setCps(data || []);
  };

  /** larp_id pro načítání materiálů/dokumentů: aktuální LARP nebo LARP vybraného běhu (na stránce Harmonogram) */
  const larpIdForSchedule = currentLarpId ?? (runs.find((r) => r.id === selectedRunId)?.larp_id ?? null);

  const fetchScheduleMaterials = async () => {
    if (!larpIdForSchedule) return;
    const { data } = await supabase
      .from("production_materials")
      .select("id, title, material_type")
      .eq("larp_id", larpIdForSchedule)
      .order("sort_order", { ascending: true })
      .order("title");
    setScheduleMaterials((data as ScheduleMaterial[]) ?? []);
  };

  const fetchScheduleProductionDocs = async () => {
    if (!larpIdForSchedule) return;
    const { data } = await supabase
      .from("documents")
      .select("id, title")
      .eq("larp_id", larpIdForSchedule)
      .eq("doc_type", "produkční")
      .order("sort_order", { ascending: true })
      .order("title");
    setScheduleProductionDocs((data as ScheduleProductionDoc[]) ?? []);
  };

  const fetchCpScenesForRun = async () => {
    if (!selectedRunId) return;
    const { data } = await supabase
      .from("cp_scenes")
      .select("id, cp_id, title, description, location, start_time, duration_minutes, day_number, persons!cp_scenes_cp_id_fkey(name)")
      .eq("run_id", selectedRunId)
      .order("day_number", { ascending: true })
      .order("start_time", { ascending: true });
    setScheduleCpScenes((data as ScheduleCpScene[]) ?? []);
  };

  const fetchSchedulePortalAccess = async () => {
    if (!selectedRunId) return;
    setSchedulePortalLoading(true);
    const { data, error } = await supabase
      .from("schedule_portal_access")
      .select("id, token")
      .eq("run_id", selectedRunId)
      .maybeSingle();
    if (error) setSchedulePortalAccess(null);
    else setSchedulePortalAccess(data ? { id: data.id, token: data.token } : null);
    setSchedulePortalLoading(false);
  };

  /** Běh: person_id (cp_id) -> player_name („Hraje:“ z Přiřadit CP) pro boxy v gridu */
  const [runPerformerByCpId, setRunPerformerByCpId] = useState<Record<string, string>>({});
  const fetchRunPerformerByCpId = async () => {
    if (!selectedRunId) {
      setRunPerformerByCpId({});
      return;
    }
    const { data } = await supabase
      .from("run_person_assignments")
      .select("person_id, player_name")
      .eq("run_id", selectedRunId);
    const map: Record<string, string> = {};
    (data || []).forEach((row: { person_id: string; player_name: string | null }) => {
      if (row.player_name?.trim()) map[row.person_id] = row.player_name.trim();
    });
    setRunPerformerByCpId(map);
  };

  useEffect(() => {
    if (selectedRunId) {
      fetchEvents();
      fetchCpScenesForRun();
      fetchSchedulePortalAccess();
      fetchRunPerformerByCpId();
    } else {
      setScheduleCpScenes([]);
      setSchedulePortalAccess(null);
      setRunPerformerByCpId({});
    }
  }, [selectedRunId]);

  useEffect(() => {
    if (currentLarpId) {
      fetchCps();
    }
  }, [currentLarpId]);

  useEffect(() => {
    if (larpIdForSchedule) {
      fetchScheduleMaterials();
      fetchScheduleProductionDocs();
    } else {
      setScheduleMaterials([]);
      setScheduleProductionDocs([]);
    }
  }, [larpIdForSchedule]);

  /** Načte jména z minulých běhů téhož LARPu (pro výběr performera v harmonogramu) */
  useEffect(() => {
    if (!larpIdForSchedule || !runs.length) {
      setPastRunPeopleNames([]);
      return;
    }
    const runIds = runs.filter((r) => r.larp_id === larpIdForSchedule).map((r) => r.id);
    if (runIds.length === 0) {
      setPastRunPeopleNames([]);
      return;
    }
    supabase
      .from("run_person_assignments")
      .select("player_name")
      .in("run_id", runIds)
      .then(({ data }) => {
        const names = [...new Set((data || []).map((r: { player_name: string | null }) => r.player_name?.trim()).filter(Boolean) as string[])].sort();
        setPastRunPeopleNames(names);
      });
  }, [larpIdForSchedule, runs]);

  const uniqueDays = useMemo(() => {
    const days = [...new Set(events.map((e) => e.day_number))].sort((a, b) => a - b);
    return days.length ? days : [1];
  }, [events]);

  const maxDay = useMemo(() => Math.max(...uniqueDays, 1), [uniqueDays]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          (e.persons?.name?.toLowerCase().includes(q) ?? false) ||
          (e.performer_text?.toLowerCase().includes(q) ?? false) ||
          ((e.persons as any)?.performer?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterDay !== "all") list = list.filter((e) => e.day_number === filterDay);
    if (filterEventType !== "all") list = list.filter((e) => e.event_type === filterEventType);
    return list;
  }, [events, searchTerm, filterDay, filterEventType]);

  /** CP scény, které ještě nejsou zařazeny v harmonogramu – pro seznam předvyplnění */
  const cpScenesNotInSchedule = useMemo(() => {
    const usedSceneIds = new Set(events.map((e) => e.cp_scene_id).filter(Boolean));
    return scheduleCpScenes.filter((s) => !usedSceneIds.has(s.id));
  }, [scheduleCpScenes, events]);

  /** Materiály, které ještě nejsou v harmonogramu tohoto běhu – pro předvyplnění a výběr */
  const materialsNotInSchedule = useMemo(() => {
    const usedMaterialIds = new Set(
      events
        .map((e) => (e as ScheduleEventRow & { material_id?: string }).material_id)
        .filter(Boolean)
    );
    return scheduleMaterials.filter((m) => !usedMaterialIds.has(m.id));
  }, [scheduleMaterials, events]);

  /** Materiály k výběru v dialogu: nezařazené, při editaci povolit materiál aktuální události */
  const materialsForSelect = useMemo(() => {
    const usedMaterialIds = new Set(
      events
        .map((e) => (e as ScheduleEventRow & { material_id?: string }).material_id)
        .filter(Boolean)
    );
    const currentMaterialId = selectedEvent
      ? (selectedEvent as ScheduleEventRow & { material_id?: string }).material_id
      : null;
    return scheduleMaterials.filter(
      (m) => !usedMaterialIds.has(m.id) || m.id === currentMaterialId
    );
  }, [scheduleMaterials, events, selectedEvent]);

  /** Události seskupené po dni a čase – scény se stejným časem vedle sebe */
  const eventsByDayAndTime = useMemo(() => {
    const map: Record<number, Record<string, ScheduleEventRow[]>> = {};
    for (const e of filteredEvents) {
      const day = e.day_number;
      const time = e.start_time;
      if (!map[day]) map[day] = {};
      if (!map[day][time]) map[day][time] = [];
      map[day][time].push(e);
    }
    return map;
  }, [filteredEvents]);

  const sortedTimesByDay = useMemo(() => {
    const out: Record<number, string[]> = {};
    Object.keys(eventsByDayAndTime).forEach((dayStr) => {
      const day = Number(dayStr);
      out[day] = Object.keys(eventsByDayAndTime[day]).sort();
    });
    return out;
  }, [eventsByDayAndTime]);

  /** Grid: časový rozsah (15 min sloty) a labely */
  const gridTimeRange = useMemo(() => {
    if (filteredEvents.length === 0) {
      return { minStartMinutes: 8 * 60, maxEndMinutes: 22 * 60, slotLabels: [] as string[], totalSlots: 0 };
    }
    const starts = filteredEvents.map((e) => timeToMinutes(e.start_time));
    const ends = filteredEvents.map((e) => timeToMinutes(e.start_time) + e.duration_minutes);
    const minStartMinutes = Math.floor(Math.min(...starts) / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
    const maxEndMinutes = Math.ceil(Math.max(...ends) / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
    const totalSlots = (maxEndMinutes - minStartMinutes) / MINUTES_PER_SLOT;
    const slotLabels: string[] = [];
    for (let m = minStartMinutes; m < maxEndMinutes; m += MINUTES_PER_SLOT) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slotLabels.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
    return { minStartMinutes, maxEndMinutes, slotLabels, totalSlots };
  }, [filteredEvents]);

  /** Grid: události po dnech s lane indexy */
  const eventsByDayWithLanes = useMemo(() => {
    const days = [...new Set(filteredEvents.map((e) => e.day_number))].sort((a, b) => a - b);
    const out: Record<number, { events: EventWithLane[]; maxLanes: number }> = {};
    for (const day of days) {
      const inDay = filteredEvents.filter((e) => e.day_number === day);
      const withLanes = assignLanes(inDay);
      const maxLanes = Math.max(1, ...withLanes.map((e) => e.laneIndex + 1));
      out[day] = { events: withLanes, maxLanes };
    }
    return out;
  }, [filteredEvents]);

  /** Pořadí scény (1-based) uvnitř dané CP – každá CP má své Scéna 1, 2, 3… */
  const cpSceneIdToOrder = useMemo(() => {
    const byCpId: Record<string, typeof scheduleCpScenes> = {};
    for (const s of scheduleCpScenes) {
      if (!byCpId[s.cp_id]) byCpId[s.cp_id] = [];
      byCpId[s.cp_id].push(s);
    }
    const map: Record<string, number> = {};
    for (const scenes of Object.values(byCpId)) {
      const sorted = [...scenes].sort(
        (a, b) => a.day_number - b.day_number || timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      );
      sorted.forEach((s, i) => {
        map[s.id] = i + 1;
      });
    }
    return map;
  }, [scheduleCpScenes]);

  useEffect(() => {
    if (!isLiveRunning) return;
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [isLiveRunning]);

  const isBlockCurrent = (dayNumber: number, startTime: string, durationMinutes: number) => {
    if (!isLiveRunning || dayNumber !== liveDayNumber) return false;
    const [h, m] = startTime.split(":").map(Number);
    const start = new Date(currentTime);
    start.setHours(h, m ?? 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return currentTime >= start && currentTime < end;
  };

  const openCreateDialog = () => {
    setSelectedEvent(null);
    setPrefillSource("");
    setFormData({
      day_number: 1,
      start_time: "09:00",
      duration_minutes: 15,
      event_type: "programovy_blok",
      title: "",
      description: "",
      location: "",
      cp_id: "",
      cp_scene_id: "",
      createSceneForEvent: false,
      material_id: "",
      document_id: "",
      cp_schedule_color: "",
      performer_text: "",
    });
    setDialogOpen(true);
  };

  const applyPrefill = (value: string) => {
    if (!value || value === "__manual__") {
      setPrefillSource(value || "__manual__");
      return;
    }
    setPrefillSource(value);
    // CP scény: předvyplnění z cp_scenes (ne z materiálů ani dokumentů)
    if (value.startsWith("cpscene-")) {
      const id = value.replace("cpscene-", "");
      const scene = scheduleCpScenes.find((s) => s.id === id);
      if (scene) {
        const startTime = scene.start_time.length >= 5 ? scene.start_time.substring(0, 5) : scene.start_time;
        setFormData({
          event_type: "vystoupeni_cp",
          material_id: "",
          document_id: "",
          day_number: scene.day_number,
          start_time: startTime,
          duration_minutes: scene.duration_minutes,
          title: scene.title || "",
          description: scene.description || "",
          location: scene.location || "",
          cp_id: scene.cp_id,
          cp_scene_id: scene.id,
          createSceneForEvent: false,
          cp_schedule_color: "",
          performer_text: "",
        });
      }
      return;
    }
    if (value.startsWith("material-")) {
      const id = value.replace("material-", "");
      const mat = scheduleMaterials.find((m) => m.id === id);
      if (mat) {
        setFormData((prev) => ({
          ...prev,
          event_type: "material",
          material_id: mat.id,
          title: mat.title,
          cp_id: "",
          cp_scene_id: "",
          createSceneForEvent: false,
          document_id: "",
          performer_text: "",
        }));
      }
    } else if (value.startsWith("doc-")) {
      const id = value.replace("doc-", "");
      const doc = scheduleProductionDocs.find((d) => d.id === id);
      if (doc) {
        setFormData((prev) => ({
          ...prev,
          event_type: "organizacni",
          document_id: doc.id,
          title: doc.title,
          cp_id: "",
          cp_scene_id: "",
          material_id: "",
          performer_text: "",
        }));
      }
    }
  };

  const openCpSceneEdit = async (event: ScheduleEventRow) => {
    if (!event.cp_scene_id || !event.cp_id || !selectedRunId) return;
    const { data, error } = await supabase
      .from("cp_scenes")
      .select("*")
      .eq("id", event.cp_scene_id)
      .single();
    if (error || !data) {
      toast.error("Nepodařilo se načíst scénu CP");
      return;
    }
    setCpSceneForDialog(data as CpScene);
    setCpSceneDialogCpId(event.cp_id);
    setCpSceneDialogRunId(selectedRunId);
    setCpSceneDialogOpen(true);
  };

  const openEditDialog = (event: ScheduleEventRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setPrefillSource("");
    const cp = cps.find((c) => c.id === event.cp_id);
    setFormData({
      day_number: event.day_number,
      start_time: event.start_time.length >= 5 ? event.start_time.substring(0, 5) : event.start_time,
      duration_minutes: event.duration_minutes,
      event_type: event.event_type,
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      cp_id: event.cp_id || "",
      cp_scene_id: event.cp_scene_id || "",
      createSceneForEvent: !!event.cp_scene_id,
      material_id: (event as ScheduleEventRow & { material_id?: string }).material_id || "",
      document_id: (event as ScheduleEventRow & { document_id?: string }).document_id || "",
      cp_schedule_color: cp?.schedule_color || "",
      performer_text: (event as ScheduleEventRow).performer_text ?? "",
    });
    setDialogOpen(true);
  };

  const normalizeTime = (t: string) => (t.length >= 8 ? t : t.length === 5 ? `${t}:00` : t);

  const handleSave = async () => {
    if (!formData.title.trim() || !selectedRunId) {
      toast.error("Vyplňte název události");
      return;
    }

    setSaving(true);

    const startTime = normalizeTime(formData.start_time);
    const payload = {
      run_id: selectedRunId,
      day_number: formData.day_number,
      start_time: startTime,
      duration_minutes: formData.duration_minutes,
      event_type: formData.event_type,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      location: formData.location.trim() || null,
      cp_id: formData.cp_id || null,
      cp_scene_id: formData.cp_scene_id?.trim() || null,
      material_id: formData.event_type === "material" && formData.material_id ? formData.material_id : null,
      document_id: formData.event_type === "organizacni" && formData.document_id ? formData.document_id : null,
      performer_text: formData.performer_text?.trim() || null,
    };

    if (selectedEvent) {
      const { error } = await supabase
        .from("schedule_events")
        .update(payload)
        .eq("id", selectedEvent.id);

      if (error) {
        if (error.code === "23505") {
          toast.error(
            "Scéna nebo materiál už je v harmonogramu. Každou scénu a každý materiál lze přiřadit jen jednou."
          );
        } else {
          toast.error("Chyba při ukládání", { description: error.message });
        }
        setSaving(false);
        return;
      }

      // Pokud je událost propojená se scénou CP, synchronizuj jen čas a lokaci (ne popis scény)
      if (selectedEvent.cp_scene_id) {
        const startTime = normalizeTime(formData.start_time);
        await supabase
          .from("cp_scenes")
          .update({
            day_number: formData.day_number,
            start_time: startTime,
            duration_minutes: formData.duration_minutes,
            location: formData.location?.trim() || null,
          })
          .eq("id", selectedEvent.cp_scene_id);
      }

      if (
        formData.event_type === "vystoupeni_cp" &&
        formData.createSceneForEvent &&
        formData.cp_id &&
        !selectedEvent.cp_scene_id
      ) {
        const { data: sceneData, error: sceneError } = await supabase
          .from("cp_scenes")
          .insert({
            cp_id: formData.cp_id,
            run_id: selectedRunId,
            day_number: formData.day_number,
            start_time: startTime,
            duration_minutes: formData.duration_minutes,
            location: formData.location.trim() || null,
            description: formData.description.trim() || null,
          })
          .select("id")
          .single();

        if (!sceneError && sceneData) {
          await supabase
            .from("schedule_events")
            .update({ cp_scene_id: sceneData.id })
            .eq("id", selectedEvent.id);
        }
      }

      if (formData.event_type === "vystoupeni_cp" && formData.cp_id) {
        await supabase
          .from("persons")
          .update({ schedule_color: formData.cp_schedule_color || null })
          .eq("id", formData.cp_id);
      }
      toast.success("Událost upravena");
    } else {
      const { data: insertedEvent, error } = await supabase
        .from("schedule_events")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error(
            "Scéna nebo materiál už je v harmonogramu. Každou scénu a každý materiál lze přiřadit jen jednou."
          );
        } else {
          toast.error("Chyba při vytváření", { description: error.message });
        }
        setSaving(false);
        return;
      }

      if (
        formData.event_type === "vystoupeni_cp" &&
        formData.createSceneForEvent &&
        formData.cp_id &&
        insertedEvent
      ) {
        const { data: sceneData, error: sceneError } = await supabase
          .from("cp_scenes")
          .insert({
            cp_id: formData.cp_id,
            run_id: selectedRunId,
            day_number: formData.day_number,
            start_time: startTime,
            duration_minutes: formData.duration_minutes,
            location: formData.location.trim() || null,
            description: formData.description.trim() || null,
            schedule_event_id: insertedEvent.id,
          })
          .select("id")
          .single();

        if (!sceneError && sceneData) {
          await supabase
            .from("schedule_events")
            .update({ cp_scene_id: sceneData.id })
            .eq("id", insertedEvent.id);
        }
      }
      if (formData.event_type === "vystoupeni_cp" && formData.cp_id && formData.cp_schedule_color) {
        await supabase
          .from("persons")
          .update({ schedule_color: formData.cp_schedule_color })
          .eq("id", formData.cp_id);
      }

      toast.success("Událost vytvořena");
      setFilterDay("all");
      setFilterEventType("all");
    }

    setSaving(false);
    setDialogOpen(false);
    await fetchEvents();
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", selectedEvent.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Událost odebrána z harmonogramu");
    setDeleteDialogOpen(false);
    await fetchEvents();
  };

  // Generate day options (1 to maxDay + 1 for new days)
  const dayOptions = Array.from({ length: maxDay + 1 }, (_, i) => i + 1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id || !selectedRunId) return;
      const list = filteredEvents;
      const oldIndex = list.findIndex((ev) => ev.id === active.id);
      const newIndex = list.findIndex((ev) => ev.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(list, oldIndex, newIndex);

      const daysOrder: number[] = [];
      for (const ev of newOrder) {
        if (!daysOrder.includes(ev.day_number)) daysOrder.push(ev.day_number);
      }
      const updates: { id: string; day_number: number; start_time: string; cp_scene_id: string | null }[] = [];
      for (const dayNum of daysOrder) {
        const inDay = newOrder.filter((ev) => ev.day_number === dayNum);
        let runningTime = "08:00:00";
        for (const ev of inDay) {
          updates.push({
            id: ev.id,
            day_number: ev.day_number,
            start_time: runningTime,
            cp_scene_id: ev.cp_scene_id,
          });
          runningTime = addMinutesToTime(runningTime, ev.duration_minutes);
        }
      }

      for (const u of updates) {
        const ev = list.find((e) => e.id === u.id);
        if (!ev || (ev.start_time === u.start_time && ev.day_number === u.day_number)) continue;
        const { error } = await supabase
          .from("schedule_events")
          .update({ day_number: u.day_number, start_time: u.start_time })
          .eq("id", u.id);
        if (error) {
          toast.error("Chyba při ukládání pořadí");
          fetchEvents();
          return;
        }
        if (u.cp_scene_id) {
          await supabase
            .from("cp_scenes")
            .update({ day_number: u.day_number, start_time: u.start_time })
            .eq("id", u.cp_scene_id);
        }
      }
      toast.success("Pořadí a časy upraveny");
      fetchEvents();
    },
    [filteredEvents, selectedRunId]
  );

  /** Grid DnD: drop na slot = změna start_time a day_number; sync cp_scenes */
  const handleGridDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || !selectedRunId) return;
      const overId = String(over.id);
      if (!overId.startsWith("grid-slot-")) return;
      const parts = overId.replace("grid-slot-", "").split("-");
      const dayNum = Number(parts[0]);
      const slotIndex = Number(parts[1]);
      if (Number.isNaN(dayNum) || Number.isNaN(slotIndex)) return;
      const ev = events.find((x) => x.id === active.id);
      if (!ev) return;
      const newStartMinutes = gridTimeRange.minStartMinutes + slotIndex * MINUTES_PER_SLOT;
      const newStartTime = minutesToTimeString(newStartMinutes);
      if (ev.day_number === dayNum && ev.start_time === newStartTime) return;

      const { error } = await supabase
        .from("schedule_events")
        .update({ day_number: dayNum, start_time: newStartTime })
        .eq("id", ev.id);
      if (error) {
        toast.error("Chyba při přesunu", { description: error.message });
        fetchEvents();
        return;
      }
      if (ev.cp_scene_id) {
        await supabase
          .from("cp_scenes")
          .update({ day_number: dayNum, start_time: newStartTime })
          .eq("id", ev.cp_scene_id);
      }
      toast.success("Čas a den události upraveny");
      fetchEvents();
    },
    [events, selectedRunId, gridTimeRange.minStartMinutes]
  );

  const schedulePortalUrl = schedulePortalAccess?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/harmonogram-portal/${schedulePortalAccess.token}`
    : "";

  const copySchedulePortalUrl = () => {
    if (!schedulePortalUrl) return;
    navigator.clipboard.writeText(schedulePortalUrl);
    toast.success("Odkaz zkopírován");
  };

  const handleCreateSchedulePortalAccess = async () => {
    if (!selectedRunId || !schedulePortalPassword.trim()) {
      toast.error("Zadejte heslo");
      return;
    }
    setSchedulePortalSaving(true);
    const { data, error } = await supabase.rpc("create_schedule_portal_access", {
      p_run_id: selectedRunId,
      p_password: schedulePortalPassword.trim(),
    });
    setSchedulePortalSaving(false);
    setSchedulePortalPasswordDialogOpen(false);
    setSchedulePortalPassword("");
    if (error) {
      toast.error("Chyba při vytváření přístupu", { description: error.message });
      return;
    }
    toast.success("Přístup vytvořen");
    fetchSchedulePortalAccess();
  };

  const handleSetSchedulePortalPassword = async () => {
    if (!schedulePortalAccess?.id || !schedulePortalNewPassword.trim()) {
      toast.error("Zadejte nové heslo");
      return;
    }
    setSchedulePortalSaving(true);
    const { data, error } = await supabase.rpc("set_schedule_portal_password", {
      p_access_id: schedulePortalAccess.id,
      p_new_password: schedulePortalNewPassword.trim(),
    });
    setSchedulePortalSaving(false);
    setSchedulePortalNewPasswordDialogOpen(false);
    setSchedulePortalNewPassword("");
    if (error || data === false) {
      toast.error("Chyba při změně hesla");
      return;
    }
    toast.success("Heslo změněno");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Harmonogram</h1>
            <p className="text-muted-foreground">Časový plán běhu</p>
          </div>
          <div className="flex items-center gap-2">
            {!isLiveRunning ? (
              <>
                <Label className="text-sm">Den:</Label>
                <Select
                  value={String(liveDayNumber)}
                  onValueChange={(v) => setLiveDayNumber(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueDays.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Den {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="btn-vintage"
                  onClick={() => setIsLiveRunning(true)}
                  disabled={!selectedRunId || loading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Spustit běh
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsLiveRunning(false)}
              >
                <Square className="h-4 w-4 mr-2" />
                Zastavit
              </Button>
            )}
          </div>
        </div>

        {selectedRunId && (
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Hledat v harmonogramu…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs input-vintage"
            />
            <Select value={filterDay === "all" ? "all" : String(filterDay)} onValueChange={(v) => setFilterDay(v === "all" ? "all" : Number(v))}>
              <SelectTrigger className="w-32 input-vintage">
                <SelectValue placeholder="Den" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny dny</SelectItem>
                {uniqueDays.map((d) => (
                  <SelectItem key={d} value={String(d)}>Den {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEventType} onValueChange={setFilterEventType}>
              <SelectTrigger className="w-40 input-vintage">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                className={`px-3 py-1.5 text-sm ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}
                onClick={() => setViewMode("grid")}
              >
                Grid
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}
                onClick={() => setViewMode("list")}
              >
                Seznam
              </button>
            </div>
            <Button onClick={openCreateDialog} className="btn-vintage ml-auto">
              <Plus className="mr-2 h-4 w-4" />
              Přidat událost
            </Button>
          </div>
        )}

        {runs.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nejprve vytvořte LARP a běh.</p>
            </PaperCardContent>
          </PaperCard>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Tento běh zatím nemá žádné události v harmonogramu.</p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Přidat první událost
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : viewMode === "grid" ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGridDragEnd}>
            <div className="space-y-6">
              {(Object.keys(eventsByDayWithLanes).map(Number).sort((a, b) => a - b)).map((dayNum) => {
                const dayData = eventsByDayWithLanes[dayNum];
                if (!dayData) return null;
                const { events: dayEvents, maxLanes } = dayData;
                const colHeight = gridTimeRange.totalSlots * SLOT_HEIGHT_PX;
                return (
                  <PaperCard key={dayNum}>
                    <PaperCardContent className="py-4">
                      <h2 className="font-typewriter text-xl mb-3 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Den {dayNum}
                        {isLiveRunning && liveDayNumber === dayNum && (
                          <span className="text-sm font-normal text-muted-foreground">
                            (aktuální čas: {currentTime.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})
                          </span>
                        )}
                      </h2>
                      <div className="flex gap-4 overflow-x-auto min-w-0">
                        <div className="shrink-0 w-14 flex flex-col text-xs text-muted-foreground font-mono">
                          {gridTimeRange.slotLabels.map((label, i) => (
                            <div key={label} style={{ height: SLOT_HEIGHT_PX }} className="leading-none pt-0.5">
                              {label}
                            </div>
                          ))}
                        </div>
                        <div
                          className="flex-1 relative min-h-[200px] shrink-0"
                          style={{ height: colHeight, minWidth: maxLanes * SCHEDULE_BOX_MIN_PX }}
                        >
                          {/* Sloty pro drop – sloupec pod boxy */}
                          <div className="absolute inset-0 flex flex-col pointer-events-none [&>*]:pointer-events-auto">
                            {gridTimeRange.slotLabels.map((_, slotIndex) => (
                              <GridSlotDroppable
                                key={`${dayNum}-${slotIndex}`}
                                dayNum={dayNum}
                                slotIndex={slotIndex}
                                heightPx={SLOT_HEIGHT_PX}
                              />
                            ))}
                          </div>
                          {/* Události nad sloty */}
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="relative w-full h-full pointer-events-auto">
                              {dayEvents.map((ev) => {
                                const startMinutes = timeToMinutes(ev.start_time);
                                const topPx = ((startMinutes - gridTimeRange.minStartMinutes) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;
                                const heightPx = (ev.duration_minutes / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;
                                const leftPct = (ev.laneIndex / maxLanes) * 100;
                                const widthPct = 100 / maxLanes;
                                const isCurrent =
                                  isLiveRunning &&
                                  liveDayNumber === dayNum &&
                                  isBlockCurrent(dayNum, ev.start_time, ev.duration_minutes);
                                return (
                                  <ScheduleEventBox
                                    key={ev.id}
                                    event={ev}
                                    sceneOrder={ev.cp_scene_id ? cpSceneIdToOrder[ev.cp_scene_id] : undefined}
                                    runPerformerByCpId={runPerformerByCpId}
                                    topPx={topPx}
                                    heightPx={heightPx}
                                    leftPct={leftPct}
                                    widthPct={widthPct}
                                    isCurrent={isCurrent}
                                    onEdit={() => openEditDialog(ev, {} as React.MouseEvent)}
                                    onDelete={(e) => {
                                      e.stopPropagation();
                                      setSelectedEvent(ev);
                                      setDeleteDialogOpen(true);
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          {isLiveRunning && liveDayNumber === dayNum && (
                            <div
                              className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
                              style={{
                                top: (() => {
                                  const now = currentTime;
                                  const minToday = now.getHours() * 60 + now.getMinutes();
                                  const slotTop = ((minToday - gridTimeRange.minStartMinutes) / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;
                                  return Math.max(0, Math.min(colHeight - 2, slotTop));
                                })(),
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </PaperCardContent>
                  </PaperCard>
                );
              })}
            </div>
          </DndContext>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredEvents.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {uniqueDays.map((dayNum) => (
                  <div key={dayNum}>
                    <h2 className="font-typewriter text-xl mb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Den {dayNum}
                      {isLiveRunning && liveDayNumber === dayNum && (
                        <span className="text-sm font-normal text-muted-foreground">
                          (aktuální čas: {currentTime.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})
                        </span>
                      )}
                    </h2>
                    <div className="space-y-2">
                      {(sortedTimesByDay[dayNum] ?? []).map((time) => {
                        const blockEvents = eventsByDayAndTime[dayNum]?.[time] ?? [];
                        const first = blockEvents[0];
                        const isCurrent =
                          first &&
                          isLiveRunning &&
                          liveDayNumber === dayNum &&
                          isBlockCurrent(dayNum, time, first.duration_minutes);
                        return (
                          <div
                            key={`${dayNum}-${time}`}
                            className={`flex flex-wrap gap-2 items-stretch ${isCurrent ? "ring-2 ring-primary ring-offset-2 rounded-md" : ""}`}
                          >
                            {blockEvents.map((ev) => (
                              <div key={ev.id} className="flex-1 min-w-[280px] max-w-full">
                                <SortableScheduleRow
                                  event={ev}
                                  isCurrent={isCurrent}
                                  onEdit={(e) => openEditDialog(ev, e)}
                                  onDelete={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(ev);
                                    setDeleteDialogOpen(true);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {selectedRunId && (
          <PaperCard>
            <PaperCardContent className="py-4">
              <h2 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Přístup k portálu harmonogramu
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                Read-only odkaz pro zobrazení harmonogramu tohoto běhu (bez přístupu do adminu). Přístup chrání heslo.
              </p>
              {schedulePortalLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : schedulePortalAccess ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input readOnly value={schedulePortalUrl} className="font-mono text-sm max-w-md" />
                    <Button variant="outline" size="sm" onClick={copySchedulePortalUrl}>
                      <Copy className="h-4 w-4 mr-1" />
                      Zkopírovat
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSchedulePortalNewPasswordDialogOpen(true)}>
                      Změnit heslo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Sdílejte odkaz a heslo jen s důvěryhodnými osobami.</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Zatím není vytvořen přístup. Nastavte heslo a vytvořte odkaz.</p>
                  <Button variant="outline" size="sm" onClick={() => setSchedulePortalPasswordDialogOpen(true)}>
                    Vytvořit přístup
                  </Button>
                </div>
              )}
            </PaperCardContent>
          </PaperCard>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedEvent?.event_type === "vystoupeni_cp" && selectedEvent?.cp_scene_id
                ? "Upravit čas a lokaci (CP vstup)"
                : selectedEvent
                  ? "Upravit událost"
                  : "Nová událost"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto max-h-[70vh] pr-1">
            {!selectedEvent && (
              <div className="space-y-2">
                <Label>Předvyplnit z existujícího</Label>
                <Select value={prefillSource || "__manual__"} onValueChange={applyPrefill}>
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="— Ručně (prázdný formulář) —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">
                      — Ručně (prázdný formulář) —
                    </SelectItem>
                    {cpScenesNotInSchedule.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>CP scény</SelectLabel>
                        {cpScenesNotInSchedule.map((s, index) => (
                          <SelectItem key={s.id} value={`cpscene-${s.id}`}>
                            {s.title?.trim() || `Scéna ${index + 1}`} ({(s.persons as { name?: string })?.name ?? "CP"})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {materialsNotInSchedule.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Materiály produkce</SelectLabel>
                        {materialsNotInSchedule.map((m) => (
                          <SelectItem key={m.id} value={`material-${m.id}`}>
                            {m.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {scheduleProductionDocs.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Produkční dokumenty</SelectLabel>
                        {scheduleProductionDocs.map((d) => (
                          <SelectItem key={d.id} value={`doc-${d.id}`}>
                            {d.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Výběr CP scény, materiálu nebo dokumentu předvyplní typ a název (u scény i čas a lokaci).
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Název události"
                className="input-vintage"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Den</Label>
                <Select
                  value={String(formData.day_number)}
                  onValueChange={(v) => setFormData({ ...formData, day_number: Number(v) })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Den {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Čas začátku (24h)</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="input-vintage"
                  placeholder="14:30"
                />
              </div>

              <div className="space-y-2">
                <Label>Délka (min)</Label>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  className="input-vintage"
                />
              </div>
            </div>

            {!(selectedEvent?.event_type === "vystoupeni_cp" && selectedEvent?.cp_scene_id) &&
              (!prefillSource || prefillSource === "__manual__") && (
              <div className="space-y-2">
                <Label>Typ události</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(v) => setFormData({ ...formData, event_type: v as EventType })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!(selectedEvent?.event_type === "vystoupeni_cp" && selectedEvent?.cp_scene_id) &&
              (!prefillSource || prefillSource === "__manual__") && (
              <div className="space-y-2">
                <Label>Popis</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Volitelný popis"
                  rows={2}
                  className="input-vintage"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Lokace</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Místo konání"
                className="input-vintage"
              />
            </div>

            {formData.event_type === "vystoupeni_cp" && (
              <div className="space-y-2">
                <Label>PERFORMER</Label>
                <Select
                  value={formData.cp_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, cp_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Vyberte CP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Žádný --</SelectItem>
                    {cps.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.performer?.trim() || cp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!(selectedEvent?.event_type === "vystoupeni_cp" && selectedEvent?.cp_scene_id) && formData.cp_id && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="createSceneForEvent"
                        checked={formData.createSceneForEvent}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, createSceneForEvent: checked === true })
                        }
                      />
                      <Label htmlFor="createSceneForEvent" className="cursor-pointer text-sm">
                        Vytvořit scénu CP a propojit s harmonogramem
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Barva v harmonogramu (tlumená)</Label>
                      <Select
                        value={formData.cp_schedule_color || "__default__"}
                        onValueChange={(v) => setFormData({ ...formData, cp_schedule_color: v === "__default__" ? "" : v })}
                      >
                        <SelectTrigger className="input-vintage">
                          <SelectValue placeholder="Výchozí" />
                        </SelectTrigger>
                        <SelectContent>
                          {CP_SCHEDULE_COLORS.map((opt) => (
                            <SelectItem key={opt.value || "__default__"} value={opt.value || "__default__"}>
                              <span className="flex items-center gap-2">
                                {opt.value && (
                                  <span
                                    className="inline-block w-4 h-4 rounded border border-border"
                                    style={{ backgroundColor: opt.value }}
                                  />
                                )}
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {pastRunPeopleNames.length > 0 && (
                      <div className="space-y-2">
                        <Label>Vybrat z minulých běhů</Label>
                        <Select
                          value=""
                          onValueChange={(v) => {
                            if (v) setFormData({ ...formData, performer_text: v });
                          }}
                        >
                          <SelectTrigger className="input-vintage">
                            <SelectValue placeholder="— Vybrat jméno z předchozích běhů —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Ručně vyplnit —</SelectItem>
                            {pastRunPeopleNames.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="performer_text">Performer v harmonogramu (jednorázová role)</Label>
                      <Input
                        id="performer_text"
                        value={formData.performer_text ?? ""}
                        onChange={(e) => setFormData({ ...formData, performer_text: e.target.value })}
                        placeholder="Volný text – jen zobrazí se v boxu, nezakládá performera"
                        className="input-vintage"
                      />
                      <p className="text-xs text-muted-foreground">
                        Pro jednorázové role (pošťák, strážce…). Vyplníte jméno – zobrazí se v harmonogramu, entita performera se nevytváří.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {formData.event_type === "material" && (
              <div className="space-y-2">
                <Label>Materiál (produkce)</Label>
                <Select
                  value={formData.material_id || "__none__"}
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      setFormData({ ...formData, material_id: "" });
                      return;
                    }
                    const mat = scheduleMaterials.find((m) => m.id === v);
                    setFormData({
                      ...formData,
                      material_id: v,
                      title: mat ? mat.title : formData.title,
                    });
                  }}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Vyberte materiál" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Žádný --</SelectItem>
                    {materialsForSelect.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.event_type === "organizacni" && (
              <div className="space-y-2">
                <Label>Produkční dokument (volitelné)</Label>
                <Select
                  value={formData.document_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, document_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Žádný dokument" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Žádný --</SelectItem>
                    {scheduleProductionDocs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-vintage">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Odebrat z harmonogramu?</AlertDialogTitle>
            <AlertDialogDescription>
              Událost <strong>{selectedEvent?.title}</strong> bude odebrána z harmonogramu (zmizí z rozvrhu). Scéna CP ani jiná data se nemažou – můžete ji znovu zařadit přes „Předvyplnit z existujícího“.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Odebrat z harmonogramu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Vytvořit přístup k portálu harmonogramu (heslo) */}
      <Dialog open={schedulePortalPasswordDialogOpen} onOpenChange={setSchedulePortalPasswordDialogOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Vytvořit přístup k portálu harmonogramu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Nastavte heslo pro odkaz na read-only harmonogram tohoto běhu.</p>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Heslo</Label>
              <Input
                type="password"
                value={schedulePortalPassword}
                onChange={(e) => setSchedulePortalPassword(e.target.value)}
                placeholder="Zadejte heslo"
                className="input-vintage"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulePortalPasswordDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleCreateSchedulePortalAccess} disabled={schedulePortalSaving || !schedulePortalPassword.trim()} className="btn-vintage">
              {schedulePortalSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Vytvořit přístup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Změnit heslo portálu harmonogramu */}
      <Dialog open={schedulePortalNewPasswordDialogOpen} onOpenChange={setSchedulePortalNewPasswordDialogOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Změnit heslo portálu harmonogramu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nové heslo</Label>
              <Input
                type="password"
                value={schedulePortalNewPassword}
                onChange={(e) => setSchedulePortalNewPassword(e.target.value)}
                placeholder="Zadejte nové heslo"
                className="input-vintage"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulePortalNewPasswordDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSetSchedulePortalPassword} disabled={schedulePortalSaving || !schedulePortalNewPassword.trim()} className="btn-vintage">
              {schedulePortalSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Změnit heslo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cpSceneDialogOpen && cpSceneDialogCpId && cpSceneDialogRunId && (
        <CpSceneDialog
          open={cpSceneDialogOpen}
          onOpenChange={(open) => {
            setCpSceneDialogOpen(open);
            if (!open) setCpSceneForDialog(null);
          }}
          scene={cpSceneForDialog}
          cpId={cpSceneDialogCpId}
          runId={cpSceneDialogRunId}
          runDays={maxDay}
          onSave={() => {
            fetchEvents();
            fetchCpScenesForRun();
            setCpSceneDialogOpen(false);
            setCpSceneForDialog(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
