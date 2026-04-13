import { forwardRef, useState, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { User, Package, FileText, MapPin, Drama, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABELS, SCHEDULE_BOX_MIN_PX } from "./scheduleConstants";
import { eventBoxStyle } from "./scheduleUtils";
import type { ScheduleEventRow, PortalScheduleEvent } from "./scheduleTypes";

// ─── Admin (draggable) event box ───────────────────────────────────

interface AdminEventBoxProps {
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
  onEditScene?: () => void;
}

export const AdminScheduleEventBox = forwardRef<HTMLDivElement, AdminEventBoxProps>(
  (
    {
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
      onEditScene,
    },
    _ref
  ) => {
    const [expanded, setExpanded] = useState(false);
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ev.id });
    const { className, style } = eventBoxStyle(ev);
    const typeLabel = EVENT_TYPE_LABELS[ev.event_type] || ev.event_type;
    const persons = ev.persons as { name?: string; performer?: string } | null;
    const cpName = ev.cp_id ? (persons?.name?.trim() || null) : null;
    const performerLabel = ev.cp_id
      ? (ev.performer_text?.trim() || runPerformerByCpId?.[ev.cp_id] || persons?.performer?.trim() || null)
      : null;
    const sceneTitleRaw = ev.cp_scenes?.title?.trim();
    const sceneTitle = sceneTitleRaw || (ev.cp_scene_id && sceneOrder != null ? `Scéna ${sceneOrder}` : null) || ev.title || "—";
    const compact = heightPx < 50;

    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        setNodeRef(node);
        if (typeof _ref === "function") _ref(node);
        else if (_ref) (_ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [setNodeRef, _ref]
    );

    const handleClick = (e: React.MouseEvent) => {
      if (isDragging) return;
      e.stopPropagation();
      setExpanded(!expanded);
    };

    return (
      <div
        ref={mergedRef}
        {...listeners}
        {...attributes}
        className={`absolute group cursor-grab active:cursor-grabbing ${className} ${isCurrent ? "ring-2 ring-primary ring-inset" : ""} ${isDragging ? "opacity-50 z-30" : ""} ${expanded ? "z-20 shadow-lg" : "hover:shadow-md hover:brightness-95"}`}
        style={{
          top: topPx,
          height: expanded ? "auto" : Math.max(heightPx, SCHEDULE_BOX_MIN_PX),
          minHeight: SCHEDULE_BOX_MIN_PX,
          left: expanded ? 0 : `${leftPct}%`,
          width: expanded ? `calc(100% - 4px)` : `calc(${widthPct}% - 4px)`,
          minWidth: SCHEDULE_BOX_MIN_PX - 4,
          marginLeft: 2,
          marginRight: 2,
          transition: "left 0.2s ease, width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease",
          ...style,
        }}
        onClick={handleClick}
        title={expanded ? undefined : [ev.title, typeLabel, cpName ?? undefined].filter(Boolean).join(" · ")}
      >
        <div className="p-1.5 flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {ev.event_type === "vystoupeni_cp" && <User className="h-3 w-3 shrink-0 text-muted-foreground" />}
            {ev.event_type === "material" && <Package className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <span className={`font-medium truncate ${compact ? "text-[10px]" : "text-xs"}`}>
              {ev.event_type === "vystoupeni_cp" ? (cpName || typeLabel) : (ev.event_type === "material" ? ev.title : sceneTitle)}
            </span>
          </div>
          {!compact && !expanded && (
            <span className="text-[10px] text-muted-foreground truncate">
              {ev.event_type === "vystoupeni_cp" ? sceneTitle : typeLabel}
            </span>
          )}

          {expanded && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50 space-y-1 text-xs" onClick={(e) => e.stopPropagation()}>
              <div className="font-semibold text-foreground">{typeLabel}</div>
              {cpName && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>{cpName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span>{sceneTitle}</span>
              </div>
              {ev.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{ev.location}</span>
                </div>
              )}
              {performerLabel && (
                <div className="flex items-center gap-1.5">
                  <Drama className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>{performerLabel}</span>
                </div>
              )}
              {ev.description && (
                <p className="text-muted-foreground text-[11px] mt-1">{ev.description}</p>
              )}
              <div className="flex items-center gap-1 pt-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-3 w-3 mr-1" />
                  Upravit
                </Button>
                {onEditScene && ev.cp_scene_id && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); onEditScene(); }}>
                    <Drama className="h-3 w-3 mr-1" />
                    Scéna
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(e); }}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Odebrat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
AdminScheduleEventBox.displayName = "AdminScheduleEventBox";

// ─── Read-only (portal) event box ──────────────────────────────────

interface ReadOnlyEventBoxProps {
  event: PortalScheduleEvent;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
  isCurrent: boolean;
}

export function ReadOnlyScheduleEventBox({
  event: ev,
  topPx,
  heightPx,
  leftPct,
  widthPct,
  isCurrent,
}: ReadOnlyEventBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const { className, style } = eventBoxStyle(ev as any);
  const typeLabel = EVENT_TYPE_LABELS[ev.event_type] || ev.event_type;
  const cpName = ev.cp_id ? (ev.persons?.name ?? null) : null;
  const location = ev.location ?? null;
  const performerLabel = ev.performer_text?.trim() || null;
  const compact = heightPx < 48;

  return (
    <div
      className={`absolute cursor-pointer select-none ${className} ${isCurrent ? "ring-2 ring-primary ring-inset" : ""} ${expanded ? "shadow-lg" : "hover:shadow-md hover:brightness-95"}`}
      style={{
        top: topPx,
        height: expanded ? "auto" : heightPx,
        minHeight: heightPx,
        left: expanded ? 0 : `${leftPct}%`,
        width: expanded ? "calc(100% - 4px)" : `calc(${widthPct}% - 4px)`,
        marginLeft: 2,
        marginRight: 2,
        zIndex: expanded ? 30 : 1,
        transition: "left 0.2s ease, width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease",
        ...style,
      }}
      title={expanded ? undefined : [ev.title, typeLabel, cpName ?? location].filter(Boolean).join(" · ")}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="p-1.5 flex flex-col min-w-0 gap-0.5">
        <div className="flex items-start gap-1 min-w-0">
          <span className={`font-semibold truncate flex-1 ${compact ? "text-[10px]" : "text-xs"}`}>{ev.title}</span>
          {!compact && <span className="text-[10px] text-muted-foreground shrink-0 opacity-70">{typeLabel}</span>}
        </div>
        {!compact && cpName && (
          <span className="text-[10px] text-muted-foreground truncate">{cpName}</span>
        )}
        {!compact && !cpName && location && !expanded && (
          <span className="text-[10px] text-muted-foreground truncate">{location}</span>
        )}

        {expanded && (
          <div className="mt-1 pt-1 border-t border-border/40 flex flex-col gap-0.5">
            {location && <span className="text-xs text-muted-foreground">📍 {location}</span>}
            {performerLabel && <span className="text-xs text-muted-foreground">🎭 {performerLabel}</span>}
            {ev.description && <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{ev.description}</p>}
            <span className="text-[10px] text-muted-foreground/60 mt-1 self-end">Klikni pro sbalení</span>
          </div>
        )}
      </div>
    </div>
  );
}
