import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Loader2, CalendarDays } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface RunRow {
  id: string;
  name: string;
  slug: string;
  date_from: string | null;
  date_to: string | null;
  is_active: boolean | null;
}

export default function V2PastRunsPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larpName, setLarpName] = useState<string>("");
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (!l) { setLoading(false); return; }
      setLarpName(l.name);
      const { data } = await supabase.from("runs")
        .select("id, name, slug, date_from, date_to, is_active")
        .eq("larp_id", l.id)
        .order("date_from", { ascending: false });
      setRuns(((data ?? []) as RunRow[]).filter(r => !r.is_active));
      setLoading(false);
    })();
  }, [user, larpSlug]);

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/drivejsi-behy`} replace />;

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Dřívější běhy</h1>
          <p className="text-sm text-muted-foreground">Archiv proběhnutých běhů. Každý běh má vlastní stránku s hráči, CP a harmonogramem.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : runs.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Žádné dřívější běhy.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {runs.map((r) => (
              <Link key={r.id} to={`/larp/${larpSlug}/beh/${r.slug}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 font-typewriter text-base">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {r.name}
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
      </div>
    </V2Shell>
  );
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("cs-CZ"); } catch { return iso; }
}
