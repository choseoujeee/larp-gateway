import { cn } from "@/lib/utils";
import { DOCUMENT_TYPES } from "@/lib/constants";

type DocType = keyof typeof DOCUMENT_TYPES;

interface DocBadgeProps {
  type: DocType;
  className?: string;
}

export function DocBadge({ type, className }: DocBadgeProps) {
  const docInfo = DOCUMENT_TYPES[type];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono uppercase tracking-wider",
        `doc-badge-${type}`,
        className
      )}
    >
      {docInfo.label}
    </span>
  );
}
