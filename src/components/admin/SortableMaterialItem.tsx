import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, ExternalLink, FileText, Music, Video, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MaterialType = "doc" | "audio" | "video" | "other";

export interface ProductionMaterialItem {
  id: string;
  larp_id: string;
  run_id: string | null;
  material_type: MaterialType;
  title: string;
  url: string | null;
  note: string | null;
  sort_order: number;
}

function materialTypeIcon(type: MaterialType) {
  switch (type) {
    case "doc": return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    case "audio": return <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    case "video": return <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    default: return <FileQuestion className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

interface SortableMaterialItemProps {
  item: ProductionMaterialItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableMaterialItem({ item, onEdit, onDelete }: SortableMaterialItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-stretch">
      <button
        type="button"
        className="flex-shrink-0 flex items-center justify-center w-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l-md border border-r-0 border-border bg-muted/20 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between gap-3 py-2 px-3 min-w-0 flex-1 rounded-r-md border border-l-0 border-border bg-muted/20 hover:bg-muted/40 transition-colors group">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {materialTypeIcon(item.material_type)}
          <div className="min-w-0 flex-1">
            <span className="font-medium truncate block">{item.title}</span>
            {item.note && (
              <span className="text-xs text-muted-foreground truncate block">{item.note}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(item.url!, "_blank", "noopener,noreferrer")}
              title="Otevřít odkaz"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Upravit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Smazat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
