import { Pencil, Trash2, EyeOff } from "lucide-react";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
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
    <PaperCard>
      <PaperCardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h4 className="font-typewriter text-base">{doc.title}</h4>
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Target type badge */}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {getTargetLabel()}
              </span>

              {/* Doc type badge */}
              {showDocType && <DocBadge type={doc.doc_type} />}

              {/* Priority badge */}
              <Badge variant={priorityInfo.variant} className="text-xs">
                {priorityInfo.label}
              </Badge>

              {/* Sort order */}
              <span className="text-xs text-muted-foreground font-mono">
                #{doc.sort_order}
              </span>

              {/* Run badge */}
              <span className="text-xs bg-accent/50 text-accent-foreground px-2 py-0.5 rounded">
                {getRunLabel()}
              </span>

              {/* Hidden indicator with tooltip */}
              {hiddenFromPersons.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center text-muted-foreground cursor-help">
                        <EyeOff className="h-4 w-4" />
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 ml-4 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PaperCardContent>
    </PaperCard>
  );
}
