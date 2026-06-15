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
  /** Optional heading rendered above with an inline pencil edit button. */
  title?: string;
}

/**
 * Inline-editable rich text. Click pencil to edit, explicit Save/Cancel.
 */
export function InlineEditRich({ value, onSave, emptyText = "Klikni na tužku pro přidání textu", minHeight = "200px", title }: Props) {
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

  const heading = title ? (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {!editing && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-60 hover:opacity-100"
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          aria-label={`Upravit: ${title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  ) : null;

  if (editing) {
    return (
      <div className="space-y-2">
        {heading}
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
      {heading}
      {value?.trim() ? (
        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
      ) : (
        <div className="text-sm italic text-muted-foreground">{emptyText}</div>
      )}
      {!title && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-2 h-7 px-2 text-xs text-muted-foreground"
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          aria-label="Upravit"
        >
          <Pencil className="mr-1 h-3 w-3" />Upravit
        </Button>
      )}
    </div>
  );
}
