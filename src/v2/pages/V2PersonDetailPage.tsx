import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PortalLinkCard } from "../components/PortalLinkCard";
import { PersonFormDialog } from "../components/PersonFormDialog";
import { PlayerAssignmentsCard } from "../components/PlayerAssignmentsCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  id: string;
  title: string;
  doc_category: "organizacni" | "herni" | "produkcni";
  is_personal: boolean;
  target_type: string;
  priority: number;
}

const CAT_LABEL: Record<DocRow["doc_category"], string> = {
  organizacni: "Organizační",
  herni: "Herní",
  produkcni: "Produkční",
};

export default function V2PersonDetailPage() {
  const { larpSlug, personId } = useParams<{ larpSlug: string; personId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [larpName, setLarpName] = useState("");
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!personId || !larpSlug) return;
    setLoading(true);
    const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
    if (l) setLarpName(l.name);
    const { data: p } = await supabase.from("persons").select("*").eq("id", personId).maybeSingle();
    if (!p) { setLoading(false); return; }
    setPerson(p as PersonRow);

    // Three safe queries instead of fragile .or() string concatenation
    const q1 = supabase.from("documents")
      .select("id, title, doc_category, is_personal, target_type, priority")
      .eq("larp_id", p.larp_id).eq("target_type", "vsichni");
    const q2 = supabase.from("documents")
      .select("id, title, doc_category, is_personal, target_type, priority")
      .eq("larp_id", p.larp_id).eq("target_type", "osoba").eq("target_person_id", p.id);
    const q3 = p.group_name
      ? supabase.from("documents")
          .select("id, title, doc_category, is_personal, target_type, priority")
          .eq("larp_id", p.larp_id).eq("target_type", "skupina").eq("target_group", p.group_name)
      : Promise.resolve({ data: [] as DocRow[] });

    const [r1, r2, r3] = await Promise.all([q1, q2, q3 as Promise<{ data: DocRow[] | null }>]);
    const all = ([...(r1.data ?? []), ...(r2.data ?? []), ...(r3.data ?? [])] as DocRow[])
      .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);
    setDocs(all);
    setLoading(false);
  }, [personId, larpSlug]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const grouped = useMemo(() => {
    const g: Record<DocRow["doc_category"], DocRow[]> = { organizacni: [], herni: [], produkcni: [] };
    docs.forEach((d) => g[d.doc_category].push(d));
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title)));
    return g;
  }, [docs]);

  async function createPersonalDoc() {
    if (!person) return;
    const { data, error } = await supabase.from("documents").insert({
      larp_id: person.larp_id,
      title: `${person.name} – nový dokument`,
      doc_category: "herni",
      doc_type: person.type === "cp" ? "cp" : "postava",
      is_personal: true,
      target_type: "osoba",
      target_person_id: person.id,
      priority: 2,
      content: "",
    }).select("id").single();
    if (error || !data) { toast.error("Vytvoření selhalo: " + (error?.message ?? "")); return; }
    navigate(`/v2/larp/${larpSlug}/dokumenty/${data.id}`);
  }

  async function confirmDelete() {
    if (!person) return;
    const { error } = await supabase.from("persons").delete().eq("id", person.id);
    if (error) { toast.error("Smazání selhalo"); return; }
    toast.success("Smazáno");
    navigate(`/v2/larp/${larpSlug}/${person.type === "cp" ? "cp" : "postavy"}`);
  }

  if (!authLoading && !user) return <Navigate to={`/login?next=/v2/larp/${larpSlug}/postavy/${personId}`} replace />;

  const backLink = person?.type === "cp"
    ? `/v2/larp/${larpSlug}/cp`
    : `/v2/larp/${larpSlug}/postavy`;
  const portalUrl = person && larpSlug
    ? person.type === "cp"
      ? `${window.location.origin}/${larpSlug}/cp/${person.slug}`
      : `${window.location.origin}/${larpSlug}/hrac/${person.slug}`
    : "";
  const cpHubUrl = larpSlug ? `${window.location.origin}/${larpSlug}/cp` : "";

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to={backLink} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />Zpět na seznam
          </Link>
          {person && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1 h-4 w-4" />Upravit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive">
                <Trash2 className="mr-1 h-4 w-4" />Smazat
              </Button>
            </div>
          )}
        </div>

        {loading || !person ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-typewriter text-2xl">{person.name}</CardTitle>
                  <Badge variant="outline">{person.type === "cp" ? "CP" : "Postava"}</Badge>
                  {person.group_name && <Badge variant="secondary">{person.group_name}</Badge>}
                </div>
                {person.performer && <p className="text-sm text-muted-foreground">Performer: {person.performer}</p>}
                {person.performance_times && <p className="text-sm text-muted-foreground">Časy: {person.performance_times}</p>}
              </CardHeader>
              {person.medailonek && (
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: person.medailonek }} />
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-typewriter text-lg">Portálové odkazy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <PortalLinkCard
                  label={person.type === "cp" ? "CP portál (individuální)" : "Hráčský portál"}
                  url={portalUrl}
                  hint="Hráč/CP se přihlásí heslem nastaveným u postavy."
                />
                {person.type === "cp" && (
                  <PortalLinkCard label="CP hub (přehled všech CP)" url={cpHubUrl} hint="Sdílený přístup pro všechny CP daného LARPu." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-typewriter text-lg">Související dokumenty</CardTitle>
                <Button size="sm" onClick={createPersonalDoc}>
                  <Plus className="mr-1 h-4 w-4" />Osobní dokument
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {docs.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">Žádné dokumenty.</p>
                ) : (
                  (["organizacni", "herni", "produkcni"] as const).map((cat) => grouped[cat].length > 0 && (
                    <section key={cat}>
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{CAT_LABEL[cat]}</h3>
                      <div className="space-y-1.5">
                        {grouped[cat].map((d) => (
                          <Link key={d.id} to={`/v2/larp/${larpSlug}/dokumenty/${d.id}`}
                            className="flex items-center gap-2 rounded border border-border p-2 transition-colors hover:border-primary">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <span className="flex-1 truncate text-sm">{d.title}</span>
                            {d.is_personal && <Badge variant="secondary" className="text-[10px]">osobní</Badge>}
                            {d.target_type === "skupina" && <Badge variant="outline" className="text-[10px]">skupina</Badge>}
                            {d.target_type === "vsichni" && <Badge variant="outline" className="text-[10px]">všichni</Badge>}
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {person && (
        <PersonFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          larpId={person.larp_id}
          type={person.type}
          person={person}
          onSaved={() => load()}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat „{person?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
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
