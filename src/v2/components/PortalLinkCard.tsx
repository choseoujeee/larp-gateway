import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface PortalLinkCardProps {
  label: string;
  url: string;
  hint?: string;
}

export function PortalLinkCard({ label, url, hint }: PortalLinkCardProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Odkaz zkopírován");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopírování selhalo");
    }
  }

  return (
    <div className="rounded border border-border bg-muted/30 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={copy} className="h-7 px-2">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <a href={url} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost" className="h-7 px-2"><ExternalLink className="h-3.5 w-3.5" /></Button>
          </a>
        </div>
      </div>
      <code className="block break-all text-xs text-foreground/80">{url}</code>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
