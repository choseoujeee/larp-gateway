import { Clock, User, FileText, Theater, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CpCardProps {
  name: string;
  slug: string;
  performerName?: string | null;
  performanceTimes?: string | null;
  scenesCount?: number;
  documentsCount?: number;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  className?: string;
}

export function CpCard({
  name,
  slug,
  performerName,
  performanceTimes,
  scenesCount = 0,
  documentsCount = 0,
  onClick,
  onEdit,
  onDelete,
  className,
}: CpCardProps) {
  // Parse performance times to show compact format
  const getTimesSummary = (times: string | null | undefined) => {
    if (!times) return null;
    // Try to extract times like "14:00, 16:30, 20:00"
    const timeMatches = times.match(/\d{1,2}:\d{2}/g);
    if (timeMatches && timeMatches.length > 0) {
      if (timeMatches.length <= 3) {
        return timeMatches.join(", ");
      }
      return `${timeMatches.slice(0, 2).join(", ")}... (${timeMatches.length} vstupů)`;
    }
    // If no times found, return truncated text
    return times.length > 40 ? times.substring(0, 37) + "..." : times;
  };

  const timesSummary = getTimesSummary(performanceTimes);

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
        <h4 className="font-typewriter text-lg leading-tight">{name}</h4>
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
        <span className="font-mono ml-auto">{slug}</span>
      </div>
    </div>
  );
}
