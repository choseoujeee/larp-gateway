import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Loader2, Search, User, Theater } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface PersonRow {
  id: string;
  name: string;
  slug: string;
  type: "postava" | "cp";
  group_name: string | null;
  performer: string | null;
}

export default function V2PersonsPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larpName, setLarpName] = useState("");
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "postava" | "cp">("all");
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);

  useEffect(() => {
    if (!user || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (!l) { setLoading(false); return; }
      setLarpName(l.name);
      const { data: p } = await supabase
        .from("persons")
        .select("id, name, slug, type, group_name, performer")
        .eq("larp_id", l.id)
        .order("name");
      setPersons((p ?? []) as PersonRow[]);
      setLoading(false);
    })();
  }, [user, larpSlug]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return persons.filter((p) => {
      if (tab !== "all" && p.type !== tab) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.group_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [persons, tab, debounced]);

  if (!authLoading && !user) return <Navigate to={`/login?next=/v2/larp/${larpSlug}/postavy`} replace />;

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Postavy a CP</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="all">Vše</TabsTrigger>
              <TabsTrigger value="postava">Postavy</TabsTrigger>
              <TabsTrigger value="cp">CP</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hledat…" className="pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Žádné záznamy.</CardContent></Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <Link key={p.id} to={`/v2/larp/${larpSlug}/postavy/${p.id}`}>
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="flex items-start gap-3 py-3">
                    {p.type === "cp"
                      ? <Theater className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      : <User className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-typewriter text-base">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{p.type}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {p.group_name && <span>{p.group_name}</span>}
                        {p.performer && <span> • {p.performer}</span>}
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
