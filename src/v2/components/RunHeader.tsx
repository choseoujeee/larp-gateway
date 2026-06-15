import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RunData } from "../hooks/useRun";
import { getRunStatus } from "../hooks/useRun";

interface Props {
  run: RunData;
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Aktuální", variant: "default" },
  upcoming: { label: "Plánovaný", variant: "secondary" },
  past: { label: "Minulý", variant: "outline" },
  unknown: { label: "Bez termínu", variant: "outline" },
};

export function RunHeader({ run }: Props) {
  const status = getRunStatus(run);
  const s = statusLabel[status];
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">{run.name}</h1>
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {(run.date_from || run.date_to) && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatRange(run.date_from, run.date_to)}
          </span>
        )}
        {run.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {run.location}
          </span>
        )}
      </div>
    </header>
  );
}

function formatRange(from: string | null, to: string | null): string {
  const f = from ? new Date(from).toLocaleDateString("cs-CZ") : null;
  const t = to ? new Date(to).toLocaleDateString("cs-CZ") : null;
  if (f && t) return `${f} – ${t}`;
  return f ?? t ?? "";
}
