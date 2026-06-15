import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, Plus, FolderOpen } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface LarpRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  motto: string | null;
}

export default function V2Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [larps, setLarps] = useState<LarpRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("larps")
        .select("id, name, slug, description, motto")
        .order("name");
      if (!error && data) setLarps(data as LarpRow[]);
      setLoading(false);
    })();
  }, [user]);

  if (!authLoading && !user) {
    return <Navigate to="/_archiv/login?next=/" replace />;
  }

  return (
    <V2Shell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-typewriter text-2xl tracking-wide text-foreground md:text-3xl">
              Moje LARPy
            </h1>
            <p className="text-sm text-muted-foreground">
              Vyberte LARP, na kterém chcete pracovat, nebo založte nový.
            </p>
          </div>
          <Button disabled title="Zatím v přípravě (Etapa 1)">
            <Plus className="mr-2 h-4 w-4" />
            Nový LARP
          </Button>
        </div>

        {loading || authLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : larps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Zatím nemáte žádný LARP.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {larps.map((l) => (
              <Link key={l.id} to={`/larp/${l.slug}`} className="block">
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <CardTitle className="font-typewriter">{l.name}</CardTitle>
                    {l.motto && (
                      <p className="text-sm italic text-muted-foreground">{l.motto}</p>
                    )}
                  </CardHeader>
                  {l.description && (
                    <CardContent>
                      <p className="line-clamp-3 text-sm text-foreground/80">{l.description}</p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 rounded border border-dashed border-border p-4 text-xs text-muted-foreground">
          <strong>v2 (beta):</strong> nová verze portálu se staví etapově. Stará aplikace je beze
          změny dostupná na <Link to="/admin" className="underline">/admin</Link>.
        </div>
      </div>
    </V2Shell>
  );
}
