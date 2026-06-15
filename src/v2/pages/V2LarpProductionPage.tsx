import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { Loader2, ChevronRight } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { ProductionDocsList } from "../components/production/ProductionDocsList";
import { ProductionMaterialsCard } from "../components/production/ProductionMaterialsCard";
import { ProductionChecklistCard } from "../components/production/ProductionChecklistCard";
import { ProductionPortalCard } from "../components/production/ProductionPortalCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Larp { id: string; name: string; slug: string; }
interface RunMini { id: string; name: string; slug: string; is_active: boolean | null; date_from: string | null; }

export default function V2LarpProductionPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larp, setLarp] = useState<Larp | null>(null);
  const [runs, setRuns] = useState<RunMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!larpSlug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("larps").select("id, name, slug").eq("slug", larpSlug).maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setLarp(data as Larp);
      const { data: rs } = await supabase
        .from("runs")
        .select("id, name, slug, is_active, date_from")
        .eq("larp_id", data.id)
        .order("date_from", { ascending: false });
      setRuns((rs ?? []) as RunMini[]);
      setLoading(false);
    })();
  }, [larpSlug]);

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/produkce`} replace />;
  if (notFound) return <Navigate to="/" replace />;

  const activeRun = runs.find((r) => r.is_active) ?? runs[0] ?? null;

  return (
    <V2Shell larpName={larp?.name}>
      {loading || !larp ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-4">
          <header>
            <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Produkce</h1>
            <p className="text-sm text-muted-foreground">
              Všechny produkční podklady LARPu — dokumenty, soubory a odkazy napříč všemi běhy.
              Checklist se vede pro každý běh zvlášť.
            </p>
          </header>

          <ProductionDocsList larpId={larp.id} larpSlug={larp.slug} />
          <ProductionMaterialsCard larpId={larp.id} runId="all" newItemRunId={activeRun?.id ?? null} />

          {activeRun ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-typewriter text-base">
                  Checklist · {activeRun.name}
                </CardTitle>
                <Link
                  to={`/larp/${larp.slug}/beh/${activeRun.slug}/produkce`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Produkce běhu <ChevronRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <ProductionChecklistCard runId={activeRun.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Pro checklist je potřeba aktivní běh.
              </CardContent>
            </Card>
          )}

          <ProductionPortalCard larpId={larp.id} runId={activeRun?.id ?? null} />
        </div>
      )}
    </V2Shell>
  );
}
