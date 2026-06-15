import { useEffect, useRef, useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  placeholder?: string;
  emptyText?: string;
  onSave: (next: string) => Promise<void>;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  type?: "text" | "password";
  ariaLabel?: string;
}

/**
 * Inline-editable single-line text field. Click to edit, Enter to save, Esc to cancel.
 */
export function InlineEditField({
  value,
  placeholder,
  emptyText = "—",
  onSave,
  className,
  displayClassName,
  inputClassName,
  type = "text",
  ariaLabel,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);

  async function commit() {
    if ((value ?? "") === draft) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn("h-8", inputClassName)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void commit(); }
            else if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
          }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={saving} onClick={commit} aria-label="Uložit">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={saving} onClick={() => { setDraft(value ?? ""); setEditing(false); }} aria-label="Zrušit">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <span className={cn("group inline-flex items-center gap-1.5 rounded px-1 py-0.5", className)}>
      <span className={cn(value ? "" : "text-muted-foreground italic", displayClassName)}>
        {type === "password" && value ? "••••••••" : (value || emptyText)}
      </span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-60 hover:opacity-100"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel ? `Upravit: ${ariaLabel}` : "Upravit"}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </span>
  );
}
