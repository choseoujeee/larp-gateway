import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Loader2, Users, Theater, Calendar, ClipboardCheck, ArrowRight, AlertTriangle, Plus, MessageSquare } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { RunHeader } from "../components/RunHeader";
import { RunEditDialog } from "../components/RunEditDialog";
import { RunCreateDialog } from "../components/RunCreateDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useRun, useRunCockpitStats, getRunDisplayName } from "../hooks/useRun";

export default function V2RunCockpit() {
  const { larpSlug, runSlug } = useParams<{ larpSlug: string; runSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { run, loading: runLoading, notFound, reload } = useRun(larpSlug, runSlug);
  const { stats, loading: statsLoading } = useRunCockpitStats(run?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/beh/${runSlug}`} replace />;
  if (notFound) return <Navigate to={`/larp/${larpSlug}`} replace />;

  const loading = runLoading || statsLoading;
  const base = `/larp/${larpSlug}/beh/${runSlug}`;

  const checklistPct = stats && stats.checklist_total > 0
    ? Math.round((stats.checklist_done / stats.checklist_total) * 100)
    : 0;

  const issues = stats ? buildIssues(stats, base) : [];

  return (
    <V2Shell larpName={run?.larp_name} runName={run ? getRunDisplayName(run) : undefined}>
      {loading || !run ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6">
          <RunHeader run={run} onEdit={() => setEditOpen(true)} onNewRun={() => setCreateOpen(true)} />
          <RunEditDialog
            runId={run.id}
            larpSlug={run.larp_slug}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={reload}
          />
          <RunCreateDialog
            larpId={run.larp_id}
            larpSlug={run.larp_slug}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />



          {/* Klíčová čísla */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Hráči"
              primary={`${stats?.assigned ?? 0} / ${stats?.persons ?? 0}`}
              secondary={`${stats?.paid ?? 0} zaplaceno`}
              to={`${base}/hraci`}
            />
            <StatCard
              icon={Theater}
              label="CP performeři"
              primary={`${stats?.cp_with_performer ?? 0} / ${stats?.cp ?? 0}`}
              secondary="přiřazeno"
              to={`${base}/cp`}
            />
            <StatCard
              icon={Calendar}
              label="Harmonogram"
              primary={`${stats?.events ?? 0}`}
              secondary="událostí"
              to={`${base}/harmonogram`}
            />
            <StatCard
              icon={ClipboardCheck}
              label="Checklist"
              primary={`${checklistPct} %`}
              secondary={`${stats?.checklist_done ?? 0} / ${stats?.checklist_total ?? 0}`}
              to={`${base}/produkce`}
              extra={<Progress value={checklistPct} className="mt-2 h-1.5" />}
            />
          </div>

          {/* Rychlé akce */}
          <section>
            <h2 className="mb-2 font-typewriter text-lg">Rychlé akce</h2>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link to={`${base}/hraci`}><Users className="mr-2 h-4 w-4" />Hráči a pozvánky</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to={`${base}/cp`}><Theater className="mr-2 h-4 w-4" />CP performeři</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to={`${base}/harmonogram`}><Calendar className="mr-2 h-4 w-4" />Harmonogram</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to={`${base}/produkce`}><ClipboardCheck className="mr-2 h-4 w-4" />Produkce</Link></Button>
            </div>
          </section>

          {/* Pre-flight stav */}
          <section>
            <h2 className="mb-2 font-typewriter text-lg">Co je potřeba doladit</h2>
            {issues.length === 0 ? (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
                Vše vypadá v pořádku. 🎉
              </CardContent></Card>
            ) : (
              <Card>
                <CardContent className="divide-y divide-border p-0">
                  {issues.map((i) => (
                    <Link key={i.label} to={i.to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="flex-1 text-sm">{i.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}
    </V2Shell>
  );
}

function StatCard({
  icon: Icon, label, primary, secondary, to, extra,
}: {
  icon: typeof Users; label: string; primary: string; secondary: string; to: string; extra?: React.ReactNode;
}) {
  return (
    <Link to={to}>
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="font-typewriter text-2xl">{primary}</div>
          <div className="text-xs text-muted-foreground">{secondary}</div>
          {extra}
        </CardContent>
      </Card>
    </Link>
  );
}

function buildIssues(s: import("../hooks/useRun").RunCockpitStats, base: string) {
  const out: { label: string; to: string }[] = [];
  if (s.persons > 0 && s.assigned < s.persons) {
    out.push({ label: `${s.persons - s.assigned} postav bez přiřazeného hráče`, to: `${base}/hraci` });
  }
  if (s.assigned > 0 && s.paid < s.assigned) {
    out.push({ label: `${s.assigned - s.paid} hráčů ještě nezaplatilo`, to: `${base}/hraci` });
  }
  if (s.cp > 0 && s.cp_with_performer < s.cp) {
    out.push({ label: `${s.cp - s.cp_with_performer} CP bez performera`, to: `${base}/cp` });
  }
  if (s.events === 0) {
    out.push({ label: "Harmonogram je zatím prázdný", to: `${base}/harmonogram` });
  }
  if (s.checklist_total > 0 && s.checklist_done < s.checklist_total) {
    out.push({ label: `${s.checklist_total - s.checklist_done} položek v checklistu zbývá`, to: `${base}/produkce` });
  }
  return out;
}
