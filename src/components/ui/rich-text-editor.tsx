import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Code,
  Quote,
  Minus,
  IndentDecrease,
  IndentIncrease,
  ImageIcon,
  Loader2,
  Highlighter,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Custom FontSize extension
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

// Custom Indent extension
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

const Indent = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const marginLeft = element.style.marginLeft;
              if (marginLeft) {
                const match = marginLeft.match(/(\d+)/);
                return match ? Math.floor(parseInt(match[1]) / 24) : 0;
              }
              return 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent === 0) {
                return {};
              }
              return {
                style: `margin-left: ${attributes.indent * 24}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from, $to } = selection;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent < 10) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent + 1,
                });
              }
            }
          });

          if (dispatch) dispatch(tr);
          return true;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from, $to } = selection;

          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent > 0) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent - 1,
                });
              }
            }
          });

          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Optional folder path for image uploads (e.g., larp slug) */
  imageFolderPath?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("h-8 w-8 p-0", isActive && "bg-accent text-accent-foreground")}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

const FONT_SIZES = [
  { label: "Malé", value: "12px" },
  { label: "Normální", value: "14px" },
  { label: "Střední", value: "16px" },
  { label: "Velké", value: "18px" },
  { label: "Velmi velké", value: "24px" },
  { label: "Obrovské", value: "32px" },
];

const HIGHLIGHT_COLORS = [
  { label: "Žádné", value: "", color: "transparent" },
  { label: "Žlutá", value: "#fef08a", color: "#fef08a" },
  { label: "Zelená", value: "#bbf7d0", color: "#bbf7d0" },
  { label: "Modrá", value: "#bfdbfe", color: "#bfdbfe" },
  { label: "Červená", value: "#c4846c", color: "#c4846c" },
  { label: "Oranžová", value: "#fed7aa", color: "#fed7aa" },
  { label: "Fialová", value: "#ddd6fe", color: "#ddd6fe" },
];

/**
 * WYSIWYG editor pro tělo dokumentu. Výstup HTML; ukládá se do DB a při zobrazení sanitizuje (DOMPurify).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Napište obsah dokumentu…",
  className,
  minHeight = "200px",
  imageFolderPath = "general",
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      FontSize,
      Indent,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md",
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value || "",
  editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3:first-child]:mt-0 [&_blockquote]:my-4 [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:bg-muted/50 [&_blockquote]:border [&_blockquote]:border-border [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-primary [&_blockquote]:rounded [&_blockquote]:italic",
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

  const handleSetLink = () => {
    if (!editor) return;

    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkUrl("");
    setLinkPopoverOpen(false);
  };

  const openLinkPopover = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setLinkPopoverOpen(true);
  };

  const getCurrentFontSize = () => {
    if (!editor) return "";
    const attrs = editor.getAttributes("textStyle");
    return attrs.fontSize || "";
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Neplatný typ souboru",
        description: "Vyberte prosím obrázek (JPG, PNG, GIF, WebP).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Soubor je příliš velký",
        description: "Maximální velikost obrázku je 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${imageFolderPath}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("document-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("document-images")
        .getPublicUrl(data.path);

      // Insert image into editor
      editor.chain().focus().setImage({ src: urlData.publicUrl, alt: file.name }).run();

      toast({
        title: "Obrázek nahrán",
        description: "Obrázek byl úspěšně vložen do dokumentu.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Chyba při nahrávání",
        description: "Nepodařilo se nahrát obrázek. Zkuste to znovu.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!editor) {
    return (
      <div
        className={cn("rounded-md border border-input bg-background", className)}
        style={{ minHeight }}
      >
        <div className="animate-pulse p-3 text-sm text-muted-foreground">Načítání editoru…</div>
      </div>
    );
  }

  const currentHeadingLevel = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "paragraph";

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      style={{ minHeight }}
    >
      {/* Toolbar - sticky for scrolling within dialogs */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1 rounded-t-md">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Zpět (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Znovu (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Heading Select */}
        <Select
          value={currentHeadingLevel}
          onValueChange={(val) => {
            if (val === "paragraph") {
              editor.chain().focus().setParagraph().run();
            } else if (val === "h1") {
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            } else if (val === "h2") {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            } else if (val === "h3") {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">Odstavec</SelectItem>
            <SelectItem value="h1">Nadpis 1</SelectItem>
            <SelectItem value="h2">Nadpis 2</SelectItem>
            <SelectItem value="h3">Nadpis 3</SelectItem>
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select
          value={getCurrentFontSize()}
          onValueChange={(val) => {
            if (val === "default") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(val).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[90px] text-xs">
            <SelectValue placeholder="Velikost" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Výchozí</SelectItem>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToolbarDivider />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Tučné (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Kurzíva (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Podtržené (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Přeškrtnuté"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Zvýraznění"
              className={cn("h-8 w-8 p-0", editor.isActive("highlight") && "bg-accent text-accent-foreground")}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex flex-wrap gap-1 max-w-[140px]">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value || "none"}
                  type="button"
                  onClick={() => {
                    if (color.value) {
                      editor.chain().focus().toggleHighlight({ color: color.value }).run();
                    } else {
                      editor.chain().focus().unsetHighlight().run();
                    }
                  }}
                  title={color.label}
                  className={cn(
                    "w-6 h-6 rounded border border-border hover:scale-110 transition-transform",
                    !color.value && "bg-background relative after:content-[''] after:absolute after:inset-0 after:bg-[linear-gradient(135deg,transparent_45%,hsl(var(--destructive))_45%,hsl(var(--destructive))_55%,transparent_55%)]"
                  )}
                  style={{ backgroundColor: color.value || undefined }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarDivider />

        {/* Indent */}
        <ToolbarButton onClick={() => editor.chain().focus().outdent().run()} title="Zmenšit odsazení">
          <IndentDecrease className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().indent().run()} title="Zvětšit odsazení">
          <IndentIncrease className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Zarovnat vlevo"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Zarovnat na střed"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Zarovnat vpravo"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })}
          title="Zarovnat do bloku"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Odrážky"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Číslovaný seznam"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openLinkPopover}
              title="Vložit odkaz"
              className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-accent text-accent-foreground")}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL odkazu</label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSetLink();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSetLink}>
                  Uložit
                </Button>
                {editor.isActive("link") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setLinkPopoverOpen(false);
                    }}
                  >
                    Odebrat
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {editor.isActive("link") && (
          <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Odebrat odkaz">
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
        )}

        <ToolbarDivider />

        {/* Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingImage}
          title="Vložit obrázek"
        >
          {isUploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block Elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Citace"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Blok kódu"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Vodorovná čára">
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
