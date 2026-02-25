import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generatePdf, buildDocumentsHtml, buildScenesHtml } from "@/lib/pdf-export";

export interface PdfSection {
  key: string;
  label: string;
  count: number;
  buildHtml: () => string;
}

interface PdfDownloadMenuProps {
  sections: PdfSection[];
  filename: string;
  title?: string;
}

export function PdfDownloadMenu({ sections, filename, title }: PdfDownloadMenuProps) {
  const availableSections = sections.filter((s) => s.count > 0);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(availableSections.map((s) => s.key))
  );
  const [open, setOpen] = useState(false);

  if (availableSections.length === 0) return null;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownload = () => {
    const parts = availableSections
      .filter((s) => selected.has(s.key))
      .map((s) => s.buildHtml());
    if (parts.length === 0) return;
    generatePdf(parts.join("\n"), filename, title);
    setOpen(false);
  };

  // If only one section, just download directly
  if (availableSections.length === 1) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const html = availableSections[0].buildHtml();
          generatePdf(html, filename, title);
        }}
      >
        <Download className="h-4 w-4 mr-2" />
        Stáhnout PDF
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Stáhnout PDF
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-50" align="center">
        <p className="text-sm font-medium mb-2">Vyberte sekce k exportu:</p>
        <div className="space-y-2 mb-3">
          {availableSections.map((section) => (
            <label
              key={section.key}
              className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1.5 py-1"
            >
              <Checkbox
                checked={selected.has(section.key)}
                onCheckedChange={() => toggle(section.key)}
              />
              <span className="flex-1">{section.label}</span>
              <span className="text-muted-foreground text-xs">({section.count})</span>
            </label>
          ))}
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={selected.size === 0}
          onClick={handleDownload}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Stáhnout výběr
        </Button>
      </PopoverContent>
    </Popover>
  );
}
