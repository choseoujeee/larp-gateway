import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Doc { id: string; title: string; updated_at: string; }

interface Props { larpId: string; larpSlug: string; }

export function ProductionDocsList({ larpId, larpSlug }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Show both produkční-category and produkční-type docs so anything visible
      // in the production portal also appears here in admin.
      const { data, error } = await supabase.from("documents")
        .select("id, title, updated_at")
        .eq("larp_id", larpId)
        .or("doc_category.eq.produkcni,doc_type.eq.produkční")
        .order("priority").order("sort_order");
      if (error) toast.error(error.message);
      setDocs((data ?? []) as Doc[]);
      setLoading(false);
    })();
  }, [larpId]);

  async function createNew() {
    const { data, error } = await supabase.from("documents").insert({
      larp_id: larpId,
      title: "Nový produkční dokument",
      doc_category: "produkcni",
      doc_type: "organizacni",
      is_personal: false,
      target_type: "vsichni",
      priority: 2,
      content: "",
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    navigate(`/larp/${larpSlug}/dokumenty/${data.id}`);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-typewriter text-base">Produkční dokumenty</CardTitle>
        <Button size="sm" onClick={createNew}>
          <Plus className="mr-1 h-4 w-4" />Nový dokument
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-muted-foreground">Zatím žádné produkční dokumenty.</div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id}>
                <Link to={`/larp/${larpSlug}/dokumenty/${d.id}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                  <FileText className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">upr. {new Date(d.updated_at).toLocaleDateString("cs-CZ")}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
