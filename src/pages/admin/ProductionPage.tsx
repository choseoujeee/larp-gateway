import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, ListChecks, FileStack, KeyRound, Copy, CalendarPlus } from "lucide-react";
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
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentEditDialog } from "@/components/admin/DocumentEditDialog";
import { SortableMaterialItem } from "@/components/admin/SortableMaterialItem";
import { SortableProductionDocItem } from "@/components/admin/SortableProductionDocItem";
import { DocBadge } from "@/components/ui/doc-badge";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { updateDocumentOrder } from "@/lib/documentUtils";

interface RunChecklistItem {
  id: string;
  run_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  checklist_group: string;
}

/** Materiál (odkaz, tiskovina) – production_materials */
interface ProductionMaterial {
  id: string;
  larp_id: string;
  run_id: string | null;
  material_type: "doc" | "audio" | "video" | "other";
  title: string;
  url: string | null;
  note: string | null;
  sort_order: number;
}

/** Produkční dokument (doc_type = produkční) – zobrazení v sekci Dokumenty */
interface ProductionDocument {
  id: string;
  larp_id: string;
  run_id: string | null;
  title: string;
  content: string | null;
  doc_type: "cp" | "herni" | "medailonek" | "organizacni" | "postava" | "produkční";
  target_type: "vsichni" | "skupina" | "osoba";
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number;
  visibility_mode: string;
  visible_days_before: number | null;
  visible_to_cp?: boolean;
}

