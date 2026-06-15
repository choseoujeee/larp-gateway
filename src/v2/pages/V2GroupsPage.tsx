import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Loader2, Users as UsersIcon, FileText, User } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface PersonMini {
  id: string;
  name: string;
  slug: string;
  type: "postava" | "cp";
  group_name: string | null;
}

interface DocMini {
  id: string;
  title: string;
  target_type: string;
  target_group: string | null;
  extra_target_group_names: string[] | null;
}

export default function V2GroupsPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larp, setLarp] = useState<{ id: string; name: string } | null>(null);
  const [persons, setPersons] = useState<PersonMini[]>([]);
  const [docs, setDocs] = useState<DocMini[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (!l) { setLoading(false); return; }
      setLarp(l);
      const [{ data: ps }, { data: ds }] = await Promise.all([
        supabase.from("persons").select("id, name, slug, type, group_name").eq("larp_id", l.id).order("name"),
        supabase.from("documents").select("id, title, target_type, target_group, extra_target_group_names").eq("larp_id", l.id),
      ]);
      setPersons((ps ?? []) as PersonMini[]);
      setDocs((ds ?? []) as DocMini[]);
      setLoading(false);
    })();
  }, [user, larpSlug]);

  const groups = useMemo(() => {
    const map = new Map<string, { members: PersonMini[]; docs: DocMini[] }>();
    for (const p of persons) {
      const g = (p.group_name ?? "").trim();
      if (!g) continue;
      if (!map.has(g)) map.set(g, { members: [], docs: [] });
      map.get(g)!.members.push(p);
    }
    for (const d of docs) {
      const names = new Set<string>();
      if (d.target_type === "skupina" && d.target_group) names.add(d.target_group);
      for (const n of d.extra_target_group_names ?? []) names.add(n);
      for (const n of names) {
        if (!map.has(n)) map.set(n, { members: [], docs: [] });
        map.get(n)!.docs.push(d);
      }
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }, [persons, docs]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <V2Shell larpName={larp?.name}>
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="font-typewriter text-2xl tracking-wider">Skupiny</h1>
          <p className="text-sm text-muted-foreground">
            Skupiny vytvořené přiřazením postavy nebo cílením dokumentu. Slouží k hromadnému sdílení dokumentů (frakce, rody, kněží apod.).
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Načítám…
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Žádné skupiny zatím nejsou. Skupinu vytvoříte zadáním názvu skupiny u postavy nebo cílením dokumentu na novou skupinu.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <Card key={g.name}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-typewriter text-lg tracking-wider">{g.name}</h2>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {g.members.length} {g.members.length === 1 ? "člen" : g.members.length < 5 ? "členové" : "členů"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <FileText className="mr-1 h-3 w-3" /> {g.docs.length}
                    </Badge>
                  </div>

                  {g.members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {g.members.map((m) => (
                        <Link
                          key={m.id}
                          to={`/larp/${larpSlug}/${m.type === "cp" ? "cp" : "postavy"}/${m.id}`}
                          className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted"
                        >
                          <User className="h-3 w-3" />
                          {m.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {g.docs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {g.docs.map((d) => (
                        <Link
                          key={d.id}
                          to={`/larp/${larpSlug}/dokumenty/${d.id}`}
                          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-xs hover:bg-muted"
                        >
                          <FileText className="h-3 w-3" />
                          {d.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </V2Shell>
  );
}
