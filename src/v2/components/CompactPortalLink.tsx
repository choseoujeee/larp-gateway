import { useState } from "react";
import { Copy, Check, ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { randomPassword } from "../lib/slug";

interface Props {
  label: string;
  url: string;
  /** When provided, shows a "set password" button; called with new plaintext password. */
  onSetPassword?: (newPassword: string) => Promise<void>;
}

/**
 * Compact portal link: just label + copy / open / set-password buttons.
 */
export function CompactPortalLink({ label, url, onSetPassword }: Props) {
  const [copied, setCopied] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Odkaz zkopírován");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Kopírování selhalo"); }
  }

  async function savePw() {
    if (!pw.trim() || !onSetPassword) return;
    setSaving(true);
    try {
      await onSetPassword(pw.trim());
      toast.success("Heslo aktualizováno");
      setPwOpen(false);
      setPw("");
    } catch (e) {
      toast.error("Chyba: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded border border-border bg-muted/20 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copy} title="Kopírovat odkaz">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <a href={url} target="_blank" rel="noreferrer">
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Otevřít">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
          {onSetPassword && (
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Nastavit heslo" onClick={() => { setPw(randomPassword()); setPwOpen(true); }}>
              <KeyRound className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {onSetPassword && (
        <Dialog open={pwOpen} onOpenChange={(o) => { if (!saving) setPwOpen(o); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-typewriter">Nastavit heslo — {label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nové heslo" autoFocus />
                <Button type="button" variant="outline" onClick={() => setPw(randomPassword())}>Náhodné</Button>
              </div>
              <p className="text-xs text-muted-foreground">Heslo přepíše stávající; hash se neukládá v plaintextu.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPwOpen(false)} disabled={saving}>Zrušit</Button>
              <Button onClick={savePw} disabled={saving || !pw.trim()}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Uložit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
