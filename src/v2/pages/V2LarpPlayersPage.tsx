import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2, Mail, Phone, Users as UsersIcon, Search } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AssignmentRow {
  id: string;
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
  paid_at: string | null;
  run: { id: string; name: string; slug: string; date_from: string | null } | null;
  person: { id: string; name: string } | null;
}

interface PlayerAggregate {
  key: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  assignments: AssignmentRow[];
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
        .select("id, player_name, player_email, player_phone, paid_at, run:runs!inner(id, name, slug, date_from, larp_id), person:persons(id, name)")
        .eq("run.larp_id", larp.id);

      if (cancelled) return;
      setRows((data as unknown as AssignmentRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, larpSlug]);

  const aggregated = useMemo(() => aggregatePlayers(rows), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aggregated;
    return aggregated.filter((p) =>
      p.display_name.toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      p.assignments.some((a) => (a.person?.name ?? "").toLowerCase().includes(q))
    );
  }, [aggregated, search]);

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/hraci`} replace />;
  if (notFound) return <Navigate to="/" replace />;

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">Hráči</h1>
          <p className="text-sm text-muted-foreground">
            Všichni hráči, kteří kdy hráli v některém z běhů tohoto LARPu. Hodí se pro pozvání bývalých hráčů na nový běh.
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
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {aggregated.length === 0
                ? "Zatím žádní hráči — jakmile přiřadíte jméno a e-mail k postavě v některém běhu, objeví se tady."
                : "Žádný hráč nevyhovuje hledání."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "hráč" : filtered.length < 5 ? "hráči" : "hráčů"}
            </div>
            {filtered.map((p) => (
              <PlayerCard key={p.key} player={p} />
            ))}
          </div>
        )}
      </div>
    </V2Shell>
  );
}

function PlayerCard({ player }: { player: PlayerAggregate }) {
  const sortedAssignments = [...player.assignments].sort((a, b) => {
    const da = a.run?.date_from ?? "";
    const db = b.run?.date_from ?? "";
    return db.localeCompare(da);
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-typewriter text-lg">{player.display_name}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {player.email && (
                <a href={`mailto:${player.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Mail className="h-3 w-3" />{player.email}
                </a>
              )}
              {player.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />{player.phone}
                </span>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <UsersIcon className="h-3 w-3" />
            {player.assignments.length} {player.assignments.length === 1 ? "běh" : player.assignments.length < 5 ? "běhy" : "běhů"}
          </Badge>
        </div>

        <ul className="divide-y divide-border rounded-md border border-border">
          {sortedAssignments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{a.person?.name ?? "—"}</span>
                <span className="text-muted-foreground"> · {a.run?.name ?? "—"}</span>
                {a.run?.date_from && (
                  <span className="text-muted-foreground"> · {new Date(a.run.date_from).toLocaleDateString("cs-CZ")}</span>
                )}
              </div>
              {a.paid_at ? (
                <Badge variant="default" className="text-[10px]">Zaplaceno</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Nezaplaceno</Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function aggregatePlayers(rows: AssignmentRow[]): PlayerAggregate[] {
  const map = new Map<string, PlayerAggregate>();
  for (const r of rows) {
    const email = r.player_email?.trim().toLowerCase() || null;
    const name = r.player_name?.trim() || null;
    if (!email && !name) continue; // skip unassigned
    const key = email ?? `name:${name?.toLowerCase()}`;
    const display = name || email || "—";
    const existing = map.get(key);
    if (existing) {
      existing.assignments.push(r);
      if (!existing.phone && r.player_phone) existing.phone = r.player_phone;
      if (!existing.email && email) existing.email = email;
    } else {
      map.set(key, {
        key,
        display_name: display,
        email,
        phone: r.player_phone || null,
        assignments: [r],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.display_name.localeCompare(b.display_name, "cs"));
}
