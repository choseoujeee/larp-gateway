import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { History } from "lucide-react";
import type { PlayerHistoryEntry } from "../hooks/useLarpPlayerHistory";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called when a suggestion is picked — receives the whole entry to allow prefilling email/phone */
  onPick?: (entry: PlayerHistoryEntry) => void;
  suggestions: PlayerHistoryEntry[];
  /** Which field of the entry we're typing — used to match suggestions */
  field: "name" | "email" | "phone";
  placeholder?: string;
  type?: string;
  className?: string;
}

/** Lightweight autocomplete input that shows historical players/performers. */
export function ContactAutocomplete({ value, onChange, onPick, suggestions, field, placeholder, type, className }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = q.length === 0
    ? suggestions.slice(0, 8)
    : suggestions.filter((s) => {
        const target = field === "name" ? s.display_name : field === "email" ? (s.email ?? "") : (s.phone ?? "");
        return target.toLowerCase().includes(q);
      }).slice(0, 8);

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.map((s) => (
            <button
              key={s.key}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick?.(s);
                setOpen(false);
              }}
            >
              <History className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.display_name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {s.email}{s.phone ? ` · ${s.phone}` : ""} · {s.runs_count}× hrál
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
