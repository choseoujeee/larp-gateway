import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, FileText, Users, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentEditDialog } from "@/components/admin/DocumentEditDialog";
import { DocBadge } from "@/components/ui/doc-badge";
import { DOCUMENT_TYPES } from "@/lib/constants";

interface Person {
  id: string;
  name: string;
  slug: string;
  group_name: string | null;
}

interface GroupDocument {
  id: string;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: string;
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number;
  run_id: string | null;
  larp_id: string;
  visibility_mode: string;
  visible_days_before: number | null;
  visible_to_cp?: boolean;
}

/** Výchozí hodnoty pro nový dokument (např. skupinový s typem herní) */
interface NewDocumentDefaults {
  target_type: "skupina";
  target_group: string;
  doc_type: keyof typeof DOCUMENT_TYPES;
  run_id?: string;
}

/** Slug z názvu skupiny – stejná normalizace jako u postav */
function slugifyGroupName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { currentLarpId } = useLarpContext();
  const { runs, selectedRunId } = useRunContext();
  const runsSafe = runs ?? [];

  const [persons, setPersons] = useState<Person[]>([]);
  const [groupDocuments, setGroupDocuments] = useState<GroupDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentEditOpen, setDocumentEditOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<GroupDocument | null>(null);
  /** Předvyplnění pro nový dokument (např. skupinový herní z detailu skupiny) */
  const [newDocumentDefaults, setNewDocumentDefaults] = useState<NewDocumentDefaults | undefined>(undefined);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [createGroupSaving, setCreateGroupSaving] = useState(false);

  const fetchPersons = async () => {
    if (!currentLarpId) return;
    const { data, error } = await supabase
      .from("persons")
      .select("id, name, slug, group_name")
      .eq("larp_id", currentLarpId)
      .eq("type", "postava")
      .order("name");
    if (error) {
      toast.error("Chyba při načítání postav");
      setPersons([]);
      return;
    }
    setPersons((data as Person[]) ?? []);
  };

  const fetchGroupDocuments = async () => {
    if (!currentLarpId) return;
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, content, doc_type, target_type, target_group, target_person_id, sort_order, priority, run_id, larp_id, visibility_mode, visible_days_before, visible_to_cp")
      .eq("larp_id", currentLarpId)
      .eq("target_type", "skupina")
      .not("target_group", "is", null)
      .order("priority")
      .order("sort_order");
    if (error) {
      setGroupDocuments([]);
      return;
    }
    setGroupDocuments((data as GroupDocument[]) ?? []);
  };

  useEffect(() => {
    if (currentLarpId) {
      setLoading(true);
      Promise.all([fetchPersons(), fetchGroupDocuments()]).finally(() =>
        setLoading(false)
      );
    } else {
      setLoading(false);
    }
  }, [currentLarpId]);

  const groups = useMemo(() => {
    const fromPersons = persons.map((p) => p.group_name).filter((g): g is string => g != null && g !== "");
    const fromDocs = groupDocuments.map((d) => d.target_group).filter((g): g is string => g != null && g !== "");
    const names = [...new Set([...fromPersons, ...fromDocs])].sort((a, b) => a.localeCompare(b, "cs"));
    return names;
  }, [persons, groupDocuments]);

  const memberCountByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of persons) {
      if (p.group_name) {
        map[p.group_name] = (map[p.group_name] ?? 0) + 1;
      }
    }
    return map;
  }, [persons]);

  const docCountByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of groupDocuments) {
      const g = d.target_group;
      if (g) map[g] = (map[g] ?? 0) + 1;
    }
    return map;
  }, [groupDocuments]);

  const selectedGroupName = useMemo(() => {
    if (!groupSlug) return null;
    const found = groups.find((g) => slugifyGroupName(g) === groupSlug);
    return found ?? null;
  }, [groupSlug, groups]);

  useEffect(() => {
    if (groupSlug && !loading && groups.length > 0 && selectedGroupName === null) {
      navigate("/admin/skupiny", { replace: true });
    }
  }, [groupSlug, loading, groups.length, selectedGroupName, navigate]);

  const membersOfSelectedGroup = useMemo(() => {
    if (!selectedGroupName) return [];
    return persons.filter((p) => p.group_name === selectedGroupName);
  }, [persons, selectedGroupName]);

  const documentsOfSelectedGroup = useMemo(() => {
    if (!selectedGroupName) return [];
    return groupDocuments.filter((d) => d.target_group === selectedGroupName);
  }, [groupDocuments, selectedGroupName]);

  const openEditDocumentDialog = async (docId: string) => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", docId)
      .single();
    if (error) {
      toast.error("Nepodařilo se načíst dokument");
      return;
    }
    setDocumentToEdit(data as GroupDocument);
    setNewDocumentDefaults(undefined);
    setDocumentEditOpen(true);
  };

  const handleDocumentSaved = () => {
    setDocumentEditOpen(false);
    setDocumentToEdit(null);
    setNewDocumentDefaults(undefined);
    fetchGroupDocuments();
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error("Zadejte název skupiny");
      return;
    }
    if (!currentLarpId) return;
    setCreateGroupSaving(true);
    const { error } = await supabase.from("documents").insert({
      larp_id: currentLarpId,
      run_id: selectedRunId ?? null,
      title: "Úvod",
      content: "",
      doc_type: "herni",
      target_type: "skupina",
      target_group: name,
      sort_order: 0,
      priority: 2,
      visibility_mode: "immediate",
      visible_days_before: null,
    });
    setCreateGroupSaving(false);
    if (error) {
      toast.error("Chyba při vytváření skupiny");
      return;
    }
    toast.success("Skupina vytvořena");
    setCreateGroupDialogOpen(false);
    setNewGroupName("");
    await fetchGroupDocuments();
    navigate(`/admin/skupiny/${slugifyGroupName(name)}`);
  };

  const personsForDoc = useMemo(
    () =>
      persons.map((p) => ({
        id: p.id,
        name: p.name,
        group_name: p.group_name,
        type: "postava" as const,
      })),
    [persons]
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!currentLarpId) {
    return (
      <AdminLayout>
        <PaperCard>
          <PaperCardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nejprve vyberte LARP</p>
          </PaperCardContent>
        </PaperCard>
      </AdminLayout>
    );
  }

  if (selectedGroupName) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/skupiny")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-typewriter text-3xl tracking-wide">{selectedGroupName}</h1>
              <p className="text-muted-foreground mt-1">
                {membersOfSelectedGroup.length} členů · {documentsOfSelectedGroup.length} dokumentů
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <PaperCard>
              <PaperCardContent className="py-4">
                <h3 className="font-typewriter text-sm flex items-center gap-1.5 mb-3">
                  <Users className="h-4 w-4" />
                  Členové skupiny
                </h3>
                {membersOfSelectedGroup.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádní členové</p>
                ) : (
                  <ul className="space-y-1.5">
                    {membersOfSelectedGroup.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={`/admin/osoby/${p.slug}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </PaperCardContent>
            </PaperCard>

            <PaperCard>
              <PaperCardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-typewriter text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Skupinové dokumenty
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDocumentToEdit(null);
                      setNewDocumentDefaults({
                        target_type: "skupina",
                        target_group: selectedGroupName,
                        doc_type: "herni",
                        run_id: selectedRunId ?? "__all__",
                      });
                      setDocumentEditOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nový dokument
                  </Button>
                </div>
                {documentsOfSelectedGroup.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Žádné dokumenty cílené na tuto skupinu. Přidejte dokument tlačítkem „Nový dokument“ nebo na stránce Dokumenty s cílením „Konkrétní skupině“.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documentsOfSelectedGroup.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/20 hover:bg-muted/40 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{doc.title}</span>
                          <DocBadge type={doc.doc_type as keyof typeof DOCUMENT_TYPES} />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          onClick={() => openEditDocumentDialog(doc.id)}
                          title="Upravit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>
          </div>
        </div>

        {currentLarpId && (
          <DocumentEditDialog
            open={documentEditOpen}
            onOpenChange={(open) => {
              setDocumentEditOpen(open);
              if (!open) {
                setDocumentToEdit(null);
                setNewDocumentDefaults(undefined);
              }
            }}
            document={documentToEdit}
            larpId={currentLarpId}
            persons={personsForDoc}
            groups={groups}
            runs={runsSafe}
            onSaved={handleDocumentSaved}
            defaultValues={documentToEdit === null ? newDocumentDefaults : undefined}
          />
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Skupiny</h1>
            <p className="text-muted-foreground">
              Skupiny hráčů odvozené z pole Skupina u postav. Kliknutím zobrazíte členy a skupinové
              dokumenty.
            </p>
          </div>
          <Button onClick={() => setCreateGroupDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Vytvořit skupinu
          </Button>
        </div>

        {groups.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-2">Tento LARP zatím nemá žádné skupiny</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Skupiny vznikají z pole „Skupina“ u postav na stránce Postavy. Vyplňte skupinu u
                hráčů a zde se objeví odpovídající karty.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/admin/osoby")}
              >
                Přejít na Postavy
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((groupName) => (
              <PaperCard
                key={groupName}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/skupiny/${slugifyGroupName(groupName)}`)}
              >
                <PaperCardContent className="py-4">
                  <h3 className="font-typewriter text-lg font-medium mb-2">{groupName}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {memberCountByGroup[groupName] ?? 0} členů
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {docCountByGroup[groupName] ?? 0} dok
                    </span>
                  </div>
                </PaperCardContent>
              </PaperCard>
            ))}
          </div>
        )}

        <Dialog open={createGroupDialogOpen} onOpenChange={setCreateGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nová skupina</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-group-name">Název skupiny</Label>
                <Input
                  id="new-group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="např. Jednotka A"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Vytvoří se skupina a jeden herní dokument „Úvod“, který můžete upravit na stránce skupiny.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateGroupDialogOpen(false)} disabled={createGroupSaving}>
                Zrušit
              </Button>
              <Button onClick={handleCreateGroup} disabled={createGroupSaving || !newGroupName.trim()}>
                {createGroupSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {createGroupSaving ? " Vytvářím…" : "Vytvořit skupinu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
