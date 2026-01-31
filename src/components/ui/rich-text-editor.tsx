import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

/**
 * WYSIWYG editor pro tělo dokumentu. Výstup HTML; ukládá se do DB a při zobrazení sanitizuje (DOMPurify).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Napište obsah dokumentu…",
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const updateContent = useCallback(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    updateContent();
  }, [updateContent]);

  if (!editor) {
    return (
      <div
        className={cn("rounded-md border border-input bg-background", className)}
        style={{ minHeight }}
      >
        <div className="animate-pulse p-3 text-sm text-muted-foreground">
          Načítání editoru…
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      style={{ minHeight }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
