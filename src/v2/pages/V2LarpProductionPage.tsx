import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { Loader2, ChevronRight } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { ProductionDocsList } from "../components/production/ProductionDocsList";
import { ProductionMaterialsCard } from "../components/production/ProductionMaterialsCard";
import { ProductionChecklistCard } from "../components/production/ProductionChecklistCard";
import { ProductionPortalCard } from "../components/production/ProductionPortalCard";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

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
      const list = (rs ?? []) as RunMini[];
      setRuns(list);
      const active = list.find((r) => r.is_active) ?? list[0] ?? null;
      setSelectedRunId(active?.id ?? null);
      setLoading(false);
    })();
  }, [larpSlug]);

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/produkce`} replace />;
  if (notFound) return <Navigate to="/" replace />;

  return (
    <V2Shell larpName={larp?.name}>
      {loading || !larp ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-4">
          <header>
            <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Produkce</h1>
            <p className="text-sm text-muted-foreground">
              Všechny produkční podklady LARPu — dokumenty, soubory, odkazy a tiskoviny napříč všemi běhy.
              Checklisty se vedou pro každý běh zvlášť.
            </p>
          </header>

          <ProductionDocsList larpId={larp.id} larpSlug={larp.slug} />
          <ProductionMaterialsCard larpId={larp.id} runId="all" newItemRunId={selectedRun?.id ?? null} />

          {runs.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Checklist běhu</div>
                  <Select value={selectedRunId ?? ""} onValueChange={(v) => setSelectedRunId(v)}>
                    <SelectTrigger className="h-7 w-auto min-w-[160px] text-xs"><SelectValue placeholder="Vyber běh…" /></SelectTrigger>
                    <SelectContent>
                      {runs.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}{r.is_active ? " · aktivní" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRun && (
                  <Link
                    to={`/larp/${larp.slug}/beh/${selectedRun.slug}/produkce`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Otevřít produkci běhu <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              {selectedRun && <ProductionChecklistCard key={selectedRun.id} runId={selectedRun.id} />}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Pro checklist je potřeba aspoň jeden běh.
              </CardContent>
            </Card>
          )}

          <ProductionPortalCard larpId={larp.id} runId={selectedRun?.id ?? null} />
        </div>
      )}
    </V2Shell>
  );
}
