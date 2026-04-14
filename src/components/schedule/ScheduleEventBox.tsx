import { forwardRef, useState, useCallback, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { User, Package, FileText, MapPin, Drama, Pencil, Trash2, UtensilsCrossed, Bus, Info, Clapperboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EVENT_TYPE_LABELS, SCHEDULE_BOX_MIN_PX } from "./scheduleConstants";
import { eventBoxStyle, stripHtml } from "./scheduleUtils";
import type { ScheduleEventRow, PortalScheduleEvent } from "./scheduleTypes";

// ─── Icon by event type ────────────────────────────────────────────
function EventTypeIcon({ type, className = "h-3 w-3 shrink-0" }: { type: string; className?: string }) {
  switch (type) {
    case "vystoupeni_cp": return <User className={className} />;
    case "material": return <Package className={className} />;
    case "organizacni": return <Clapperboard className={className} />;
    case "jidlo": return <UtensilsCrossed className={className} />;
    case "presun": return <Bus className={className} />;
    case "informace": return <Info className={className} />;
    default: return <FileText className={className} />;
  }
}

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
  ({ event: ev, sceneOrder, runPerformerByCpId, topPx, heightPx, leftPct, widthPct, isCurrent, onEdit, onDelete, onEditScene }, _ref) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
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
    const compact = heightPx < 48;
    const descriptionText = ev.description ? stripHtml(ev.description) : null;

    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        setNodeRef(node);
        if (typeof _ref === "function") _ref(node);
        else if (_ref) (_ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [setNodeRef, _ref]
    );

    const boxH = Math.max(heightPx, SCHEDULE_BOX_MIN_PX);

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            ref={mergedRef}
            {...listeners}
            {...attributes}
            className={`absolute group cursor-grab active:cursor-grabbing ${className} ${isCurrent ? "ring-2 ring-primary ring-inset" : ""} ${isDragging ? "opacity-50 z-30" : "hover:shadow-md hover:brightness-[0.97]"}`}
            style={{
              top: topPx,
              height: boxH,
              left: `${leftPct}%`,
              width: `calc(${widthPct}% - 4px)`,
              minWidth: SCHEDULE_BOX_MIN_PX - 4,
              minHeight: SCHEDULE_BOX_MIN_PX,
              marginLeft: 2,
              marginRight: 2,
              ...style,
            }}
            title={[ev.title, typeLabel, cpName ?? undefined].filter(Boolean).join(" · ")}
          >
            <div className="p-1.5 flex flex-col min-w-0 h-full overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <EventTypeIcon type={ev.event_type} className="h-3 w-3 shrink-0 opacity-60" />
                <span className={`font-medium truncate ${compact ? "text-[10px]" : "text-xs"}`}>
                  {ev.event_type === "vystoupeni_cp" ? (cpName || typeLabel) : (ev.event_type === "material" ? ev.title : sceneTitle)}
                </span>
              </div>
              {!compact && (
                <span className="text-[10px] text-muted-foreground truncate">
                  {ev.event_type === "vystoupeni_cp" ? sceneTitle : typeLabel}
                </span>
              )}
              {!compact && descriptionText && (
                <span className="text-[9px] text-muted-foreground/70 truncate mt-0.5">{descriptionText}</span>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-80 p-0 rounded-xl shadow-xl border"
          onPointerDownOutside={() => setPopoverOpen(false)}
        >
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <EventTypeIcon type={ev.event_type} className="h-4 w-4 shrink-0 opacity-70" />
                <span className="font-semibold text-sm">{typeLabel}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={() => setPopoverOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="text-sm font-medium">{ev.event_type === "vystoupeni_cp" ? sceneTitle : ev.title}</div>

            {cpName && (
              <div className="flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span>{cpName}</span>
              </div>
            )}
            {ev.location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{ev.location}</span>
              </div>
            )}
            {performerLabel && (
              <div className="flex items-center gap-1.5 text-sm">
                <Drama className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span>{performerLabel}</span>
              </div>
            )}
            {ev.description && (
              <div
                className="text-xs text-muted-foreground prose prose-sm max-w-none [&>*]:m-0 [&>*]:text-xs"
                dangerouslySetInnerHTML={{ __html: ev.description }}
              />
            )}
            <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
              <Button variant="secondary" size="sm" className="h-7 px-3 text-xs rounded-full" onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); onEdit(); }}>
                <Pencil className="h-3 w-3 mr-1" />
                Upravit
              </Button>
              {onEditScene && ev.cp_scene_id && (
                <Button variant="secondary" size="sm" className="h-7 px-3 text-xs rounded-full" onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); onEditScene(); }}>
                  <Drama className="h-3 w-3 mr-1" />
                  Scéna
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 px-3 text-xs rounded-full text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); onDelete(e); }}>
                <Trash2 className="h-3 w-3 mr-1" />
                Odebrat
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
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

export function ReadOnlyScheduleEventBox({ event: ev, topPx, heightPx, leftPct, widthPct, isCurrent }: ReadOnlyEventBoxProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { className, style } = eventBoxStyle(ev as any);
  const typeLabel = EVENT_TYPE_LABELS[ev.event_type] || ev.event_type;
  const cpName = ev.cp_id ? (ev.persons?.name ?? null) : null;
  const location = ev.location ?? null;
  const performerLabel = ev.performer_text?.trim() || null;
  const compact = heightPx < 48;
  const descriptionText = ev.description ? stripHtml(ev.description) : null;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className={`absolute cursor-pointer select-none ${className} ${isCurrent ? "ring-2 ring-primary ring-inset" : ""} hover:shadow-md hover:brightness-[0.97]`}
          style={{
            top: topPx,
            height: heightPx,
            minHeight: SCHEDULE_BOX_MIN_PX,
            left: `${leftPct}%`,
            width: `calc(${widthPct}% - 4px)`,
            marginLeft: 2,
            marginRight: 2,
            zIndex: 1,
            ...style,
          }}
          title={[ev.title, typeLabel, cpName ?? location].filter(Boolean).join(" · ")}
        >
          <div className="p-1.5 flex flex-col min-w-0 h-full overflow-hidden gap-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <EventTypeIcon type={ev.event_type} className="h-3 w-3 shrink-0 opacity-60" />
              <span className={`font-semibold truncate flex-1 ${compact ? "text-[10px]" : "text-xs"}`}>{ev.title}</span>
            </div>
            {!compact && cpName && (
              <span className="text-[10px] text-muted-foreground truncate">{cpName}</span>
            )}
            {!compact && !cpName && location && (
              <span className="text-[10px] text-muted-foreground truncate">{location}</span>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-72 p-0 rounded-xl shadow-xl border"
        onPointerDownOutside={() => setPopoverOpen(false)}
      >
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <EventTypeIcon type={ev.event_type} className="h-4 w-4 shrink-0 opacity-70" />
            <span className="font-semibold text-sm">{ev.title}</span>
          </div>
          <span className="text-xs text-muted-foreground">{typeLabel}</span>
          {cpName && (
            <div className="flex items-center gap-1.5 text-sm">
              <User className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span>{cpName}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{location}</span>
            </div>
          )}
          {performerLabel && (
            <div className="flex items-center gap-1.5 text-sm">
              <Drama className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span>{performerLabel}</span>
            </div>
          )}
          {ev.description && (
            <div
              className="text-xs text-muted-foreground prose prose-sm max-w-none [&>*]:m-0 [&>*]:text-xs"
              dangerouslySetInnerHTML={{ __html: ev.description }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
