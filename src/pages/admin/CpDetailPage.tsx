import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  User,
  FileText,
  Medal,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { CpSceneList, type CpScene } from "@/components/admin/CpSceneList";
import { DocumentEditDialog } from "@/components/admin/DocumentEditDialog";
import { SortableDocumentItem } from "@/components/admin/SortableDocumentItem";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { sortDocuments, updateDocumentOrder } from "@/lib/documentUtils";

interface CP {
  id: string;
  larp_id: string;
  slug: string;
  name: string;
  performer: string | null;
  performance_times: string | null;
  medailonek: string | null;
  mission_briefing: string | null;
  act_info: string | null;
}

interface Document {
  id: string;
  title: string;
  doc_type: string;
  target_type: string;
  target_group: string | null;
  target_person_id: string | null;
  priority: number;
  sort_order: number | null;
  visible_to_cp?: boolean;
  visibility_mode?: string;
  visible_days_before?: number | null;
}

interface PersonForDoc {
  id: string;
  name: string;
  group_name: string | null;
  type: string;
}

export default function CpDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { currentLarpId, currentLarp } = useLarpContext();
  const { selectedRunId, runs } = useRunContext();
  const runsSafe = runs ?? [];
  const selectedRun = runsSafe.find((r) => r.id === selectedRunId);

  const [cp, setCp] = useState<CP | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<CpScene[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [personsForDoc, setPersonsForDoc] = useState<PersonForDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [performerDialogOpen, setPerformerDialogOpen] = useState(false);
  const [performerValue, setPerformerValue] = useState("");
  /** Jména performerů/hráčů z minulých běhů téhož LARPu – pro rychlý výběr */
  const [pastRunPeopleNames, setPastRunPeopleNames] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medailonekDialogOpen, setMedailonekDialogOpen] = useState(false);
  const [documentEditOpen, setDocumentEditOpen] = useState(false);
  /** Dokument k editaci (null = nový dokument). Při kliku na dokument načteme celý a otevřeme dialog. */
  const [documentToEdit, setDocumentToEdit] = useState<{
    id: string;
    larp_id: string;
    run_id: string | null;
    title: string;
    content: string | null;
    doc_type: string;
    target_type: string;
    target_group: string | null;
    target_person_id: string | null;
    sort_order: number;
    priority: number;
    visibility_mode: string;
    visible_days_before: number | null;
    visible_to_cp?: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    performer: "",
  });
  const [richTextContent, setRichTextContent] = useState("");
  const slugRef = useRef(slug);

  // Drž ref v sync s URL, aby async fetch mohl zkontrolovat, jestli odpověď ještě platí
  slugRef.current = slug;

  const fetchCp = useCallback(async () => {
    if (!currentLarpId || !slug) return;

    const requestedSlug = slug;
    setFetchError(null);
    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .eq("larp_id", currentLarpId)
      .eq("slug", requestedSlug)
      .eq("type", "cp")
      .single();

    if (error || !data) {
      if (slugRef.current === requestedSlug) {
        setCp(null);
        setFetchError(error?.message ?? "Žádný záznam");
      }
      if (error) console.error("CpDetailPage fetchCp:", error);
      return;
    }

    // Aplikuj jen pokud uživatel mezitím nezměnil slug (race condition)
    if (slugRef.current !== requestedSlug) return;

    setCp(data as CP);
    setFormData({
      name: data.name,
      slug: data.slug,
      performer: data.performer || "",
    });
  }, [currentLarpId, slug]);

  const fetchScenes = async () => {
    if (!cp?.id || !selectedRunId) {
      setScenes([]);
      return;
    }

    const { data, error } = await supabase
      .from("cp_scenes")
      .select("*")
      .eq("cp_id", cp.id)
      .eq("run_id", selectedRunId)
      .order("day_number")
      .order("start_time");

    if (error) {
      console.error("Error fetching scenes:", error);
      return;
    }

    setScenes((data as CpScene[]) || []);
  };

  const fetchDocuments = async () => {
    if (!currentLarpId || !cp?.id) return;

    // Společné: skupina CP nebo vsichni s visible_to_cp; individuální: osoba pro tuto CP (hodnoty v uvozovkách pro PostgREST)
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, doc_type, target_type, target_group, target_person_id, priority, sort_order, visible_to_cp, visibility_mode, visible_days_before")
      .eq("larp_id", currentLarpId)
      .or(`and(target_type.eq."skupina",target_group.eq."CP"),and(target_type.eq."vsichni",visible_to_cp.eq.true),and(target_type.eq."osoba",target_person_id.eq."${cp.id}")`);

    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }

    setDocuments(sortDocuments(data || []));
  };

  useEffect(() => {
    if (!slug) {
      setCp(null);
      setLoading(false);
      setFetchError(null);
      return;
    }
    if (!currentLarpId) {
      setCp(null);
      setLoading(false);
      setFetchError("Není vybraný LARP.");
      return;
    }
    setCp(null);
    setLoading(true);
    setFetchError(null);
    fetchCp().finally(() => setLoading(false));
  }, [currentLarpId, slug, fetchCp]);

  const fetchPersonsForDoc = useCallback(async () => {
    if (!currentLarpId) return;
    const { data } = await supabase
      .from("persons")
      .select("id, name, group_name, type")
      .eq("larp_id", currentLarpId)
      .in("type", ["postava", "cp"])
      .order("name");
    setPersonsForDoc((data as PersonForDoc[]) || []);
  }, [currentLarpId]);

  useEffect(() => {
    if (currentLarpId) fetchPersonsForDoc();
  }, [currentLarpId, fetchPersonsForDoc]);

  /** Načte jména z minulých běhů téhož LARPu (pro výběr performera) */
  useEffect(() => {
    if (!currentLarpId || !runsSafe.length) {
      setPastRunPeopleNames([]);
      return;
    }
    const runIds = runsSafe.filter((r) => r.larp_id === currentLarpId).map((r) => r.id);
    if (runIds.length === 0) {
      setPastRunPeopleNames([]);
      return;
    }
    supabase
      .from("run_person_assignments")
      .select("player_name")
      .in("run_id", runIds)
      .then(({ data }) => {
        const names = [...new Set((data || []).map((r: { player_name: string | null }) => r.player_name?.trim()).filter(Boolean) as string[])].sort();
        setPastRunPeopleNames(names);
      });
  }, [currentLarpId, runsSafe]);

  useEffect(() => {
    if (cp?.id) {
      fetchScenes();
      fetchDocuments();
    }
  }, [cp?.id, selectedRunId]);

  const handleSaveBasic = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Vyplňte jméno a slug");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("persons")
      .update({
        name: formData.name,
        slug: formData.slug,
        performer: formData.performer || null,
      })
      .eq("id", cp?.id);

    if (error) {
      if (error.code === "23505") {
        toast.error("Slug už existuje");
      } else {
        toast.error("Chyba při ukládání");
      }
      setSaving(false);
      return;
    }

    if (cp?.id) {
      await supabase
        .from("run_person_assignments")
        .update({ player_name: formData.performer?.trim() || null })
        .eq("person_id", cp.id);
    }

    toast.success("CP upraveno");
    setSaving(false);
    setEditDialogOpen(false);

    // If slug changed, navigate to new URL
    if (formData.slug !== slug) {
      navigate(`/admin/cp/${formData.slug}`, { replace: true });
    } else {
      fetchCp();
    }
  };

  const handleSavePerformer = async () => {
    if (!cp?.id) return;
    setSaving(true);
    const value = performerValue.trim() || null;
    const { error } = await supabase
      .from("persons")
      .update({ performer: value })
      .eq("id", cp.id);
    if (error) {
      toast.error("Chyba při ukládání");
      setSaving(false);
      return;
    }
    await supabase
      .from("run_person_assignments")
      .update({ player_name: value })
      .eq("person_id", cp.id);
    setSaving(false);
    toast.success("Performer uložen");
    setPerformerDialogOpen(false);
    fetchCp();
  };

  const handleSaveRichText = async (field: "medailonek") => {
    setSaving(true);

    const { error } = await supabase
      .from("persons")
      .update({ [field]: richTextContent || null })
      .eq("id", cp?.id);

    if (error) {
      toast.error("Chyba při ukládání");
      setSaving(false);
      return;
    }

    toast.success("Uloženo");
    setSaving(false);
    setMedailonekDialogOpen(false);
    fetchCp();
  };

  const handleDelete = async () => {
    if (!cp) return;

    const { error } = await supabase.from("persons").delete().eq("id", cp.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("CP smazáno");
    navigate("/admin/cp", { replace: true });
  };

  const openRichTextDialog = (field: "medailonek", setOpen: (open: boolean) => void) => {
    setRichTextContent(cp?.[field] || "");
    setOpen(true);
  };

  const openNewDocumentDialog = () => {
    setDocumentToEdit(null);
    setDocumentEditOpen(true);
  };

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
    setDocumentToEdit(data);
    setDocumentEditOpen(true);
  };

  const handleDocumentSaved = () => {
    setDocumentEditOpen(false);
    setDocumentToEdit(null);
    fetchDocuments();
  };

  // Společné: jen skupina CP a vsichni s "Zobrazit i CP"; individuální: jen pro tuto CP
  const sharedDocs = documents.filter(
    (d) =>
      (d.target_type === "skupina" && d.target_group === "CP") ||
      (d.target_type === "vsichni" && d.visible_to_cp === true)
  );
  const individualDocs = documents.filter(
    (d) => d.target_type === "osoba" && d.target_person_id === cp?.id
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleIndividualDocsDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = individualDocs.findIndex((d) => d.id === active.id);
      const newIndex = individualDocs.findIndex((d) => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(individualDocs, oldIndex, newIndex);
      const success = await updateDocumentOrder(reordered.map((d) => ({ id: d.id })));
      if (success) fetchDocuments();
    },
    [individualDocs]
  );

  // Calculate run days
  const runDays = selectedRun?.date_from && selectedRun?.date_to
    ? Math.ceil(
        (new Date(selectedRun.date_to).getTime() - new Date(selectedRun.date_from).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 3;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!cp) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md">
          <p className="text-muted-foreground mb-2">
            CP se slugem &quot;{slug ?? "(neznámý)"}&quot; nebyla nalezena.
          </p>
          {fetchError && (
            <p className="text-sm text-muted-foreground/80 mb-4 font-mono">
              {fetchError}
            </p>
          )}
          <Button variant="outline" onClick={() => navigate("/admin/cp")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na přehled CP
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/cp")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-typewriter text-3xl tracking-wide">{cp.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <User className="h-4 w-4 flex-shrink-0" />
              <span>Hraje: {cp.performer || "—"}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setPerformerValue(cp.performer || "");
                  setPerformerDialogOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentLarp?.slug && (
              <>
                <Button variant="outline" asChild>
                  <a
                    href={`${window.location.origin}/cp/${currentLarp.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Portál všech CP
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={`${window.location.origin}/hrac/${cp.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Portál této CP
                  </a>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (cp) setFormData({ name: cp.name, slug: cp.slug, performer: cp.performer || "" });
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Upravit
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Smazat
            </Button>
          </div>
        </div>

        {/* Levý sloupec: Medailonek + Seznam scén (kompaktní). Pravý: široký seznam scén. */}
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            {/* Medailonek – kompaktní */}
            <PaperCard className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openRichTextDialog("medailonek", setMedailonekDialogOpen)}>
              <PaperCardContent className="py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-typewriter text-sm flex items-center gap-1.5">
                    <Medal className="h-3.5 w-3.5" />
                    Medailonek
                  </h3>
                  <Button
                    variant={cp.medailonek ? "default" : "destructive"}
                    size="sm"
                    className={cp.medailonek ? "h-7 text-xs bg-green-600 hover:bg-green-700" : "h-7 text-xs"}
                  >
                    {cp.medailonek ? "✓" : "✗"}
                  </Button>
                </div>
                {cp.medailonek ? (
                  <div
                    className="text-xs text-muted-foreground line-clamp-2 prose-sm prose-p:my-0.5"
                    dangerouslySetInnerHTML={{ __html: cp.medailonek }}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground italic">Klikni pro přidání</p>
                )}
              </PaperCardContent>
            </PaperCard>
          </div>

          {/* Široký blok scén (úpravy, přetahování) */}
          {selectedRunId ? (
            <PaperCard>
              <PaperCardContent className="py-4">
                <CpSceneList
                  scenes={scenes}
                  cpId={cp.id}
                  runId={selectedRunId}
                  runDays={runDays}
                  onScenesChange={fetchScenes}
                />
              </PaperCardContent>
            </PaperCard>
          ) : (
            <PaperCard>
              <PaperCardContent className="py-8 text-center text-muted-foreground">
                Vyberte běh pro zobrazení scén
              </PaperCardContent>
            </PaperCard>
          )}
        </div>

        {/* Documents section – stejné chování jako /dokumenty: edit na klik, tagy vpravo, vlevo grip (DnD jen u individuálních) */}
        <div className="space-y-4">
          {sharedDocs.length > 0 && (
            <PaperCard>
              <PaperCardContent className="py-4">
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dokumenty společné
                </h3>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={() => {}}>
                  <SortableContext items={sharedDocs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {sharedDocs.map((doc) => (
                        <SortableDocumentItem
                          key={doc.id}
                          doc={doc as never}
                          persons={personsForDoc}
                          runs={runsSafe}
                          hiddenFromPersons={[]}
                          showDocType
                          clickableRow
                          disableDrag
                          onEdit={() => openEditDocumentDialog(doc.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </PaperCardContent>
            </PaperCard>
          )}

          {/* Dokumenty individuální – vždy zobrazena sekce s tlačítkem Nový dokument */}
          <PaperCard>
            <PaperCardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-typewriter text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dokumenty individuální
                </h3>
                <Button variant="outline" size="sm" onClick={openNewDocumentDialog}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nový dokument
                </Button>
              </div>
              {individualDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Žádné individuální dokumenty. Vytvořte dokument přímo pro tuto CP.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleIndividualDocsDragEnd}
                >
                  <SortableContext
                    items={individualDocs.map((d) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {individualDocs.map((doc) => (
                        <SortableDocumentItem
                          key={doc.id}
                          doc={doc as never}
                          persons={personsForDoc}
                          runs={runsSafe}
                          hiddenFromPersons={[]}
                          showDocType
                          clickableRow
                          onEdit={() => openEditDocumentDialog(doc.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </PaperCardContent>
          </PaperCard>

          {sharedDocs.length === 0 && (
            <PaperCard>
              <PaperCardContent className="py-4 text-center text-muted-foreground">
                <p className="text-sm">Společné dokumenty (pro všechny / skupinu CP) nastavíte na stránce Dokumenty.</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/admin/dokumenty")}
                  className="mt-2"
                >
                  Přejít na dokumenty
                </Button>
              </PaperCardContent>
            </PaperCard>
          )}
        </div>
      </div>

      {/* Edit Basic Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="paper-card">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Upravit CP</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jméno CP / role</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tajemný cizinec"
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="tajemny-cizinec"
                className="input-vintage font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Performer (kdo hraje)</Label>
              <Input
                value={formData.performer}
                onChange={(e) => setFormData({ ...formData, performer: e.target.value })}
                placeholder="Jméno herce/herečky"
                className="input-vintage"
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveBasic} disabled={saving} className="btn-vintage">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performer – rychlé přiřazení přímo z hlavičky */}
      <Dialog open={performerDialogOpen} onOpenChange={setPerformerDialogOpen}>
        <DialogContent className="paper-card">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Přiřadit performera</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pastRunPeopleNames.length > 0 && (
              <div className="space-y-2">
                <Label>Vybrat z minulých běhů</Label>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v) setPerformerValue(v);
                  }}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="— Vybrat jméno z předchozích běhů —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Ručně vyplnit —</SelectItem>
                    {pastRunPeopleNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Kdo hraje tuto CP</Label>
              <Input
                value={performerValue}
                onChange={(e) => setPerformerValue(e.target.value)}
                placeholder="Jméno herce/herečky"
                className="input-vintage"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPerformerDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSavePerformer} disabled={saving} className="btn-vintage">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rich Text Dialogs */}
      <Dialog open={medailonekDialogOpen} onOpenChange={setMedailonekDialogOpen}>
        <DialogContent className="paper-card max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Medailonek</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RichTextEditor value={richTextContent} onChange={setRichTextContent} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMedailonekDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={() => handleSaveRichText("medailonek")} disabled={saving} className="btn-vintage">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nový dokument (individuální pro tuto CP) */}
      {currentLarpId && cp && (
        <DocumentEditDialog
          open={documentEditOpen}
          onOpenChange={(open) => {
            setDocumentEditOpen(open);
            if (!open) setDocumentToEdit(null);
          }}
          document={documentToEdit}
          larpId={currentLarpId}
          persons={personsForDoc}
          groups={[...new Set(personsForDoc.map((p) => p.group_name).filter(Boolean))] as string[]}
          runs={runs}
          onSaved={handleDocumentSaved}
          defaultValues={{
            target_type: "osoba",
            target_person_id: cp.id,
            doc_type: "cp",
          }}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat CP?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat CP <strong>{cp.name}</strong>? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
