import { useCallback, useEffect, useState } from "react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CompactPortalLink } from "../components/CompactPortalLink";
import { InlineEditField } from "../components/InlineEditField";
import { InlineEditRich } from "../components/InlineEditRich";
import { ActiveRunAssignmentCard } from "../components/ActiveRunAssignmentCard";
import { PersonDocumentsList } from "../components/PersonDocumentsList";
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
  password_plain: string | null;
}

export default function V2PersonDetailPage() {
  const { larpSlug, personId } = useParams<{ larpSlug: string; personId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [larpName, setLarpName] = useState("");
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!personId || !larpSlug) return;
    setLoading(true);
    const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
    if (l) setLarpName(l.name);
    const { data: p } = await supabase.from("persons").select("*").eq("id", personId).maybeSingle();
    setPerson((p as PersonRow) ?? null);
    setLoading(false);
  }, [personId, larpSlug]);

  useEffect(() => { if (user) void load(); }, [user, load]);

  async function updateField(patch: Partial<PersonRow>) {
    if (!person) return;
    const { error } = await supabase.from("persons").update(patch).eq("id", person.id);
    if (error) { toast.error("Uložení selhalo: " + error.message); throw error; }
    setPerson({ ...person, ...patch });
    toast.success("Uloženo");
  }

  async function updatePassword(plain: string) {
    if (!person) return;
    // Trigger hash_person_password bcrypts password_hash. We also persist the
    // plain value so admins can read what they set.
    const { error } = await supabase.from("persons")
      .update({ password_hash: plain, password_plain: plain })
      .eq("id", person.id);
    if (error) throw error;
    setPerson({ ...person, password_plain: plain });
  }

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
    navigate(`/larp/${larpSlug}/dokumenty/${data.id}`);
  }

  async function confirmDelete() {
    if (!person) return;
    const { error } = await supabase.from("persons").delete().eq("id", person.id);
    if (error) { toast.error("Smazání selhalo"); return; }
    toast.success("Smazáno");
    navigate(`/larp/${larpSlug}/${person.type === "cp" ? "cp" : "postavy"}`);
  }

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/postavy/${personId}`} replace />;

  const backLink = person?.type === "cp" ? `/larp/${larpSlug}/cp` : `/larp/${larpSlug}/postavy`;
  const portalUrl = person && larpSlug
    ? person.type === "cp"
      ? `${window.location.origin}/${larpSlug}/cp/${person.slug}`
      : `${window.location.origin}/${larpSlug}/hrac/${person.slug}`
    : "";
  const cpHubUrl = larpSlug ? `${window.location.origin}/${larpSlug}/cp` : "";

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link to={backLink} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />Zpět na seznam
          </Link>
          {person && (
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive">
              <Trash2 className="mr-1 h-4 w-4" />Smazat
            </Button>
          )}
        </div>

        {loading || !person ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{person.type === "cp" ? "CP" : "Postava"}</Badge>
                  <InlineEditField
                    value={person.name}
                    onSave={(v) => updateField({ name: v.trim() || person.name })}
                    displayClassName="font-typewriter text-2xl"
                    inputClassName="text-2xl h-10"
                    ariaLabel="Jméno"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase tracking-wider">Skupina:</span>
                    <InlineEditField
                      value={person.group_name}
                      onSave={(v) => updateField({ group_name: v.trim() || null })}
                      emptyText="bez skupiny"
                      ariaLabel="Skupina"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase tracking-wider">Heslo do portálu:</span>
                    <InlineEditField
                      value={person.password_plain}
                      onSave={(v) => v.trim() ? updatePassword(v.trim()) : Promise.resolve()}
                      emptyText="nenastaveno"
                      ariaLabel="Heslo"
                    />
                  </div>
                  {person.type === "cp" && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs uppercase tracking-wider">Performer:</span>
                        <InlineEditField
                          value={person.performer}
                          onSave={(v) => updateField({ performer: v.trim() || null })}
                          emptyText="—"
                          ariaLabel="Performer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs uppercase tracking-wider">Časy:</span>
                        <InlineEditField
                          value={person.performance_times}
                          onSave={(v) => updateField({ performance_times: v.trim() || null })}
                          emptyText="—"
                          ariaLabel="Časy vystoupení"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <InlineEditRich
                  title="Medailonek"
                  value={person.medailonek}
                  onSave={(v) => updateField({ medailonek: v })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 pt-4">
                <CompactPortalLink
                  label={person.type === "cp" ? "CP portál (individuální)" : "Hráčský portál"}
                  url={portalUrl}
                  onSetPassword={updatePassword}
                />
                {person.type === "cp" && (
                  <CompactPortalLink label="CP hub" url={cpHubUrl} />
                )}
              </CardContent>
            </Card>

            <ActiveRunAssignmentCard personId={person.id} larpId={person.larp_id} personType={person.type} />

            <PersonDocumentsList
              larpSlug={larpSlug!}
              larpId={person.larp_id}
              personId={person.id}
              personName={person.name}
              personType={person.type}
              personGroupName={person.group_name}
              onCreatePersonal={createPersonalDoc}
            />
          </>
        )}
      </div>

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
