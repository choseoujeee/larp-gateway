import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { ProductionDocsList } from "../components/production/ProductionDocsList";
import { ProductionMaterialsCard } from "../components/production/ProductionMaterialsCard";
import { ProductionChecklistCard } from "../components/production/ProductionChecklistCard";
import { ProductionPortalCard } from "../components/production/ProductionPortalCard";
import { useAuth } from "@/hooks/useAuth";
import { useRun } from "../hooks/useRun";

export default function V2RunProductionPage() {
  const { larpSlug, runSlug } = useParams<{ larpSlug: string; runSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { run, loading, notFound } = useRun(larpSlug, runSlug);

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/beh/${runSlug}/produkce`} replace />;
  if (notFound) return <Navigate to={`/larp/${larpSlug}`} replace />;

  return (
    <V2Shell larpName={run?.larp_name} runName={run?.name}>
      {loading || !run ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-4">
          <header>
            <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Produkce — {run.name}</h1>
            <p className="text-sm text-muted-foreground">
              Vše pro přípravu konkrétního běhu — checklist, soubory, odkazy, tiskoviny a přístup pro produkční tým.
            </p>
          </header>

          <ProductionChecklistCard runId={run.id} />
          <ProductionMaterialsCard larpId={run.larp_id} runId={run.id} newItemRunId={run.id} />
          <ProductionDocsList larpId={run.larp_id} larpSlug={run.larp_slug} />
          <ProductionPortalCard larpId={run.larp_id} runId={run.id} />
        </div>
      )}
    </V2Shell>
  );
}

