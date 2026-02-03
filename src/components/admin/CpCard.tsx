import { Clock, User, FileText, Theater, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CpCardProps {
  name: string;
  slug: string;
  performerName?: string | null;
  /** Časy ze scén (Den 1 14:00, Den 2 10:00) – preferované */
  sceneTimesSummary?: string | null;
  /** Zastaralé – zobrazí se jen když chybí sceneTimesSummary */
  performanceTimes?: string | null;
  scenesCount?: number;
  documentsCount?: number;
  /** CP má časovou kolizi (performer má překrývající scény) */
  hasConflict?: boolean;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  className?: string;
}

export function CpCard({
  name,
  slug,
  performerName,
  sceneTimesSummary,
  performanceTimes,
  scenesCount = 0,
  documentsCount = 0,
  hasConflict = false,
  onClick,
  onEdit,
  onDelete,
  className,
}: CpCardProps) {
  const getLegacyTimesSummary = (times: string | null | undefined) => {
    if (!times) return null;
    const timeMatches = times.match(/\d{1,2}:\d{2}/g);
    if (timeMatches && timeMatches.length > 0) {
      if (timeMatches.length <= 3) return timeMatches.join(", ");
      return `${timeMatches.slice(0, 2).join(", ")}... (${timeMatches.length} vstupů)`;
    }
    return times.length > 40 ? times.substring(0, 37) + "..." : times;
  };

  const timesSummary = sceneTimesSummary ?? getLegacyTimesSummary(performanceTimes);

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Header with name and actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="font-typewriter text-lg leading-tight truncate">{name}</h4>
          {hasConflict && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-shrink-0 text-amber-500" aria-label="Časová kolize">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tento performer má časovou kolizi (překrývající scény)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Times */}
      {timesSummary && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{timesSummary}</span>
        </p>
      )}

      {/* Performer */}
      {performerName && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <User className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{performerName}</span>
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {documentsCount} dok
        </span>
        <span className="flex items-center gap-1">
          <Theater className="h-3 w-3" />
          {scenesCount} scén
        </span>
      </div>
    </div>
  );
}
