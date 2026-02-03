import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocBadge } from "@/components/ui/doc-badge";
import { DOCUMENT_TYPES } from "@/lib/constants";

export interface ProductionDocItem {
  id: string;
  title: string;
  doc_type: string;
  sort_order: number;
}

interface SortableProductionDocItemProps {
  doc: ProductionDocItem;
  onEdit: () => void;
  onDelete?: () => void;
}

export function SortableProductionDocItem({ doc, onEdit, onDelete }: SortableProductionDocItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

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
      <button
        type="button"
        className="flex-1 min-w-0 flex items-center justify-between gap-3 py-2 px-3 rounded-r-md border border-l-0 border-border bg-muted/20 hover:bg-muted/40 transition-colors group text-left"
        onClick={onEdit}
      >
        <span className="font-medium truncate">{doc.title}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DocBadge type={doc.doc_type as keyof typeof DOCUMENT_TYPES} />
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Smazat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </button>
    </div>
  );
}
