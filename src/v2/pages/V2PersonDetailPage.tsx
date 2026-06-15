import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Loader2, ArrowLeft, FileText, Plus } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PersonRow {
  id: string;
  name: string;
  slug: string;
  type: "postava" | "cp";
  group_name: string | null;
  performer: string | null;
  performance_times: string | null;
  medailonek: string | null;
  larp_id: string;
}

interface DocRow {
  id: string; title: string; doc_category: "organizacni" | "herni" | "produkcni";
  is_personal: boolean; target_type: string; target_group: string | null;
}

export default function V2PersonDetailPage() {
  const { larpSlug, personId } = useParams<{ larpSlug: string; personId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [larpName, setLarpName] = useState("");
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !personId || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (l) setLarpName(l.name);
      const { data: p } = await supabase.from("persons").select("*").eq("id", personId).maybeSingle();
      if (!p) { setLoading(false); return; }
      setPerson(p as PersonRow);
      const { data: d } = await supabase
        .from("documents")
        .select("id, title, doc_category, is_personal, target_type, target_group, target_person_id")
        .eq("larp_id", p.larp_id)
        .or(`target_type.eq.vsichni,and(target_type.eq.osoba,target_person_id.eq.${p.id})${p.group_name ? `,and(target_type.eq.skupina,target_group.eq.${p.group_name})` : ""}`)
        .order("doc_category")
        .order("priority")
        .order("sort_order");
      setDocs((d ?? []) as DocRow[]);
      setLoading(false);
    })();
  }, [user, personId, larpSlug]);

  async function createPersonalDoc() {
    if (!person) return;
    const { data, error } = await supabase.from("documents").insert({
      larp_id: person.larp_id,
      title: `${person.name} – nový dokument`,
      doc_category: "herni",
      doc_type: "postava",
      is_personal: true,
      target_type: "osoba",
      target_person_id: person.id,
      priority: 2,
      content: "",
    }).select("id").single();
    if (error || !data) { toast.error("Vytvoření selhalo"); return; }
    navigate(`/v2/larp/${larpSlug}/dokumenty/${data.id}`);
  }

  if (!authLoading && !user) return <Navigate to={`/login?next=/v2/larp/${larpSlug}/postavy/${personId}`} replace />;

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-4xl space-y-4">
        <Link to={`/v2/larp/${larpSlug}/postavy`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />Zpět na seznam
        </Link>

        {loading || !person ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-typewriter text-2xl">{person.name}</CardTitle>
                  <Badge variant="outline">{person.type}</Badge>
                  {person.group_name && <Badge variant="secondary">{person.group_name}</Badge>}
                </div>
                {person.performer && <p className="text-sm text-muted-foreground">Performer: {person.performer}</p>}
              </CardHeader>
              {person.medailonek && (
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: person.medailonek }} />
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-typewriter text-lg">Související dokumenty</CardTitle>
                <Button size="sm" onClick={createPersonalDoc}>
                  <Plus className="mr-1 h-4 w-4" />Osobní dokument
                </Button>
              </CardHeader>
              <CardContent>
                {docs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Žádné dokumenty pro tuto osobu.</p>
                ) : (
                  <div className="space-y-1.5">
                    {docs.map((d) => (
                      <Link key={d.id} to={`/v2/larp/${larpSlug}/dokumenty/${d.id}`}
                        className="flex items-center gap-2 rounded border border-border p-2 transition-colors hover:border-primary">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="flex-1 truncate text-sm">{d.title}</span>
                        <Badge variant="outline" className="text-[10px]">{d.doc_category}</Badge>
                        {d.is_personal && <Badge variant="secondary" className="text-[10px]">osobní</Badge>}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </V2Shell>
  );
}
