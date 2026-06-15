import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Plus, Search, FileText, User, Users as UsersIcon, Eye } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type DocCategory = "organizacni" | "herni" | "produkcni";

interface DocRow {
  id: string;
  title: string;
  doc_category: DocCategory;
  is_personal: boolean;
  target_type: "vsichni" | "skupina" | "osoba";
  target_group: string | null;
  target_person_id: string | null;
  extra_target_person_ids: string[] | null;
  extra_target_group_names: string[] | null;
  priority: number;
  sort_order: number | null;
  updated_at: string;
}

interface LarpRow { id: string; name: string; slug: string; }

const CATEGORY_LABEL: Record<DocCategory, string> = {
  organizacni: "Organizační",
  herni: "Herní",
  produkcni: "Produkční",
};

export default function V2DocumentsPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [larp, setLarp] = useState<LarpRow | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DocCategory | "all">("all");
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);

  useEffect(() => {
    if (!user || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from("larps").select("id, name, slug").eq("slug", larpSlug).maybeSingle();
      if (!l) { setLoading(false); return; }
      setLarp(l as LarpRow);
      const [{ data: d }, { data: p }] = await Promise.all([
        supabase
          .from("documents")
          .select("id, title, doc_category, is_personal, target_type, target_group, target_person_id, extra_target_person_ids, extra_target_group_names, priority, sort_order, updated_at")
          .eq("larp_id", l.id)
          .order("doc_category")
          .order("priority")
          .order("sort_order"),
        supabase.from("persons").select("id, name").eq("larp_id", l.id),
      ]);
      setDocs((d ?? []) as DocRow[]);
      const map: Record<string, string> = {};
      (p ?? []).forEach((x: { id: string; name: string }) => { map[x.id] = x.name; });
      setPersonNames(map);
      setLoading(false);
    })();
  }, [user, larpSlug]);


  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return docs.filter((d) => {
      if (tab !== "all" && d.doc_category !== tab) return false;
      if (q && !d.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [docs, tab, debounced]);

  async function createNew() {
    if (!larp) return;
    const { data, error } = await supabase
      .from("documents")
      .insert({
        larp_id: larp.id,
        title: "Nový dokument",
        doc_category: tab !== "all" ? tab : "organizacni",
        doc_type: "organizacni",
        is_personal: false,
        target_type: "vsichni",
        priority: 2,
        content: "",
      })
      .select("id")
      .single();
    if (!error && data) navigate(`/larp/${larpSlug}/dokumenty/${data.id}`);
  }

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/dokumenty`} replace />;

  return (
    <V2Shell larpName={larp?.name}>
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Dokumenty</h1>
          <Button onClick={createNew} disabled={!larp}>
            <Plus className="mr-2 h-4 w-4" />Nový dokument
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={tab} onValueChange={(v) => setTab(v as DocCategory | "all")} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4 sm:w-auto">
              <TabsTrigger value="all">Vše</TabsTrigger>
              <TabsTrigger value="organizacni">Organizační</TabsTrigger>
              <TabsTrigger value="herni">Herní</TabsTrigger>
              <TabsTrigger value="produkcni">Produkční</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat dokument…"
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Žádné dokumenty.</CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {filtered.map((d) => (
              <Link key={d.id} to={`/larp/${larpSlug}/dokumenty/${d.id}`}>
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="flex items-start gap-3 py-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-typewriter text-base">{d.title}</span>
                        <Badge variant="default" className="text-[10px]">
                          <TargetIcon t={d.target_type} />
                          <span className="ml-1">{targetLabel(d, personNames)}</span>
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">{CATEGORY_LABEL[d.doc_category]}</Badge>
                        {d.is_personal && <Badge variant="secondary" className="text-[10px]">Osobní</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        upr. {new Date(d.updated_at).toLocaleDateString("cs-CZ")}
                      </div>
                    </div>
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

function TargetIcon({ t }: { t: DocRow["target_type"] }) {
  if (t === "vsichni") return <Eye className="h-3 w-3" />;
  if (t === "skupina") return <UsersIcon className="h-3 w-3" />;
  return <User className="h-3 w-3" />;
}

function targetLabel(d: DocRow, names: Record<string, string>): string {
  if (d.target_type === "vsichni") return "Všichni";
  if (d.target_type === "skupina") return d.target_group ?? "Skupina";
  return (d.target_person_id && names[d.target_person_id]) || "Osoba";
}

