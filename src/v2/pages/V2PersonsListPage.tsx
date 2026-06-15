import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Loader2, Search, User, Theater, Plus, Pencil, Trash2 } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PersonFormDialog } from "../components/PersonFormDialog";
import { toast } from "sonner";

interface PersonRow {
  id: string;
  name: string;
  slug: string;
  group_name: string | null;
  performer: string | null;
  performance_times: string | null;
}

interface Props { kind: "postava" | "cp" }

export default function V2PersonsListPage({ kind }: Props) {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [larp, setLarp] = useState<{ id: string; name: string } | null>(null);
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 200);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PersonRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonRow | null>(null);

  const reload = useCallback(async () => {
    if (!larp) return;
    const { data } = await supabase
      .from("persons")
      .select("id, name, slug, group_name, performer, performance_times")
      .eq("larp_id", larp.id).eq("type", kind).order("name");
    setPersons((data ?? []) as PersonRow[]);
  }, [larp, kind]);

  useEffect(() => {
    if (!user || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (!l) { setLoading(false); return; }
      setLarp(l);
      const { data } = await supabase
        .from("persons")
        .select("id, name, slug, group_name, performer, performance_times")
        .eq("larp_id", l.id).eq("type", kind).order("name");
      setPersons((data ?? []) as PersonRow[]);
      setLoading(false);
    })();
  }, [user, larpSlug, kind]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.group_name ?? "").toLowerCase().includes(q) ||
      (p.performer ?? "").toLowerCase().includes(q)
    );
  }, [persons, debounced]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("persons").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Smazání selhalo: " + error.message); return; }
    toast.success("Smazáno");
    setDeleteTarget(null);
    await reload();
  }

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/${kind === "cp" ? "cp" : "postavy"}`} replace />;

  const title = kind === "cp" ? "CP" : "Postavy";
  const Icon = kind === "cp" ? Theater : User;

  return (
    <V2Shell larpName={larp?.name}>
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl">{title}</h1>
          <Button onClick={() => { setEditTarget(null); setDialogOpen(true); }} disabled={!larp}>
            <Plus className="mr-2 h-4 w-4" />{kind === "cp" ? "Nové CP" : "Nová postava"}
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hledat…" className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            {persons.length === 0 ? "Zatím nic. Vytvořte první položku tlačítkem výše." : "Nic neodpovídá."}
          </CardContent></Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <Card key={p.id} className="transition-colors hover:border-primary">
                <CardContent className="flex items-start gap-3 py-3">
                  <Link to={`/larp/${larpSlug}/${kind === "cp" ? "cp" : "postavy"}/${p.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-typewriter text-base">{p.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {p.group_name && <Badge variant="secondary" className="text-[10px]">{p.group_name}</Badge>}
                        {kind === "cp" && p.performer && <span>👤 {p.performer}</span>}
                        {kind === "cp" && p.performance_times && <span>· {p.performance_times}</span>}
                      </div>
                    </div>
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditTarget(p); setDialogOpen(true); }} title="Upravit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(p)} title="Smazat">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {larp && (
        <PersonFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          larpId={larp.id}
          type={kind}
          person={editTarget}
          onSaved={() => reload()}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat „{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Související dokumenty (osobní/cílené) zůstanou, ale jejich cílení se rozbije.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2Shell>
  );
}