export default function ProductionPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const { selectedRunId, runs } = useRunContext();
  const effectiveRunId = selectedRunId ?? (runs?.[0]?.id ?? null);
  const [materials, setMaterials] = useState<ProductionMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialDeleteDialogOpen, setMaterialDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<ProductionMaterial | null>(null);
  const [materialForm, setMaterialForm] = useState({
    material_type: "doc" as ProductionMaterial["material_type"],
    title: "",
    url: "",
    note: "",
    sort_order: 0,
    addToSchedule: false,
    // Vyplňuje se při zaškrtnutí „Přidat do harmonogramu“
    scheduleRunId: "",
    scheduleDayNumber: 1,
    scheduleStartTime: "09:00",
    scheduleDurationMinutes: 15,
    scheduleLocation: "",
  });
  const [materialSaving, setMaterialSaving] = useState(false);

  // Checklist před během
  const [checklistItems, setChecklistItems] = useState<RunChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistDeleteDialogOpen, setChecklistDeleteDialogOpen] = useState(false);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<RunChecklistItem | null>(null);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistGroup, setChecklistGroup] = useState("Hlavní");
  const [newGroupName, setNewGroupName] = useState("");
  const [checklistSaving, setChecklistSaving] = useState(false);

  // Produkční dokumenty (doc_type = produkční)
  const [productionDocs, setProductionDocs] = useState<ProductionDocument[]>([]);
  const [productionDocsLoading, setProductionDocsLoading] = useState(false);
  const [personsForDoc, setPersonsForDoc] = useState<{ id: string; name: string; group_name: string | null; type: "postava" }[]>([]);
  const [groupsForDoc, setGroupsForDoc] = useState<string[]>([]);
  const [documentEditOpen, setDocumentEditOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<ProductionDocument | null>(null);
  const [newDocumentDefaults, setNewDocumentDefaults] = useState<{ doc_type: "produkční"; run_id: string } | undefined>(undefined);
  const [productionDocDeleteDialogOpen, setProductionDocDeleteDialogOpen] = useState(false);
  const [productionDocToDelete, setProductionDocToDelete] = useState<ProductionDocument | null>(null);

  // Přístup k produkčnímu portálu (token + heslo pro tým)
  const [portalAccess, setPortalAccess] = useState<{ id: string; token: string } | null>(null);
  const [portalAccessLoading, setPortalAccessLoading] = useState(false);
  const [portalPasswordDialogOpen, setPortalPasswordDialogOpen] = useState(false);
  const [portalPassword, setPortalPassword] = useState("");
  const [portalNewPasswordDialogOpen, setPortalNewPasswordDialogOpen] = useState(false);
  const [portalNewPassword, setPortalNewPassword] = useState("");
  const [portalSaving, setPortalSaving] = useState(false);

  const fetchPortalAccess = async () => {
    if (!currentLarpId) return;
    setPortalAccessLoading(true);
    const runId = effectiveRunId ?? null;
    let query = supabase
      .from("production_portal_access")
      .select("id, token")
      .eq("larp_id", currentLarpId);
    if (runId) {
      query = query.eq("run_id", runId);
    } else {
      query = query.is("run_id", null);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      setPortalAccess(null);
    } else {
      setPortalAccess(data ? { id: data.id, token: data.token } : null);
    }
    setPortalAccessLoading(false);
  };

  const fetchMaterials = async () => {
    if (!currentLarpId) return;
    setMaterialsLoading(true);
    const { data, error } = await supabase
      .from("production_materials")
      .select("*")
      .eq("larp_id", currentLarpId)
      .order("sort_order", { ascending: true })
      .order("title");
    if (error) {
      toast.error("Chyba při načítání materiálů");
      setMaterials([]);
    } else {
      setMaterials((data as ProductionMaterial[]) ?? []);
    }
    setMaterialsLoading(false);
  };

  const fetchProductionDocs = async () => {
    if (!currentLarpId) return;
    setProductionDocsLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id, larp_id, run_id, title, doc_type, target_type, target_group, target_person_id, sort_order, priority")
      .eq("larp_id", currentLarpId)
      .eq("doc_type", "produkční")
      .order("sort_order", { ascending: true })
      .order("title");
    if (error) {
      toast.error("Chyba při načítání dokumentů");
      setProductionDocs([]);
    } else {
      setProductionDocs((data as ProductionDocument[]) ?? []);
    }
    setProductionDocsLoading(false);
  };

  const fetchPersonsAndGroups = async () => {
    if (!currentLarpId) return;
    const { data: personsData } = await supabase
      .from("persons")
      .select("id, name, group_name")
      .eq("larp_id", currentLarpId)
      .eq("type", "postava")
      .order("name");
    const persons = (personsData ?? []).map((p) => ({ ...p, type: "postava" as const }));
    setPersonsForDoc(persons);
    const names = [...new Set((personsData ?? []).map((p) => p.group_name).filter((g): g is string => g != null && g !== ""))].sort((a, b) => a.localeCompare(b, "cs"));
    setGroupsForDoc(names);
  };

  const fetchChecklist = async () => {
    if (!effectiveRunId) return;
    setChecklistLoading(true);
    const { data, error } = await supabase
      .from("run_checklist")
      .select("*")
      .eq("run_id", effectiveRunId)
      .order("sort_order", { ascending: true })
      .order("title");
    if (error) {
      toast.error("Chyba při načítání checklistu");
      setChecklistItems([]);
    } else {
      setChecklistItems((data as RunChecklistItem[]) ?? []);
    }
    setChecklistLoading(false);
  };

  useEffect(() => {
    if (currentLarpId) fetchMaterials();
  }, [currentLarpId]);

  useEffect(() => {
    if (currentLarpId) {
      fetchProductionDocs();
      fetchPersonsAndGroups();
    } else {
      setProductionDocs([]);
      setPersonsForDoc([]);
      setGroupsForDoc([]);
    }
  }, [currentLarpId]);

  useEffect(() => {
    if (effectiveRunId) fetchChecklist();
    else setChecklistItems([]);
  }, [effectiveRunId]);

  useEffect(() => {
    if (currentLarpId) fetchPortalAccess();
    else setPortalAccess(null);
  }, [currentLarpId, effectiveRunId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleMaterialsDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = materials.findIndex((m) => m.id === active.id);
      const newIndex = materials.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(materials, oldIndex, newIndex);
      setMaterials(reordered);
      for (let i = 0; i < reordered.length; i++) {
        const { error } = await supabase
          .from("production_materials")
          .update({ sort_order: i })
          .eq("id", reordered[i].id);
        if (error) {
          toast.error("Chyba při ukládání pořadí");
          fetchMaterials();
          return;
        }
      }
      toast.success("Pořadí uloženo");
    },
    [materials]
  );

  const handleCreatePortalAccess = async () => {
    const pwd = portalPassword.trim();
    if (!pwd || !currentLarpId) return;
    setPortalSaving(true);
    const { data, error } = await supabase.rpc("create_production_portal_access", {
      p_larp_id: currentLarpId,
      p_run_id: effectiveRunId ?? null,
      p_password: pwd,
    });
    setPortalSaving(false);
    if (error) {
      toast.error(error.message || "Chyba při vytváření přístupu");
      return;
    }
    if (data == null) {
      toast.error("Nemáte oprávnění nebo se nepodařilo vytvořit přístup.");
      return;
    }
    toast.success("Přístup vytvořen");
    setPortalPasswordDialogOpen(false);
    setPortalPassword("");
    fetchPortalAccess();
  };

  const handleSetPortalPassword = async () => {
    const pwd = portalNewPassword.trim();
    if (!pwd || !portalAccess) return;
    setPortalSaving(true);
    const { data, error } = await supabase.rpc("set_production_portal_password", {
      p_access_id: portalAccess.id,
      p_new_password: pwd,
    });
    setPortalSaving(false);
    if (error || data !== true) {
      toast.error("Chyba při změně hesla");
      return;
    }
    toast.success("Heslo změněno");
    setPortalNewPasswordDialogOpen(false);
    setPortalNewPassword("");
  };

  const handleCreatePortalNoPassword = async () => {
    if (!currentLarpId) return;
    setPortalSaving(true);
    const { data, error } = await supabase.rpc("create_production_portal_access_no_password" as any, {
      p_larp_id: currentLarpId,
      p_run_id: effectiveRunId ?? null,
    });
    setPortalSaving(false);
    if (error || data == null) {
      toast.error(error?.message || "Chyba při vytváření přístupu");
      return;
    }
    toast.success("Přístup bez hesla vytvořen");
    fetchPortalAccess();
  };

  const handleRemovePortalPassword = async () => {
    if (!portalAccess) return;
    setPortalSaving(true);
    const { data, error } = await supabase.rpc("remove_production_portal_password" as any, {
      p_access_id: portalAccess.id,
    });
    setPortalSaving(false);
    if (error || data !== true) {
      toast.error("Chyba při rušení hesla");
      return;
    }
    toast.success("Heslo zrušeno – portál je nyní bez hesla");
  };

  const portalUrl = portalAccess?.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/produkce-portal/${portalAccess.token}`
    : "";

  const copyPortalUrl = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success("Odkaz zkopírován");
  };

  const runsSafe = runs ?? [];

  const openCreateMaterial = () => {
    setSelectedMaterial(null);
    setMaterialForm({
      material_type: "doc",
      title: "",
      url: "",
      note: "",
      sort_order: materials.length,
      addToSchedule: false,
      scheduleRunId: effectiveRunId ?? runsSafe[0]?.id ?? "",
      scheduleDayNumber: 1,
      scheduleStartTime: "09:00",
      scheduleDurationMinutes: 15,
      scheduleLocation: "",
    });
    setMaterialDialogOpen(true);
  };

  const openEditMaterial = (item: ProductionMaterial) => {
    setSelectedMaterial(item);
    setMaterialForm({
      material_type: item.material_type,
      title: item.title,
      url: item.url ?? "",
      note: item.note ?? "",
      sort_order: item.sort_order,
      addToSchedule: false,
      scheduleRunId: effectiveRunId ?? runsSafe[0]?.id ?? "",
      scheduleDayNumber: 1,
      scheduleStartTime: "09:00",
      scheduleDurationMinutes: 15,
      scheduleLocation: "",
    });
    setMaterialDialogOpen(true);
  };

  /** Čas HH:MM → HH:MM:00 pro DB TIME */
  const normalizeTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

  const handleSaveMaterial = async () => {
    const title = materialForm.title.trim();
    if (!title) {
      toast.error("Vyplňte název");
      return;
    }
    if (materialForm.addToSchedule && !materialForm.scheduleRunId?.trim()) {
      toast.error("Vyberte běh pro harmonogram");
      return;
    }
    if (!currentLarpId) return;
    setMaterialSaving(true);
    const payload = {
      larp_id: currentLarpId,
      run_id: effectiveRunId ?? null,
      material_type: materialForm.material_type,
      title,
      url: materialForm.url.trim() || null,
      note: materialForm.note.trim() || null,
      sort_order: materialForm.sort_order,
    };
    let savedMaterialId: string | null = null;
    if (selectedMaterial) {
      const { error } = await supabase.from("production_materials").update(payload).eq("id", selectedMaterial.id);
      if (error) {
        toast.error("Chyba při ukládání");
        setMaterialSaving(false);
        return;
      }
      toast.success("Materiál upraven");
      savedMaterialId = selectedMaterial.id;
    } else {
      const { data, error } = await supabase.from("production_materials").insert(payload as never).select("id").single();
      if (error) {
        toast.error("Chyba při vytváření");
        setMaterialSaving(false);
        return;
      }
      toast.success("Materiál přidán");
      savedMaterialId = data?.id ?? null;
    }

    if (materialForm.addToSchedule && savedMaterialId && materialForm.scheduleRunId?.trim()) {
      const startTime = normalizeTime(materialForm.scheduleStartTime);
      const duration = Math.max(1, Math.min(480, materialForm.scheduleDurationMinutes || 15));
      const { error: scheduleError } = await supabase.from("schedule_events").insert({
        run_id: materialForm.scheduleRunId.trim(),
        day_number: materialForm.scheduleDayNumber,
        start_time: startTime,
        duration_minutes: duration,
        event_type: "material",
        title,
        material_id: savedMaterialId,
        location: materialForm.scheduleLocation.trim() || null,
      } as never);
      if (scheduleError) {
        toast.error("Materiál uložen, ale nepodařilo ho přidat do harmonogramu", { description: scheduleError.message });
      } else {
        toast.success("Materiál uložen a přidán do harmonogramu");
      }
    }

    setMaterialSaving(false);
    setMaterialDialogOpen(false);
    fetchMaterials();
  };

  const handleDeleteMaterial = async () => {
    if (!selectedMaterial) return;
    const { error } = await supabase.from("production_materials").delete().eq("id", selectedMaterial.id);
    if (error) toast.error("Chyba při mazání");
    else toast.success("Materiál smazán");
    setMaterialDeleteDialogOpen(false);
    setSelectedMaterial(null);
    fetchMaterials();
  };

  const MATERIAL_TYPE_LABELS: Record<ProductionMaterial["material_type"], string> = {
    doc: "Dokument",
    audio: "Audio",
    video: "Video",
    other: "Ostatní",
  };

  const checklistGroups = useMemo(() => {
    const groups = [...new Set(checklistItems.map((i) => i.checklist_group))];
    if (groups.length === 0) groups.push("Hlavní");
    return groups.sort((a, b) => a.localeCompare(b, "cs"));
  }, [checklistItems]);

  const openCreateChecklist = (group?: string) => {
    setSelectedChecklistItem(null);
    setChecklistTitle("");
    setChecklistGroup(group || checklistGroups[0] || "Hlavní");
    setChecklistDialogOpen(true);
  };

  const openEditChecklist = (item: RunChecklistItem) => {
    setSelectedChecklistItem(item);
    setChecklistTitle(item.title);
    setChecklistGroup(item.checklist_group);
    setChecklistDialogOpen(true);
  };

  const handleSaveChecklist = async () => {
    const title = checklistTitle.trim();
    if (!title) {
      toast.error("Vyplňte název úkolu");
      return;
    }
    if (!effectiveRunId) return;
    setChecklistSaving(true);
    if (selectedChecklistItem) {
      const { error } = await supabase
        .from("run_checklist")
        .update({ title, checklist_group: checklistGroup } as any)
        .eq("id", selectedChecklistItem.id);
      if (error) toast.error("Chyba při ukládání");
      else toast.success("Úkol upraven");
    } else {
      const groupItems = checklistItems.filter((i) => i.checklist_group === checklistGroup);
      const maxOrder = groupItems.length ? Math.max(...groupItems.map((i) => i.sort_order)) : 0;
      const { error } = await supabase.from("run_checklist").insert({
        run_id: effectiveRunId,
        title,
        completed: false,
        sort_order: maxOrder + 1,
        checklist_group: checklistGroup,
      } as any);
      if (error) toast.error("Chyba při vytváření");
      else toast.success("Úkol přidán");
    }
    setChecklistSaving(false);
    setChecklistDialogOpen(false);
    fetchChecklist();
  };

  const handleDeleteChecklist = async () => {
    if (!selectedChecklistItem) return;
    const { error } = await supabase.from("run_checklist").delete().eq("id", selectedChecklistItem.id);
    if (error) toast.error("Chyba při mazání");
    else toast.success("Úkol smazán");
    setChecklistDeleteDialogOpen(false);
    setSelectedChecklistItem(null);
    fetchChecklist();
  };

  const handleChecklistToggle = async (item: RunChecklistItem) => {
    const { error } = await supabase
      .from("run_checklist")
      .update({ completed: !item.completed })
      .eq("id", item.id);
    if (error) toast.error("Chyba při změně");
    else fetchChecklist();
  };

  const openCreateProductionDoc = () => {
    setDocumentToEdit(null);
    setNewDocumentDefaults({
      doc_type: "produkční",
      run_id: effectiveRunId ?? "__all__",
    });
    setDocumentEditOpen(true);
  };

  const openEditProductionDoc = async (docId: string) => {
    const { data, error } = await supabase.from("documents").select("*").eq("id", docId).single();
    if (error) {
      toast.error("Nepodařilo se načíst dokument");
      return;
    }
    setDocumentToEdit(data as ProductionDocument);
    setNewDocumentDefaults(undefined);
    setDocumentEditOpen(true);
  };

  const handleProductionDocSaved = () => {
    setDocumentEditOpen(false);
    setDocumentToEdit(null);
    setNewDocumentDefaults(undefined);
    fetchProductionDocs();
  };

  const handleProductionDocsDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = productionDocs.findIndex((d) => d.id === active.id);
      const newIndex = productionDocs.findIndex((d) => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(productionDocs, oldIndex, newIndex);
      setProductionDocs(reordered);
      const ok = await updateDocumentOrder(reordered.map((d) => ({ id: d.id })));
      if (!ok) fetchProductionDocs();
    },
    [productionDocs]
  );

  const handleDeleteProductionDoc = async () => {
    if (!productionDocToDelete) return;
    const { error } = await supabase.from("documents").delete().eq("id", productionDocToDelete.id);
    setProductionDocDeleteDialogOpen(false);
    setProductionDocToDelete(null);
    if (error) toast.error("Chyba při mazání");
    else toast.success("Dokument smazán");
    fetchProductionDocs();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Produkce</h1>
            <p className="text-muted-foreground">
              Materiály, odkazy a checklist pro LARP {currentLarp?.name}
            </p>
          </div>
        </div>

        {!currentLarpId ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nejprve vyberte LARP.</p>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <>
            {/* 0. Přístup k produkčnímu portálu – nahoře jako u jiných stránek */}
            <PaperCard>
              <PaperCardContent className="py-4">
                <h2 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Přístup k produkčnímu portálu
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Odkaz pro tým produkce – přístup k dokumentům, materiálům a checklistu bez přístupu do adminu.
                </p>
                {portalAccessLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : portalAccess ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input readOnly value={portalUrl} className="font-mono text-sm max-w-md" />
                      <Button variant="outline" size="sm" onClick={copyPortalUrl}>
                        <Copy className="h-4 w-4 mr-1" />
                        Zkopírovat
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPortalNewPasswordDialogOpen(true)}>
                        Změnit heslo
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleRemovePortalPassword}>
                        Zrušit heslo (bez hesla)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPortalPasswordDialogOpen(true)}>
                      Vytvořit přístup s heslem
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCreatePortalNoPassword}>
                      Vytvořit přístup bez hesla
                    </Button>
                  </div>
                )}
              </PaperCardContent>
            </PaperCard>

            {/* 1. Checklist před během */}
            {effectiveRunId && (
              <PaperCard>
                <PaperCardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-typewriter text-lg flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Checklist před během
                    </h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openCreateChecklist()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Přidat úkol
                      </Button>
                    </div>
                  </div>
                  {checklistLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : checklistItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Žádné úkoly. Přidejte např. nakoupit, vyzvednout věci, natankovat.</p>
                  ) : (
                    <div className={`grid gap-4 ${checklistGroups.length > 1 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : ""}`}>
                      {checklistGroups.map((group) => {
                        const groupItems = checklistItems.filter((i) => i.checklist_group === group);
                        if (groupItems.length === 0) return null;
                        return (
                          <div key={group} className={checklistGroups.length > 1 ? "border rounded-md p-3" : ""}>
                            {checklistGroups.length > 1 && (
                              <h3 className="font-typewriter text-sm tracking-wider uppercase mb-2 text-muted-foreground">{group}</h3>
                            )}
                            <ul className="space-y-2">
                              {groupItems.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center gap-3 py-2 px-3 rounded-md border bg-muted/20 hover:bg-muted/40 group/item"
                                >
                                  <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={() => handleChecklistToggle(item)}
                                    aria-label={item.title}
                                  />
                                  <span className={`flex-1 font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                                    {item.title}
                                  </span>
                                  <div className="flex gap-1 opacity-0 group-hover/item:opacity-100">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditChecklist(item)} title="Upravit">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedChecklistItem(item);
                                        setChecklistDeleteDialogOpen(true);
                                      }}
                                      title="Smazat"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            {checklistGroups.length > 1 && (
                              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => openCreateChecklist(group)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Přidat do {group}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PaperCardContent>
              </PaperCard>
            )}

            {/* 2. Dokumenty pro produkci */}
            <PaperCard>
              <PaperCardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-typewriter text-lg flex items-center gap-2">
                    <FileStack className="h-5 w-5" />
                    Dokumenty pro produkci
                  </h2>
                  <Button variant="outline" size="sm" onClick={openCreateProductionDoc} title="Vytvořit produkční dokument (nákupní seznam, sklad apod.)">
                    <Plus className="h-4 w-4 mr-1" />
                    Vytvořit dokument
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Nákupní seznamy, skladové zásoby, poznámky pro tým – zobrazí se v produkčním portálu. Klik na řádek otevře editaci, řádky lze přetahovat.
                </p>
                {productionDocsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : productionDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádné produkční dokumenty. Vytvořte např. nákupní seznam nebo skladové zásoby.</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleProductionDocsDragEnd}
                  >
                    <SortableContext items={productionDocs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
                        {productionDocs.map((doc) => (
                          <SortableProductionDocItem
                            key={doc.id}
                            doc={{ id: doc.id, title: doc.title, doc_type: doc.doc_type, sort_order: doc.sort_order }}
                            onEdit={() => openEditProductionDoc(doc.id)}
                            onDelete={() => { setProductionDocToDelete(doc); setProductionDocDeleteDialogOpen(true); }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </PaperCardContent>
            </PaperCard>

            {/* 3. Materiály */}
            <PaperCard>
              <PaperCardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-typewriter text-lg">Materiály</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openCreateMaterial}
                    disabled={!currentLarpId}
                    title="Přidat materiál (odkaz na soubor, tiskovinu atd.)"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Přidat materiál
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Odkazy na soubory (Drive), tiskoviny s poznámkou k tisku. Řádky lze přetahovat pro změnu pořadí.
                </p>
                {materialsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : materials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádné materiály. Přidejte odkaz na dokument, audio, video nebo tiskovinu.</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleMaterialsDragEnd}
                  >
                    <SortableContext items={materials.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1">
                        {materials.map((item) => (
                          <SortableMaterialItem
                            key={item.id}
                            item={item}
                            onEdit={() => openEditMaterial(item)}
                            onDelete={() => { setSelectedMaterial(item); setMaterialDeleteDialogOpen(true); }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </PaperCardContent>
            </PaperCard>
          </>
        )}

        {/* Portal access section removed from here – moved to top */}
      </div>

      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="paper-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedMaterial ? "Upravit materiál" : "Přidat materiál"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select
                value={materialForm.material_type}
                onValueChange={(v) => setMaterialForm({ ...materialForm, material_type: v as ProductionMaterial["material_type"] })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(MATERIAL_TYPE_LABELS) as [ProductionMaterial["material_type"], string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                className="input-vintage"
                placeholder="Např. Manuál organizace, Deník Opálka"
              />
            </div>
            <div className="space-y-2">
              <Label>URL (odkaz na soubor, volitelné)</Label>
              <Input
                value={materialForm.url}
                onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                className="input-vintage"
                placeholder="https://drive.google.com/…"
              />
            </div>
            <div className="space-y-2">
              <Label>Poznámka (např. jak tisknout – A4 barevně oboustran)</Label>
              <Textarea
                value={materialForm.note}
                onChange={(e) => setMaterialForm({ ...materialForm, note: e.target.value })}
                className="input-vintage"
                rows={2}
                placeholder="A4 barevně oboustran, 2 strany na list…"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="material-add-to-schedule"
                checked={materialForm.addToSchedule}
                onCheckedChange={(checked) => setMaterialForm({ ...materialForm, addToSchedule: !!checked })}
              />
              <Label htmlFor="material-add-to-schedule" className="flex items-center gap-1.5 font-normal cursor-pointer">
                <CalendarPlus className="h-4 w-4" />
                Přidat do harmonogramu
              </Label>
            </div>
            {materialForm.addToSchedule && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Kdy a jak dlouho v harmonogramu</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Běh</Label>
                    <Select
                      value={materialForm.scheduleRunId}
                      onValueChange={(v) => setMaterialForm((f) => ({ ...f, scheduleRunId: v }))}
                    >
                      <SelectTrigger className="input-vintage">
                        <SelectValue placeholder="Vyberte běh" />
                      </SelectTrigger>
                      <SelectContent>
                        {runsSafe.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Den</Label>
                    <Select
                      value={String(materialForm.scheduleDayNumber)}
                      onValueChange={(v) => setMaterialForm((f) => ({ ...f, scheduleDayNumber: parseInt(v, 10) }))}
                    >
                      <SelectTrigger className="input-vintage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                          <SelectItem key={d} value={String(d)}>Den {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Čas začátku</Label>
                    <Input
                      type="time"
                      value={materialForm.scheduleStartTime}
                      onChange={(e) => setMaterialForm((f) => ({ ...f, scheduleStartTime: e.target.value }))}
                      className="input-vintage"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Délka (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={materialForm.scheduleDurationMinutes}
                      onChange={(e) => setMaterialForm((f) => ({ ...f, scheduleDurationMinutes: parseInt(e.target.value, 10) || 15 }))}
                      className="input-vintage"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Lokace (volitelné)</Label>
                    <Input
                      value={materialForm.scheduleLocation}
                      onChange={(e) => setMaterialForm((f) => ({ ...f, scheduleLocation: e.target.value }))}
                      className="input-vintage"
                      placeholder="Např. hlavní sál"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSaveMaterial} disabled={materialSaving || !materialForm.title.trim()} className="btn-vintage">
              {materialSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={materialDeleteDialogOpen} onOpenChange={setMaterialDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat materiál?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat <strong>{selectedMaterial?.title}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaterial} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedChecklistItem ? "Upravit úkol" : "Přidat úkol"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Název úkolu</Label>
              <Input
                value={checklistTitle}
                onChange={(e) => setChecklistTitle(e.target.value)}
                className="input-vintage"
                placeholder="Např. Nakoupit potraviny, Vyzvednout kostýmy"
              />
            </div>
            <div className="space-y-2">
              <Label>Skupina (checklist)</Label>
              <div className="flex gap-2">
                <Select value={checklistGroup} onValueChange={setChecklistGroup}>
                  <SelectTrigger className="input-vintage flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {checklistGroups.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="input-vintage flex-1"
                  placeholder="Nová skupina..."
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!newGroupName.trim()}
                  onClick={() => {
                    setChecklistGroup(newGroupName.trim());
                    setNewGroupName("");
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Vytvořit
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSaveChecklist} disabled={checklistSaving || !checklistTitle.trim()}>
              {checklistSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={checklistDeleteDialogOpen} onOpenChange={setChecklistDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat úkol?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat <strong>{selectedChecklistItem?.title}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChecklist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={productionDocDeleteDialogOpen} onOpenChange={setProductionDocDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat dokument?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat <strong>{productionDocToDelete?.title}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProductionDoc} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          groups={groupsForDoc}
          runs={runsSafe}
          onSaved={handleProductionDocSaved}
          defaultValues={documentToEdit === null ? newDocumentDefaults : undefined}
        />
      )}

      <Dialog open={portalPasswordDialogOpen} onOpenChange={setPortalPasswordDialogOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Vytvořit přístup k produkčnímu portálu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Nastavte heslo pro tým produkce. Odkaz vygenerujeme po uložení.</p>
            <div className="space-y-2">
              <Label htmlFor="portal-password">Heslo</Label>
              <Input
                id="portal-password"
                type="password"
                value={portalPassword}
                onChange={(e) => setPortalPassword(e.target.value)}
                placeholder="Heslo pro přístup k portálu"
                disabled={portalSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPortalPasswordDialogOpen(false); setPortalPassword(""); }}>Zrušit</Button>
            <Button onClick={handleCreatePortalAccess} disabled={portalSaving || !portalPassword.trim()}>
              {portalSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Vytvořit přístup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={portalNewPasswordDialogOpen} onOpenChange={setPortalNewPasswordDialogOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Změnit heslo k produkčnímu portálu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="portal-new-password">Nové heslo</Label>
              <Input
                id="portal-new-password"
                type="password"
                value={portalNewPassword}
                onChange={(e) => setPortalNewPassword(e.target.value)}
                placeholder="Nové heslo"
                disabled={portalSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPortalNewPasswordDialogOpen(false); setPortalNewPassword(""); }}>Zrušit</Button>
            <Button onClick={handleSetPortalPassword} disabled={portalSaving || !portalNewPassword.trim()}>
              {portalSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Změnit heslo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
