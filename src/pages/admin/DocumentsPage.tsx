import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Loader2, Search, X } from "lucide-react";
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
} from "@dnd-kit/sortable";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocBadge } from "@/components/ui/doc-badge";
import { SortableDocumentItem } from "@/components/admin/SortableDocumentItem";
import { DocumentEditDialog } from "@/components/admin/DocumentEditDialog";
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
import { DOCUMENT_TYPES } from "@/lib/constants";
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { sortDocuments, updateDocumentOrder } from "@/lib/documentUtils";

interface HiddenDocument {
  document_id: string;
  person_id: string;
}

interface HiddenDocumentGroup {
  document_id: string;
  group_name: string;
}

interface Person {
  id: string;
  name: string;
  group_name: string | null;
  type: string;
}

interface Document {
  id: string;
  larp_id: string;
  run_id: string | null;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: "vsichni" | "skupina" | "osoba";
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number;
  visibility_mode: string;
  visible_days_before: number | null;
  visible_to_cp?: boolean;
  created_at?: string;
}

export default function DocumentsPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const { selectedRunId, runs } = useRunContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [hiddenDocs, setHiddenDocs] = useState<HiddenDocument[]>([]);
  const [hiddenDocsGroups, setHiddenDocsGroups] = useState<HiddenDocumentGroup[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPerson, setFilterPerson] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"type" | "blocks">("type");
  const [blockSearch, setBlockSearch] = useState("");
  

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

  const fetchDocuments = async () => {
    if (!currentLarpId) return;
    
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("larp_id", currentLarpId);

    if (error) {
      toast.error("Chyba při načítání dokumentů");
      return;
    }

    // Sort by priority, then sort_order
    const sorted = sortDocuments(data || []);
    setDocuments(sorted);
    
    const docIds = (data || []).map((d) => d.id);
    if (docIds.length > 0) {
      const [hd, hdg] = await Promise.all([
        supabase.from("hidden_documents").select("document_id, person_id").in("document_id", docIds),
        supabase.from("hidden_document_groups").select("document_id, group_name").in("document_id", docIds),
      ]);
      setHiddenDocs(hd.data || []);
      setHiddenDocsGroups(hdg.data || []);
    } else {
      setHiddenDocs([]);
      setHiddenDocsGroups([]);
    }
    
    setLoading(false);
  };

  const fetchPersons = async () => {
    if (!currentLarpId) return;

    const { data } = await supabase
      .from("persons")
      .select("id, name, group_name, type")
      .eq("larp_id", currentLarpId)
      .order("name");

    setPersons(data || []);
    
    const uniqueGroups = [...new Set(
      (data || [])
        .map((p) => p.group_name)
        .filter((g): g is string => g !== null)
    )];
    setGroups(uniqueGroups);
  };

  useEffect(() => {
    if (currentLarpId) {
      setLoading(true);
      fetchDocuments();
      fetchPersons();
    }
  }, [currentLarpId]);

  const openCreateDialog = () => {
    setSelectedDoc(null);
    setDialogOpen(true);
  };

  const openEditDialog = (doc: Document) => {
    setSelectedDoc(doc);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    const { error } = await supabase.from("documents").delete().eq("id", selectedDoc.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Dokument smazán");
    setDeleteDialogOpen(false);
    fetchDocuments();
  };

  // Filtering logic
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (filterType !== "all" && doc.doc_type !== filterType) return false;
      
      if (filterPerson !== "all") {
        if (doc.target_type !== "osoba" || doc.target_person_id !== filterPerson) return false;
      }
      
      if (filterGroup !== "all") {
        if (filterGroup === "__vsichni__") {
          if (doc.target_type !== "vsichni") return false;
        } else {
          if (doc.target_type !== "skupina" || doc.target_group !== filterGroup) return false;
        }
      }
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!doc.title.toLowerCase().includes(q)) return false;
      }
      
      return true;
    });
  }, [documents, filterType, filterPerson, filterGroup, searchQuery]);

  // Group by doc_type for "Podle typu" view
  const groupedByType = useMemo(() => {
    const result: Record<string, Document[]> = {};
    for (const doc of filteredDocs) {
      if (!result[doc.doc_type]) result[doc.doc_type] = [];
      result[doc.doc_type].push(doc);
    }
    // Sort each group by priority → sort_order
    for (const key of Object.keys(result)) {
      result[key] = sortDocuments(result[key]);
    }
    return result;
  }, [filteredDocs]);

  // Organize for "Podle cíle" view
  const filterByBlockSearch = useCallback((doc: Document) => {
    if (!blockSearch.trim()) return true;
    const q = blockSearch.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.content?.toLowerCase().includes(q)
    );
  }, [blockSearch]);

  // Common documents (vsichni)
  const commonDocs = useMemo(() => {
    return sortDocuments(
      documents
        .filter((d) => d.target_type === "vsichni")
        .filter(filterByBlockSearch)
    );
  }, [documents, filterByBlockSearch]);

  // Group documents organized by group name + CP as special group
  const groupDocsMap = useMemo(() => {
    const result: Record<string, Document[]> = {};
    
    // Documents targeting specific groups
    for (const doc of documents.filter(filterByBlockSearch)) {
      if (doc.target_type === "skupina" && doc.target_group) {
        if (!result[doc.target_group]) result[doc.target_group] = [];
        result[doc.target_group].push(doc);
      }
    }
    
    // Sort each group
    for (const key of Object.keys(result)) {
      result[key] = sortDocuments(result[key]);
    }
    
    return result;
  }, [documents, filterByBlockSearch]);

  // CP documents (doc_type === "cp" and target_type === "vsichni" means for all CPs)
  const cpGroupDocs = useMemo(() => {
    return sortDocuments(
      documents
        .filter((d) => d.doc_type === "cp" && d.target_type === "vsichni")
        .filter(filterByBlockSearch)
    );
  }, [documents, filterByBlockSearch]);

  // Individual documents (osoba)
  const personDocsMap = useMemo(() => {
    const result: Record<string, Document[]> = {};
    
    for (const doc of documents.filter(filterByBlockSearch)) {
      if (doc.target_type === "osoba" && doc.target_person_id) {
        if (!result[doc.target_person_id]) result[doc.target_person_id] = [];
        result[doc.target_person_id].push(doc);
      }
    }
    
    // Sort each person's docs
    for (const key of Object.keys(result)) {
      result[key] = sortDocuments(result[key]);
    }
    
    return result;
  }, [documents, filterByBlockSearch]);

  // Sorted group names (alphabetically, CP at end if exists)
  const sortedGroupNames = useMemo(() => {
    return Object.keys(groupDocsMap).sort((a, b) => a.localeCompare(b, "cs"));
  }, [groupDocsMap]);

  const hasActiveFilters = filterType !== "all" || filterPerson !== "all" || filterGroup !== "all" || searchQuery.trim() !== "";

  const clearAllFilters = () => {
    setFilterType("all");
    setFilterPerson("all");
    setFilterGroup("all");
    setSearchQuery("");
  };

  const getHiddenFromNames = (docId: string): string[] => {
    const hiddenPersonIds = hiddenDocs
      .filter((h) => h.document_id === docId)
      .map((h) => h.person_id);
    return hiddenPersonIds
      .map((pid) => persons.find((p) => p.id === pid)?.name)
      .filter((name): name is string => !!name);
  };

  const getHiddenFromGroups = (docId: string): string[] => {
    return hiddenDocsGroups
      .filter((h) => h.document_id === docId)
      .map((h) => h.group_name);
  };

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent, sectionDocs: Document[], sectionKey: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = sectionDocs.findIndex((d) => d.id === active.id);
    const newIndex = sectionDocs.findIndex((d) => d.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const newOrder = arrayMove(sectionDocs, oldIndex, newIndex);
    
    // Optimistic UI update
    setDocuments((prev) => {
      const updated = [...prev];
      const docIds = new Set(newOrder.map((d) => d.id));
      const otherDocs = updated.filter((d) => !docIds.has(d.id));
      
      // Update sort_order in the reordered docs
      const reorderedDocs = newOrder.map((doc, idx) => ({
        ...doc,
        sort_order: idx,
      }));
      
      return [...otherDocs, ...reorderedDocs];
    });
    
    // Persist to database
    await updateDocumentOrder(newOrder);
  }, []);

  // Section with drag and drop
  const SortableSection = ({ 
    title, 
    docs, 
    sectionKey,
    showDocType = true,
    emptyMessage = "Žádné dokumenty."
  }: { 
    title: React.ReactNode;
    docs: Document[];
    sectionKey: string;
    showDocType?: boolean;
    emptyMessage?: string;
  }) => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => handleDragEnd(event, docs, sectionKey)}
    >
      <SortableContext items={docs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            docs.map((doc) => (
              <SortableDocumentItem
                key={doc.id}
                doc={doc}
                persons={persons}
                runs={runs}
                hiddenFromPersons={getHiddenFromNames(doc.id)}
                hiddenFromGroups={getHiddenFromGroups(doc.id)}
                showDocType={showDocType}
                clickableRow
                titleWithTarget
                onEdit={() => openEditDialog(doc)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Dokumenty</h1>
            <p className="text-muted-foreground">Herní a organizační texty pro LARP {currentLarp?.name}</p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage" disabled={!currentLarpId}>
            <Plus className="mr-2 h-4 w-4" />
            Nový dokument
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={viewMode} onValueChange={(v: "type" | "blocks") => setViewMode(v)}>
            <SelectTrigger className="w-44 input-vintage">
              <SelectValue placeholder="Zobrazení" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="type">Podle typu</SelectItem>
              <SelectItem value="blocks">Podle cíle</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 input-vintage">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny typy</SelectItem>
              {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-40 input-vintage">
              <SelectValue placeholder="Skupina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny cíle</SelectItem>
              <SelectItem value="__vsichni__">Pro všechny</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPerson} onValueChange={setFilterPerson}>
            <SelectTrigger className="w-44 input-vintage">
              <SelectValue placeholder="Osoba" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny osoby</SelectItem>
              {persons.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
              <X className="mr-1 h-4 w-4" />
              Zrušit filtry
            </Button>
          )}
        </div>

        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat podle názvu…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-8 input-vintage"
            />
          </div>
          {viewMode === "blocks" && (
            <Input
              placeholder="Hledat v obsahu dokumentů…"
              value={blockSearch}
              onChange={(e) => setBlockSearch(e.target.value)}
              className="w-64 input-vintage"
            />
          )}
        </div>

        {/* Content */}
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
        ) : documents.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Tento LARP zatím nemá žádné dokumenty
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit první dokument
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : viewMode === "blocks" ? (
          /* View by target: Společné → Skupiny → CP → Individuální */
          <div className="space-y-8">
            {/* Společné dokumenty (pro všechny hráče, ne CP dokumenty) */}
            <section>
              <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                Společné dokumenty (pro všechny)
                <span className="text-sm text-muted-foreground">({commonDocs.filter(d => d.doc_type !== "cp").length})</span>
              </h3>
              <SortableSection
                title="Společné"
                docs={commonDocs.filter(d => d.doc_type !== "cp")}
                sectionKey="common"
                emptyMessage="Žádné společné dokumenty."
              />
            </section>

            {/* Dokumenty skupin */}
            {sortedGroupNames.length > 0 && (
              <section>
                <h3 className="font-typewriter text-lg mb-3">Po skupinách</h3>
                {sortedGroupNames.map((groupName) => (
                  <div key={groupName} className="mb-6">
                    <h4 className="font-mono text-sm text-muted-foreground mb-2">
                      Skupina: {groupName} ({groupDocsMap[groupName].length})
                    </h4>
                    <SortableSection
                      title={groupName}
                      docs={groupDocsMap[groupName]}
                      sectionKey={`group-${groupName}`}
                    />
                  </div>
                ))}
              </section>
            )}

            {/* CP dokumenty (pro všechny CP) */}
            {cpGroupDocs.length > 0 && (
              <section>
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  Skupina: CP
                  <span className="text-sm text-muted-foreground">({cpGroupDocs.length})</span>
                </h3>
                <SortableSection
                  title="CP"
                  docs={cpGroupDocs}
                  sectionKey="cp-group"
                />
              </section>
            )}

            {/* Individuální dokumenty */}
            <section>
              <h3 className="font-typewriter text-lg mb-3">Individuální dokumenty</h3>
              {Object.keys(personDocsMap).length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné dokumenty cílené na konkrétní osobu.</p>
              ) : (
                Object.entries(personDocsMap).map(([personId, docs]) => {
                  const person = persons.find((p) => p.id === personId);
                  return (
                    <div key={personId} className="mb-6">
                      <h4 className="font-mono text-sm text-muted-foreground mb-2">
                        Pro: {person?.name ?? "Osoba"} ({docs.length})
                      </h4>
                      <SortableSection
                        title={person?.name ?? "Osoba"}
                        docs={docs}
                        sectionKey={`person-${personId}`}
                      />
                    </div>
                  );
                })
              )}
            </section>
          </div>
        ) : (
          /* View by type */
          <div className="space-y-8">
            {Object.entries(groupedByType).map(([type, docs]) => (
              <div key={type}>
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <DocBadge type={type as keyof typeof DOCUMENT_TYPES} />
                  <span className="text-sm text-muted-foreground">({docs.length})</span>
                </h3>
                <SortableSection
                  title={type}
                  docs={docs}
                  sectionKey={`type-${type}`}
                  showDocType={false}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog – shared component */}
      <DocumentEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        document={selectedDoc}
        larpId={currentLarpId || ""}
        persons={persons}
        groups={groups}
        runs={runs}
        onSaved={fetchDocuments}
        defaultValues={{
          doc_type: "organizacni",
          target_type: "vsichni",
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat dokument?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat dokument <strong>{selectedDoc?.title}</strong>?
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
