import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  value: string | null;
  onSave: (next: string | null) => Promise<void>;
  emptyText?: string;
  minHeight?: string;
}

/**
 * Inline-editable rich text (medailonek). Click to edit, explicit Save/Cancel.
 */
export function InlineEditRich({ value, onSave, emptyText = "Klikni pro přidání textu", minHeight = "200px" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  async function commit() {
    setSaving(true);
    try {
      await onSave(draft.trim() ? draft : null);
      setEditing(false);
    } finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <RichTextEditor value={draft} onChange={setDraft} minHeight={minHeight} />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setDraft(value ?? ""); setEditing(false); }} disabled={saving}>
            <X className="mr-1 h-4 w-4" />Zrušit
          </Button>
          <Button size="sm" onClick={commit} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Uložit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {value?.trim() ? (
        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
      ) : (
        <div className="text-sm italic text-muted-foreground">{emptyText}</div>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-2 h-7 px-2 text-xs text-muted-foreground"
        onClick={() => { setDraft(value ?? ""); setEditing(true); }}
        aria-label="Upravit medailonek"
      >
        <Pencil className="mr-1 h-3 w-3" />Upravit
      </Button>
    </div>
  );
}
