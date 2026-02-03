import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { DocumentListItem } from "./DocumentListItem";
import { DOCUMENT_TYPES } from "@/lib/constants";

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
  target_type: "vsichni" | "skupina" | "osoba";
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number;
  visibility_mode: string;
  visible_days_before: number | null;
  visible_to_cp?: boolean;
}

interface SortableDocumentItemProps {
  doc: Document;
  persons: Person[];
  runs: Run[];
  hiddenFromPersons: string[];
  hiddenFromGroups?: string[];
  showDocType?: boolean;
  /** Když true: celá řádka otevře edit, bez tlačítek tužka/popelnice (DocumentListItem clickableRow) */
  clickableRow?: boolean;
  /** Když true: grip vlevo je jen vizuální, nelze táhnout (např. společné dokumenty na CpDetailPage) */
  disableDrag?: boolean;
  /** Na /admin/dokumenty: název s doplněním „ - Jan Kubiš“, tag jen „Konkrétnímu hráči“ */
  titleWithTarget?: boolean;
  onEdit: () => void;
  onDelete?: () => void;
}

export function SortableDocumentItem({
  doc,
  persons,
  runs,
  hiddenFromPersons,
  hiddenFromGroups,
  showDocType = true,
  clickableRow = false,
  disableDrag = false,
  titleWithTarget = false,
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
      {/* Drag handle – při disableDrag jen vizuální (bez listeners) */}
      {disableDrag ? (
        <div className="flex-shrink-0 flex items-center justify-center w-8 cursor-default text-muted-foreground rounded-l-md border border-r-0 border-border bg-muted/20">
          <GripVertical className="h-4 w-4" />
        </div>
      ) : (
        <button
          type="button"
          className="flex-shrink-0 flex items-center justify-center w-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l-md border border-r-0 border-border bg-muted/20 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      
      {/* Document content */}
      <div className="flex-1 min-w-0">
        <DocumentListItem
          doc={doc}
          persons={persons}
          runs={runs}
          hiddenFromPersons={hiddenFromPersons}
          hiddenFromGroups={hiddenFromGroups}
          showDocType={showDocType}
          clickableRow={clickableRow}
          titleWithTarget={titleWithTarget}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
