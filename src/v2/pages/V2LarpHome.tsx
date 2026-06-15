import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Loader2, Plus, FileText, Users, Calendar } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface LarpRow { id: string; name: string; slug: string; motto: string | null; }
interface RunRow { id: string; name: string; slug: string; date_from: string | null; date_to: string | null; is_active: boolean; }
interface Counts { documents: number; persons: number; }

export default function V2LarpHome() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larp, setLarp] = useState<LarpRow | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ documents: 0, persons: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: larpRow } = await supabase
        .from("larps")
        .select("id, name, slug, motto")
        .eq("slug", larpSlug)
        .maybeSingle();
      if (!larpRow) { setNotFound(true); setLoading(false); return; }
      setLarp(larpRow as LarpRow);

      const [{ data: runsRows }, { count: docCount }, { count: personCount }] = await Promise.all([
        supabase.from("runs").select("id, name, slug, date_from, date_to, is_active").eq("larp_id", larpRow.id).order("date_from", { ascending: false }),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("larp_id", larpRow.id),
        supabase.from("persons").select("id", { count: "exact", head: true }).eq("larp_id", larpRow.id),
      ]);
      setRuns((runsRows ?? []) as RunRow[]);
      setCounts({ documents: docCount ?? 0, persons: personCount ?? 0 });
      setLoading(false);
    })();
  }, [user, larpSlug]);

  if (!authLoading && !user) return <Navigate to={`/login?next=/v2/larp/${larpSlug}`} replace />;
  if (notFound) return <Navigate to="/v2" replace />;

  return (
    <V2Shell larpName={larp?.name}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6">
          <header>
            <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">{larp?.name}</h1>
            {larp?.motto && <p className="italic text-muted-foreground">{larp.motto}</p>}
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard icon={FileText} label="Dokumentů" value={counts.documents} to={`/v2/larp/${larpSlug}/dokumenty`} />
            <StatCard icon={Users} label="Postav" value={counts.persons} to={`/v2/larp/${larpSlug}/postavy`} />
            <StatCard icon={Calendar} label="Běhů" value={runs.length} to={`#runs`} />
          </div>

          <section id="runs">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-typewriter text-xl">Běhy</h2>
              <Button size="sm" disabled title="Zatím v přípravě (Etapa 2)">
                <Plus className="mr-2 h-4 w-4" />Nový běh
              </Button>
            </div>
            {runs.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Žádné běhy.</CardContent></Card>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {runs.map((r) => (
                  <Link key={r.id} to={`/v2/larp/${larpSlug}/beh/${r.slug}`}>
                    <Card className="transition-colors hover:border-primary">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base font-typewriter">
                          {r.name}
                          {r.is_active && <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">Aktivní</span>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 text-sm text-muted-foreground">
                        {r.date_from && r.date_to
                          ? `${formatDate(r.date_from)} – ${formatDate(r.date_to)}`
                          : "Termín nezadán"}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </V2Shell>
  );
}

function StatCard({ icon: Icon, label, value, to }: { icon: typeof FileText; label: string; value: number; to: string }) {
  const Content = (
    <Card className="transition-colors hover:border-primary">
      <CardContent className="flex items-center gap-3 py-5">
        <Icon className="h-8 w-8 text-primary" />
        <div>
          <div className="text-2xl font-typewriter">{value}</div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
  return to.startsWith("#") ? <a href={to}>{Content}</a> : <Link to={to}>{Content}</Link>;
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("cs-CZ"); } catch { return iso; }
}
