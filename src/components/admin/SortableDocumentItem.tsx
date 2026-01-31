import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { DocumentListItem } from "./DocumentListItem";
import { DOCUMENT_TYPES, TARGET_TYPES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  group_name: string | null;
  type: string;
}

interface Run {
  id: string;
  name: string;
}

interface Document {
  id: string;
  larp_id: string;
  run_id: string | null;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: keyof typeof TARGET_TYPES;
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number;
  visibility_mode: string;
  visible_days_before: number | null;
}

interface SortableDocumentItemProps {
  doc: Document;
  persons: Person[];
  runs: Run[];
  hiddenFromPersons: string[];
  showDocType?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableDocumentItem({
  doc,
  persons,
  runs,
  hiddenFromPersons,
  showDocType = true,
  onEdit,
  onDelete,
}: SortableDocumentItemProps) {
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
      {/* Drag handle */}
      <button
        type="button"
        className="flex-shrink-0 flex items-center justify-center w-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l-md border border-r-0 border-border bg-muted/20 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      {/* Document content */}
      <div className="flex-1 min-w-0">
        <DocumentListItem
          doc={doc}
          persons={persons}
          runs={runs}
          hiddenFromPersons={hiddenFromPersons}
          showDocType={showDocType}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
