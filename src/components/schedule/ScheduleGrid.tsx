import { useMemo } from "react";
import { Clock } from "lucide-react";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { MINUTES_PER_SLOT, PX_PER_MINUTE, SLOT_HEIGHT_PX } from "./scheduleConstants";
import type { GridTimeRange } from "./scheduleTypes";
import { timeToMinutes } from "@/lib/scheduleGridUtils";

interface ScheduleGridDayProps {
  dayNum: number;
  colHeight: number;
  gridTimeRange: GridTimeRange;
  maxLanes: number;
  isLiveRunning: boolean;
  liveDayNumber: number;
  currentTime: Date;
  /** Optional: render droppable slots (admin only) */
  renderSlots?: (dayNum: number) => React.ReactNode;
  /** Render event boxes */
  renderEvents: () => React.ReactNode;
}

export function ScheduleGridDay({
  dayNum,
  colHeight,
  gridTimeRange,
  maxLanes,
  isLiveRunning,
  liveDayNumber,
  currentTime,
  renderSlots,
  renderEvents,
}: ScheduleGridDayProps) {
  return (
    <PaperCard>
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
          {/* Time labels */}
          <div
            className="shrink-0 w-14 flex flex-col text-xs text-muted-foreground font-mono relative"
            style={{ height: colHeight }}
          >
            {gridTimeRange.slotLabels.map((label, i) => {
              const minutes = gridTimeRange.minStartMinutes + i * MINUTES_PER_SLOT;
              const isFullOrHalf = minutes % 30 === 0;
              return (
                <div
                  key={label}
                  style={{ height: SLOT_HEIGHT_PX, position: "absolute", top: i * SLOT_HEIGHT_PX }}
                  className="leading-none"
                >
                  {isFullOrHalf && <span className="text-[11px]">{label}</span>}
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div
            className="flex-1 relative min-h-[200px] shrink-0"
            style={{ height: colHeight, minWidth: maxLanes * 80 }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {gridTimeRange.slotLabels.map((_, i) => {
                const minutes = gridTimeRange.minStartMinutes + i * MINUTES_PER_SLOT;
                const isFull = minutes % 60 === 0;
                const isHalf = minutes % 30 === 0;
                if (!isHalf) return null;
                return (
                  <div
                    key={i}
                    className={`absolute left-0 right-0 ${isFull ? "border-t border-border/60" : "border-t border-border/30"}`}
                    style={{ top: i * SLOT_HEIGHT_PX }}
                  />
                );
              })}
            </div>

            {/* Droppable slots (admin only) */}
            {renderSlots && (
              <div className="absolute inset-0 flex flex-col pointer-events-none [&>*]:pointer-events-auto">
                {renderSlots(dayNum)}
              </div>
            )}

            {/* Event boxes */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full pointer-events-auto">
                {renderEvents()}
              </div>
            </div>

            {/* Current time indicator */}
            {isLiveRunning && liveDayNumber === dayNum && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                style={{
                  top: (() => {
                    const minToday = currentTime.getHours() * 60 + currentTime.getMinutes();
                    const px = (minToday - gridTimeRange.minStartMinutes) * PX_PER_MINUTE;
                    return Math.max(0, Math.min(colHeight - 2, px));
                  })(),
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1 animate-pulse shadow-sm shadow-destructive/50" />
                <div className="flex-1 h-0.5 bg-destructive" />
              </div>
            )}
          </div>
        </div>
      </PaperCardContent>
    </PaperCard>
  );
}

/** Compute grid time range from events */
export function computeGridTimeRange(
  events: { start_time: string; duration_minutes: number }[]
): GridTimeRange {
  if (events.length === 0) {
    return { minStartMinutes: 8 * 60, maxEndMinutes: 22 * 60, slotLabels: [], totalSlots: 0 };
  }
  const starts = events.map((e) => timeToMinutes(e.start_time));
  const ends = events.map((e) => timeToMinutes(e.start_time) + e.duration_minutes);
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
}
