import { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { Loader2, Mail, Phone, Search } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AssignmentRow {
  id: string;
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
  paid_at: string | null;
  run: { id: string; name: string; slug: string; date_from: string | null; is_active: boolean | null } | null;
  person: { id: string; name: string; slug: string | null; type: string | null; group_name: string | null } | null;
}

export default function V2LarpPlayersPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larpName, setLarpName] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user || !larpSlug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: larp } = await supabase
        .from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (cancelled) return;
      if (!larp) { setNotFound(true); setLoading(false); return; }
      setLarpName(larp.name);

      const { data } = await supabase
        .from("run_person_assignments")
        .select("id, player_name, player_email, player_phone, paid_at, run:runs!inner(id, name, slug, date_from, is_active, larp_id), person:persons(id, name, slug, type, group_name)")
        .eq("run.larp_id", larp.id)
        .eq("run.is_active", true);

      if (cancelled) return;
      setRows((data as unknown as AssignmentRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, larpSlug]);

  const { players, performers } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (r: AssignmentRow) => {
      if (!q) return true;
      return (r.player_name ?? "").toLowerCase().includes(q)
        || (r.player_email ?? "").toLowerCase().includes(q)
        || (r.player_phone ?? "").toLowerCase().includes(q)
        || (r.person?.name ?? "").toLowerCase().includes(q);
    };
    const sorted = [...rows]
      .filter((r) => (r.player_name?.trim() || r.player_email?.trim()))
      .filter(match)
      .sort((a, b) => (a.player_name ?? "").localeCompare(b.player_name ?? "", "cs"));
    return {
      players: sorted.filter((r) => r.person?.type !== "cp"),
      performers: sorted.filter((r) => r.person?.type === "cp"),
    };
  }, [rows, search]);

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/hraci`} replace />;
  if (notFound) return <Navigate to="/" replace />;

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Hráči</h1>
          <p className="text-sm text-muted-foreground">
            Lidé přiřazení k aktivnímu běhu — hráči postav a performeři CP.
          </p>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat podle jména, e-mailu, telefonu nebo postavy…"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="players">
            <TabsList>
              <TabsTrigger value="players">Hráči postav · {players.length}</TabsTrigger>
              <TabsTrigger value="performers">Performeři CP · {performers.length}</TabsTrigger>
            </TabsList>
            <TabsContent value="players" className="mt-4">
              <PersonList rows={players} larpSlug={larpSlug!} emptyText="Žádní hráči v aktivním běhu." />
            </TabsContent>
            <TabsContent value="performers" className="mt-4">
              <PersonList rows={performers} larpSlug={larpSlug!} emptyText="Žádní performeři v aktivním běhu." />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </V2Shell>
  );
}

function PersonList({ rows, larpSlug, emptyText }: { rows: AssignmentRow[]; larpSlug: string; emptyText: string }) {
  if (rows.length === 0) {
    return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{emptyText}</CardContent></Card>;
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const isCp = r.person?.type === "cp";
        const personPath = r.person?.slug
          ? `/larp/${larpSlug}/${isCp ? "cp" : "postavy"}/${r.person.slug}`
          : null;
        return (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-typewriter text-base">{r.player_name || <span className="italic text-muted-foreground">bez jména</span>}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {r.player_email && (
                    <a href={`mailto:${r.player_email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Mail className="h-3 w-3" />{r.player_email}
                    </a>
                  )}
                  {r.player_phone && (
                    <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.player_phone}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.person && (
                  personPath ? (
                    <Link to={personPath}><Badge variant="secondary">{r.person.name}</Badge></Link>
                  ) : (
                    <Badge variant="secondary">{r.person.name}</Badge>
                  )
                )}
                {!isCp && (
                  <button onClick={() => togglePaid(r)} title={r.paid_at ? "Označit jako nezaplaceno" : "Označit jako zaplaceno"} className="inline-flex">
                    {r.paid_at
                      ? <Badge className="text-[10px] cursor-pointer bg-green-600 hover:bg-green-700">Zaplaceno</Badge>
                      : <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-accent">Nezaplaceno</Badge>}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
