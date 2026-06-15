import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { ProductionDocsList } from "../components/production/ProductionDocsList";
import { ProductionMaterialsCard } from "../components/production/ProductionMaterialsCard";
import { ProductionPortalCard } from "../components/production/ProductionPortalCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Larp { id: string; name: string; slug: string; }

export default function V2LarpProductionPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larp, setLarp] = useState<Larp | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!larpSlug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("larps").select("id, name, slug").eq("slug", larpSlug).maybeSingle();
      if (!data) setNotFound(true);
      else setLarp(data as Larp);
      setLoading(false);
    })();
  }, [larpSlug]);

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
              Sdílené produkční podklady pro celý LARP — dokumenty, soubory a odkazy, které platí napříč běhy.
              Tiskoviny a checklist najdete v konkrétním běhu.
            </p>
          </header>

          <ProductionDocsList larpId={larp.id} larpSlug={larp.slug} />
          <ProductionMaterialsCard larpId={larp.id} runId={null} newItemRunId={null} />
          <ProductionPortalCard larpId={larp.id} runId={null} />
        </div>
      )}
    </V2Shell>
  );
}
