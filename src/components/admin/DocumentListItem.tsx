import { Pencil, Trash2, EyeOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocBadge } from "@/components/ui/doc-badge";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface DocumentListItemProps {
  doc: Document;
  persons: Person[];
  runs: Run[];
  hiddenFromPersons: string[]; // List of person names hidden from
  showDocType?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const PRIORITY_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "outline" }> = {
  1: { label: "Prioritní", variant: "default" },
  2: { label: "Normální", variant: "secondary" },
  3: { label: "Volitelné", variant: "outline" },
};

export function DocumentListItem({
  doc,
  persons,
  runs,
  hiddenFromPersons,
  showDocType = true,
  onEdit,
  onDelete,
}: DocumentListItemProps) {
  const getTargetLabel = () => {
    if (doc.target_type === "vsichni") return "Všichni";
    if (doc.target_type === "skupina") return doc.target_group || "Skupina";
    if (doc.target_type === "osoba") {
      const person = persons.find((p) => p.id === doc.target_person_id);
      return person?.name || "Osoba";
    }
    return "";
  };

  const getRunLabel = () => {
    if (!doc.run_id) return "Všechny běhy";
    const run = runs.find((r) => r.id === doc.run_id);
    return run?.name || "Běh";
  };

  const priorityInfo = PRIORITY_LABELS[doc.priority] || PRIORITY_LABELS[2];

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-r-md border border-l-0 border-border bg-muted/20 hover:bg-muted/40 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        {/* Title */}
        <span className="font-medium truncate">{doc.title}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Hidden indicator with tooltip */}
        {hiddenFromPersons.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center text-muted-foreground cursor-help">
                  <EyeOff className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Skryto před:</p>
                <ul className="text-sm">
                  {hiddenFromPersons.map((name, i) => (
                    <li key={i}>• {name}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Delayed visibility indicator */}
        {doc.visibility_mode === "delayed" && doc.visible_days_before && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 cursor-help">
                  <Clock className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zobrazí se {doc.visible_days_before} dní před začátkem běhu</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Target type badge - only if not "vsichni" */}
        {doc.target_type !== "vsichni" && (
          <span className="text-xs text-muted-foreground">
            {getTargetLabel()}
          </span>
        )}

        {/* Doc type badge */}
        {showDocType && <DocBadge type={doc.doc_type} />}

        {/* Priority badge - only if not normal */}
        {doc.priority === 1 && (
          <Badge variant="default" className="text-xs">
            Prioritní
          </Badge>
        )}
        {doc.priority === 3 && (
          <Badge variant="outline" className="text-xs">
            Volitelné
          </Badge>
        )}

        {/* Actions - visible on hover */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
