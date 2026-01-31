import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Loader2, Users, ArrowLeft, User, FileText, ExternalLink, Medal, Check, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DocumentEditDialog } from "@/components/admin/DocumentEditDialog";
import { DOCUMENT_TYPES, TARGET_TYPES } from "@/lib/constants";
import { sortDocuments, updateDocumentOrder } from "@/lib/documentUtils";

interface Person {
  id: string;
  larp_id: string;
  slug: string;
  name: string;
  group_name: string | null;
  medailonek: string | null;
}

interface PersonDocument {
  id: string;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: keyof typeof TARGET_TYPES;
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number;
  run_id: string | null;
  visibility_mode: string;
  visible_days_before: number | null;
  larp_id: string;
}

interface AllPerson {
  id: string;
  name: string;
  group_name: string | null;
  type: string;
}

interface Assignment {
  person_id: string;
  player_name: string | null;
  player_email: string | null;
}

export default function PersonsPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { currentLarpId, currentLarp } = useLarpContext();
  const { selectedRunId, runs } = useRunContext();
  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const [persons, setPersons] = useState<Person[]>([]);
  const [allPersons, setAllPersons] = useState<AllPerson[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medailonekDialogOpen, setMedailonekDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"byGroup" | "alphabetical">("byGroup");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    group_name: "",
    password: "",
  });
  const [medailonekContent, setMedailonekContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);
  const [personDocuments, setPersonDocuments] = useState<PersonDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [personDocCounts, setPersonDocCounts] = useState<Record<string, { organizacni: number; herni: number; postava: number }>>({});
  
  // Document editing state
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PersonDocument | null>(null);
  const [newDocumentDefaults, setNewDocumentDefaults] = useState<{ target_type: "osoba"; target_person_id: string } | undefined>(undefined);

  const fetchPersons = async () => {
    if (!currentLarpId) return;
    
    const { data, error } = await supabase
      .from("persons")
      .select("id, larp_id, slug, name, group_name, medailonek")
      .eq("larp_id", currentLarpId)
      .eq("type", "postava")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast.error("Chyba při načítání postav");
      return;
    }

    setPersons(data || []);
    setLoading(false);
  };

  const fetchAllPersonsAndGroups = async () => {
    if (!currentLarpId) return;

    const { data } = await supabase
      .from("persons")
      .select("id, name, group_name, type")
      .eq("larp_id", currentLarpId)
      .order("name");

    setAllPersons(data || []);
    
    // Extract unique groups
    const uniqueGroups = [...new Set(
      (data || [])
        .map((p) => p.group_name)
        .filter((g): g is string => g !== null)
    )];
    setGroups(uniqueGroups);
  };

  const fetchAssignments = async () => {
    if (!selectedRunId) {
      setAssignments([]);
      return;
    }
    const { data } = await supabase
      .from("run_person_assignments")
      .select("person_id, player_name, player_email")
      .eq("run_id", selectedRunId);
    setAssignments((data as Assignment[]) || []);
  };

  const fetchPersonDocuments = async (personId: string, groupName: string | null) => {
    if (!currentLarpId) return;
    setLoadingDocuments(true);
    
    // Fetch ALL document fields so we can edit them
    let query = supabase
      .from("documents")
      .select("*")
      .eq("larp_id", currentLarpId);
    
    // Build OR condition for visibility
    const orConditions = ["target_type.eq.vsichni"];
    if (groupName) {
      orConditions.push(`and(target_type.eq.skupina,target_group.eq.${groupName})`);
    }
    orConditions.push(`and(target_type.eq.osoba,target_person_id.eq.${personId})`);
    
    const { data: docs, error } = await query.or(orConditions.join(","));
    
    if (error) {
      console.error("Error fetching person documents:", error);
      setPersonDocuments([]);
    } else {
      // Now filter out hidden documents
      const { data: hiddenDocs } = await supabase
        .from("hidden_documents")
        .select("document_id")
        .eq("person_id", personId);
      
      const hiddenIds = new Set((hiddenDocs || []).map(h => h.document_id));
      const visibleDocs = (docs || []).filter(d => !hiddenIds.has(d.id));
      // Sort by priority then sort_order
      setPersonDocuments(sortDocuments(visibleDocs as PersonDocument[]));
    }
    setLoadingDocuments(false);
  };

  const fetchPersonDocCounts = async () => {
    if (!currentLarpId || persons.length === 0) return;
    
    // Fetch all documents for this larp
    const { data: docs } = await supabase
      .from("documents")
      .select("id, doc_type, target_type, target_group, target_person_id")
      .eq("larp_id", currentLarpId);
    
    if (!docs) return;
    
    // Calculate counts per person
    const counts: Record<string, { organizacni: number; herni: number; postava: number }> = {};
    
    for (const person of persons) {
      counts[person.id] = { organizacni: 0, herni: 0, postava: 0 };
      
      for (const doc of docs) {
        // Check if document is visible to this person
        const isVisible = 
          doc.target_type === "vsichni" ||
          (doc.target_type === "skupina" && doc.target_group === person.group_name) ||
          (doc.target_type === "osoba" && doc.target_person_id === person.id);
        
        if (isVisible && (doc.doc_type === "organizacni" || doc.doc_type === "herni" || doc.doc_type === "postava")) {
          counts[person.id][doc.doc_type as "organizacni" | "herni" | "postava"]++;
        }
      }
    }
    
    setPersonDocCounts(counts);
  };

  useEffect(() => {
    if (currentLarpId) {
      setLoading(true);
      fetchPersons();
      fetchAllPersonsAndGroups();
    }
  }, [currentLarpId]);

  useEffect(() => {
    if (persons.length > 0 && currentLarpId) {
      fetchPersonDocCounts();
    }
  }, [persons, currentLarpId]);

  useEffect(() => {
    fetchAssignments();
  }, [selectedRunId]);

  // Handle detail view from URL param
  useEffect(() => {
    if (slug && persons.length > 0) {
      const person = persons.find((p) => p.slug === slug);
      if (person) {
        setDetailPerson(person);
        fetchPersonDocuments(person.id, person.group_name);
      } else {
        navigate("/admin/osoby", { replace: true });
      }
    } else if (!slug) {
      setDetailPerson(null);
      setPersonDocuments([]);
    }
  }, [slug, persons, navigate, currentLarpId]);

  const handleDocumentSaved = () => {
    if (detailPerson) {
      fetchPersonDocuments(detailPerson.id, detailPerson.group_name);
    }
  };

  const openDocumentEditDialog = (doc: PersonDocument) => {
    setEditingDocument(doc);
    setNewDocumentDefaults(undefined);
    setDocumentDialogOpen(true);
  };

  const openNewIndividualDocumentDialog = () => {
    if (!detailPerson) return;
    setEditingDocument(null);
    setNewDocumentDefaults({
      target_type: "osoba",
      target_person_id: detailPerson.id,
    });
    setDocumentDialogOpen(true);
  };

  const getAssignment = (personId: string) => assignments.find((a) => a.person_id === personId);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const openCreateDialog = () => {
    setSelectedPerson(null);
    setFormData({ name: "", slug: "", group_name: "", password: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (person: Person, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedPerson(person);
    setFormData({
      name: person.name,
      slug: person.slug,
      group_name: person.group_name || "",
      password: "",
    });
    setDialogOpen(true);
  };

  const openMedailonekDialog = (person: Person) => {
    setSelectedPerson(person);
    setMedailonekContent(person.medailonek || "");
    setMedailonekDialogOpen(true);
  };

  const handleSaveMedailonek = async () => {
    if (!selectedPerson) return;
    setSaving(true);

    const { error } = await supabase
      .from("persons")
      .update({ medailonek: medailonekContent || null })
      .eq("id", selectedPerson.id);

    if (error) {
      toast.error("Chyba při ukládání medailonku");
      setSaving(false);
      return;
    }

    toast.success("Medailonek uložen");
    setSaving(false);
    setMedailonekDialogOpen(false);
    fetchPersons();
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Vyplňte jméno a slug");
      return;
    }

    if (!selectedPerson && !formData.password) {
      toast.error("Zadejte heslo pro novou postavu");
      return;
    }

    setSaving(true);

    if (selectedPerson) {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        slug: formData.slug,
        group_name: formData.group_name || null,
      };

      if (formData.password) {
        updateData.password_hash = formData.password;
      }

      const { error } = await supabase
        .from("persons")
        .update(updateData)
        .eq("id", selectedPerson.id);

      if (error) {
        toast.error("Chyba při ukládání");
        setSaving(false);
        return;
      }
      toast.success("Postava upravena");
    } else {
      const { error } = await supabase.from("persons").insert({
        larp_id: currentLarpId,
        type: "postava" as const,
        name: formData.name,
        slug: formData.slug,
        group_name: formData.group_name || null,
        password_hash: formData.password,
      } as never);
      if (error) {
        if (error.code === "23505") {
          toast.error("Slug už existuje v tomto LARPu");
        } else {
          toast.error("Chyba při vytváření");
        }
        setSaving(false);
        return;
      }
      toast.success("Postava vytvořena");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchPersons();
  };

  const handleDelete = async () => {
    if (!selectedPerson) return;

    const { error } = await supabase.from("persons").delete().eq("id", selectedPerson.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Postava smazána");
    setDeleteDialogOpen(false);
    if (detailPerson?.id === selectedPerson.id) {
      navigate("/admin/osoby", { replace: true });
    }
    fetchPersons();
  };

  const handleCardClick = (person: Person) => {
    navigate(`/admin/osoby/${person.slug}`);
  };

  const filteredPersons = persons.filter((p) => {
    // Text search
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    // Group filter
    const matchesGroup =
      filterGroup === "all" ||
      (filterGroup === "none" && !p.group_name) ||
      p.group_name === filterGroup;
    
    return matchesSearch && matchesGroup;
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent, sectionDocs: PersonDocument[], sectionKey: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = sectionDocs.findIndex((d) => d.id === active.id);
    const newIndex = sectionDocs.findIndex((d) => d.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const newOrder = arrayMove(sectionDocs, oldIndex, newIndex);
    
    // Optimistic UI update
    setPersonDocuments((prev) => {
      const docIds = new Set(newOrder.map((d) => d.id));
      const otherDocs = prev.filter((d) => !docIds.has(d.id));
      const reorderedDocs = newOrder.map((doc, idx) => ({
        ...doc,
        sort_order: idx,
      }));
      return sortDocuments([...otherDocs, ...reorderedDocs]);
    });
    
    // Persist to database
    await updateDocumentOrder(newOrder);
  }, []);

  // Sortable document row component
  const SortableDocumentRow = ({ doc, onClick }: { doc: PersonDocument; onClick: () => void }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: doc.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 10 : undefined,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-stretch"
      >
        {/* Drag handle */}
        <button
          type="button"
          className="flex-shrink-0 flex items-center justify-center w-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l-md border border-r-0 border-border bg-muted/20 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        {/* Document content */}
        <div
          className="flex-1 flex items-center justify-between p-2 rounded-r-md border border-l-0 border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors group min-w-0"
          onClick={onClick}
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{doc.title}</span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span className="px-2 py-0.5 rounded bg-muted">
              {doc.doc_type === "organizacni" && "Organizační"}
              {doc.doc_type === "herni" && "Herní"}
              {doc.doc_type === "postava" && "Postava"}
              {doc.doc_type === "medailonek" && "Medailonek"}
              {doc.doc_type === "cp" && "CP"}
            </span>
            {doc.priority === 1 && (
              <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
                Prioritní
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Sortable section wrapper
  const SortableDocumentSection = ({ 
    docs, 
    sectionKey 
  }: { 
    docs: PersonDocument[];
    sectionKey: string;
  }) => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => handleDragEnd(event, docs, sectionKey)}
    >
      <SortableContext items={docs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {docs.map((doc) => (
            <SortableDocumentRow key={doc.id} doc={doc} onClick={() => openDocumentEditDialog(doc)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Group by group name or show alphabetically
  const groupedPersons = viewMode === "byGroup"
    ? filteredPersons.reduce((acc, person) => {
        const group = person.group_name || "Bez skupiny";
        if (!acc[group]) acc[group] = [];
        acc[group].push(person);
        return acc;
      }, {} as Record<string, Person[]>)
    : { "Všechny postavy": [...filteredPersons].sort((a, b) => a.name.localeCompare(b.name, "cs")) };

  // Memoized document sections for detail view
  const docsVsichni = useMemo(() => 
    sortDocuments(personDocuments.filter(d => d.target_type === "vsichni")),
    [personDocuments]
  );
  const docsSkupina = useMemo(() => 
    sortDocuments(personDocuments.filter(d => d.target_type === "skupina")),
    [personDocuments]
  );
  const docsOsoba = useMemo(() => 
    sortDocuments(personDocuments.filter(d => d.target_type === "osoba")),
    [personDocuments]
  );

  if (detailPerson) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          {/* Header with name, slug, group as tags */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/osoby")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-typewriter text-3xl tracking-wide">{detailPerson.name}</h1>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">
                  {detailPerson.slug}
                </span>
                {detailPerson.group_name && (
                  <span className="px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                    {detailPerson.group_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compact action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(detailPerson)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Upravit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={detailPerson.medailonek?.trim() 
                ? "border-green-600/50 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-500/50 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300" 
                : "border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              }
              onClick={() => openMedailonekDialog(detailPerson)}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Medailonek
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setSelectedPerson(detailPerson);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Smazat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/hrac/${detailPerson.slug}`, "_blank")}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Portál
            </Button>
          </div>

          {/* Documents visible to this person */}
          <PaperCard>
            <PaperCardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-typewriter text-xl">Viditelné dokumenty</h2>
                  {personDocuments.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {(() => {
                        const counts = personDocuments.reduce((acc, doc) => {
                          acc[doc.doc_type] = (acc[doc.doc_type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        const priorityCount = personDocuments.filter(d => d.priority === 1).length;
                        return (
                          <>
                            {priorityCount > 0 && (
                              <span title="Prioritní dokumenty" className="font-semibold text-accent">
                                🔥 {priorityCount}
                              </span>
                            )}
                            {counts.organizacni && <span title="Organizační">📋 {counts.organizacni}</span>}
                            {counts.herni && <span title="Herní">🎮 {counts.herni}</span>}
                            {counts.postava && <span title="Postava">👤 {counts.postava}</span>}
                            {counts.cp && <span title="CP">🎭 {counts.cp}</span>}
                            {counts.medailonek && <span title="Medailonek">📜 {counts.medailonek}</span>}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openNewIndividualDocumentDialog}
                  className="btn-vintage"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nový individuální dokument
                </Button>
              </div>
              
              {loadingDocuments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : personDocuments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Tato postava zatím nemá žádné přístupné dokumenty.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Dokumenty pro všechny */}
                  {docsVsichni.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Dokumenty všech ({docsVsichni.length})
                      </h4>
                      <SortableDocumentSection docs={docsVsichni} sectionKey="vsichni" />
                    </div>
                  )}
                  
                  {/* Dokumenty skupiny */}
                  {docsSkupina.length > 0 && (
                    <div className="space-y-2">
                      <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Dokumenty skupiny {detailPerson.group_name && `(${detailPerson.group_name})`} ({docsSkupina.length})
                        </h4>
                      </div>
                      <SortableDocumentSection docs={docsSkupina} sectionKey="skupina" />
                    </div>
                  )}
                  
                  {/* Individuální dokumenty */}
                  {docsOsoba.length > 0 && (
                    <div className="space-y-2">
                      <div className="border-t border-border pt-4">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Individuální dokumenty ({docsOsoba.length})
                        </h4>
                      </div>
                      <SortableDocumentSection docs={docsOsoba} sectionKey="osoba" />
                    </div>
                  )}
                </div>
              )}
            </PaperCardContent>
          </PaperCard>
        </div>

        {/* Document Edit Dialog */}
        {currentLarpId && (
          <DocumentEditDialog
            open={documentDialogOpen}
            onOpenChange={setDocumentDialogOpen}
            document={editingDocument}
            larpId={currentLarpId}
            persons={allPersons}
            groups={groups}
            runs={runs}
            onSaved={handleDocumentSaved}
            defaultValues={newDocumentDefaults}
          />
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="paper-card">
            <DialogHeader>
              <DialogTitle className="font-typewriter">Upravit postavu</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jméno postavy</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: selectedPerson ? formData.slug : generateSlug(name),
                    });
                  }}
                  placeholder="Jan Novák"
                  className="input-vintage"
                />
              </div>

              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="jan-novak"
                  className="input-vintage font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Skupina</Label>
                <Input
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  placeholder="např. Odboj, Gestapo..."
                  className="input-vintage"
                />
              </div>

              <div className="space-y-2">
                <Label>Nové heslo (prázdné = beze změny)</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-vintage"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={saving} className="btn-vintage">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Uložit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="paper-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-typewriter">Smazat postavu?</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat postavu <strong>{selectedPerson?.name}</strong>?
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

        {/* Medailonek Dialog */}
        <Dialog open={medailonekDialogOpen} onOpenChange={setMedailonekDialogOpen}>
          <DialogContent className="paper-card max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-typewriter">
                Medailonek - {selectedPerson?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <RichTextEditor
                value={medailonekContent}
                onChange={setMedailonekContent}
                placeholder="Popis postavy, její příběh, charakteristika..."
                minHeight="300px"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMedailonekDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={handleSaveMedailonek} disabled={saving} className="btn-vintage">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Uložit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    );
  }

  // List view
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Postavy</h1>
            <p className="text-muted-foreground">
              Herní postavy LARPu {currentLarp?.name}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage" disabled={!currentLarpId}>
            <Plus className="mr-2 h-4 w-4" />
            Nová postava
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "byGroup" | "alphabetical")}>
            <SelectTrigger className="w-48 input-vintage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="byGroup">Podle skupiny</SelectItem>
              <SelectItem value="alphabetical">Všechny postavy</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === "byGroup" && (
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-48 input-vintage">
                <SelectValue placeholder="Všechny skupiny" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny skupiny</SelectItem>
                <SelectItem value="none">Bez skupiny</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            placeholder="Hledat postavu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 input-vintage"
          />
        </div>

        {!currentLarpId ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nejprve vyberte LARP
              </p>
            </PaperCardContent>
          </PaperCard>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : persons.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Tento LARP zatím nemá žádné postavy
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit první postavu
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPersons).map(([group, groupPersons]) => (
              <div key={group}>
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {group}
                  <span className="text-sm text-muted-foreground">
                    ({groupPersons.length})
                  </span>
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {groupPersons.map((person) => {
                    const assignment = getAssignment(person.id);
                    return (
                    <PaperCard
                      key={person.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleCardClick(person)}
                    >
                      <PaperCardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-typewriter">{person.name}</h4>
                            {assignment?.player_name ? (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <User className="h-3 w-3" />
                                {assignment.player_name}
                              </p>
                            ) : selectedRun ? (
                              <p className="text-xs text-muted-foreground italic mt-1">
                                nepřiřazeno ({selectedRun.name})
                              </p>
                            ) : null}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {personDocCounts[person.id] && (
                                <>
                                  {personDocCounts[person.id].organizacni > 0 && (
                                    <span title="Organizační">📋 {personDocCounts[person.id].organizacni}</span>
                                  )}
                                  {personDocCounts[person.id].herni > 0 && (
                                    <span title="Herní">🎮 {personDocCounts[person.id].herni}</span>
                                  )}
                                  {personDocCounts[person.id].postava > 0 && (
                                    <span title="Postava">👤 {personDocCounts[person.id].postava}</span>
                                  )}
                                </>
                              )}
                              <span 
                                title={person.medailonek?.trim() ? "Medailonek vyplněn" : "Medailonek chybí"}
                                className="flex items-center gap-0.5"
                              >
                                <Medal className="h-3 w-3" />
                                {person.medailonek?.trim() ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <X className="h-3 w-3 text-destructive" />
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => openEditDialog(person, e)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPerson(person);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </PaperCardContent>
                    </PaperCard>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedPerson ? "Upravit postavu" : "Nová postava"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jméno postavy</Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    slug: selectedPerson ? formData.slug : generateSlug(name),
                  });
                }}
                placeholder="Jan Novák"
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="jan-novak"
                className="input-vintage font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Skupina</Label>
              <Input
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                placeholder="např. Odboj, Gestapo..."
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>{selectedPerson ? "Nové heslo (prázdné = beze změny)" : "Heslo"}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={selectedPerson ? "••••••••" : "Přístupové heslo"}
                className="input-vintage"
              />
              <p className="text-xs text-muted-foreground">
                Toto heslo se použije při přiřazení k běhu
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-vintage">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat postavu?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat postavu <strong>{selectedPerson?.name}</strong>?
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
