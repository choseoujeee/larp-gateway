import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, Search, X } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocBadge } from "@/components/ui/doc-badge";
import { DocumentListItem } from "@/components/admin/DocumentListItem";
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
import { DOCUMENT_TYPES, TARGET_TYPES } from "@/lib/constants";
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";

interface HiddenDocument {
  document_id: string;
  person_id: string;
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
  target_type: keyof typeof TARGET_TYPES;
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number; // 1 = prioritní, 2 = normální, 3 = volitelné
  visibility_mode: string;
  visible_days_before: number | null;
}

export default function DocumentsPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const { selectedRunId, runs } = useRunContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [hiddenDocs, setHiddenDocs] = useState<HiddenDocument[]>([]);
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
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    doc_type: "organizacni" as keyof typeof DOCUMENT_TYPES,
    target_type: "vsichni" as keyof typeof TARGET_TYPES,
    target_group: "",
    target_person_id: "",
    sort_order: 0,
    priority: 2, // default = normální
    run_id: "__all__" as string, // "__all__" = všechny běhy, jinak konkrétní run_id
    visibility_mode: "immediate" as string,
    visible_days_before: 7,
  });
  const [hiddenFromPersonIds, setHiddenFromPersonIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    if (!currentLarpId) return;
    
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("larp_id", currentLarpId)
      .order("doc_type")
      .order("sort_order")
      .order("title");

    if (error) {
      toast.error("Chyba při načítání dokumentů");
      return;
    }

    setDocuments(data || []);
    
    // Fetch hidden documents for all documents in this larp
    const docIds = (data || []).map((d) => d.id);
    if (docIds.length > 0) {
      const { data: hiddenData } = await supabase
        .from("hidden_documents")
        .select("document_id, person_id")
        .in("document_id", docIds);
      setHiddenDocs(hiddenData || []);
    } else {
      setHiddenDocs([]);
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
    
    // Extract unique groups
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
    setFormData({
      title: "",
      content: "",
      doc_type: "organizacni",
      target_type: "vsichni",
      target_group: "",
      target_person_id: "",
      sort_order: 0,
      priority: 2,
      run_id: "__all__", // výchozí = pro všechny běhy
      visibility_mode: "immediate",
      visible_days_before: 7,
    });
    setHiddenFromPersonIds([]);
    setDialogOpen(true);
  };

  const openEditDialog = async (doc: Document) => {
    setSelectedDoc(doc);
    setFormData({
      title: doc.title,
      content: doc.content || "",
      doc_type: doc.doc_type,
      target_type: doc.target_type,
      target_group: doc.target_group || "",
      target_person_id: doc.target_person_id || "",
      sort_order: doc.sort_order,
      priority: doc.priority ?? 2,
      run_id: doc.run_id || "__all__",
      visibility_mode: doc.visibility_mode || "immediate",
      visible_days_before: doc.visible_days_before ?? 7,
    });
    const { data: hiddenRows } = await supabase
      .from("hidden_documents")
      .select("person_id")
      .eq("document_id", doc.id);
    setHiddenFromPersonIds((hiddenRows ?? []).map((r) => r.person_id));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Vyplňte název dokumentu");
      return;
    }

    setSaving(true);

    const payload = {
      larp_id: currentLarpId,
      run_id: formData.run_id === "__all__" ? null : formData.run_id, // "__all__" = pro všechny běhy (null)
      title: formData.title,
      content: formData.content || null,
      doc_type: formData.doc_type,
      target_type: formData.target_type,
      target_group: formData.target_type === "skupina" ? formData.target_group : null,
      target_person_id: formData.target_type === "osoba" ? formData.target_person_id : null,
      sort_order: formData.sort_order,
      priority: formData.priority,
      visibility_mode: formData.visibility_mode,
      visible_days_before: formData.visibility_mode === "delayed" ? formData.visible_days_before : null,
    };

    let documentId: string;

    if (selectedDoc) {
      const { error } = await supabase
        .from("documents")
        .update(payload)
        .eq("id", selectedDoc.id);

      if (error) {
        toast.error("Chyba při ukládání");
        setSaving(false);
        return;
      }
      documentId = selectedDoc.id;
      toast.success("Dokument upraven");
    } else {
      // Using type assertion until types.ts is regenerated with larp_id
      const { data: inserted, error } = await supabase
        .from("documents")
        .insert(payload as never)
        .select("id")
        .single();

      if (error) {
        toast.error("Chyba při vytváření");
        setSaving(false);
        return;
      }
      documentId = inserted.id;
      toast.success("Dokument vytvořen");
    }

    // Synchronizace „skrýt před“: smazat staré záznamy, vložit nové
    await supabase.from("hidden_documents").delete().eq("document_id", documentId);
    if (hiddenFromPersonIds.length > 0) {
      await supabase.from("hidden_documents").insert(
        hiddenFromPersonIds.map((person_id) => ({ document_id: documentId, person_id }))
      );
    }

    setSaving(false);
    setDialogOpen(false);
    fetchDocuments();
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

  // Unified filtering logic
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Filter by document type
      if (filterType !== "all" && doc.doc_type !== filterType) return false;
      
      // Filter by person
      if (filterPerson !== "all") {
        // Match only documents targeting this specific person
        if (doc.target_type !== "osoba" || doc.target_person_id !== filterPerson) return false;
      }
      
      // Filter by group
      if (filterGroup !== "all") {
        if (filterGroup === "__vsichni__") {
          // Show only documents for "všichni"
          if (doc.target_type !== "vsichni") return false;
        } else {
          // Show documents for this specific group
          if (doc.target_type !== "skupina" || doc.target_group !== filterGroup) return false;
        }
      }
      
      // Search by title
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!doc.title.toLowerCase().includes(q)) return false;
      }
      
      return true;
    });
  }, [documents, filterType, filterPerson, filterGroup, searchQuery]);

  // Group by doc_type
  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = [];
    acc[doc.doc_type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Check if any filter is active
  const hasActiveFilters = filterType !== "all" || filterPerson !== "all" || filterGroup !== "all" || searchQuery.trim() !== "";

  const clearAllFilters = () => {
    setFilterType("all");
    setFilterPerson("all");
    setFilterGroup("all");
    setSearchQuery("");
  };

  const getTargetLabel = (doc: Document) => {
    if (doc.target_type === "vsichni") return "Všichni";
    if (doc.target_type === "skupina") return `Skupina: ${doc.target_group}`;
    if (doc.target_type === "osoba") {
      const person = persons.find((p) => p.id === doc.target_person_id);
      return person ? `Osoba: ${person.name}` : "Osoba";
    }
    return "";
  };

  // Get names of persons this document is hidden from
  const getHiddenFromNames = (docId: string): string[] => {
    const hiddenPersonIds = hiddenDocs
      .filter((h) => h.document_id === docId)
      .map((h) => h.person_id);
    return hiddenPersonIds
      .map((pid) => persons.find((p) => p.id === pid)?.name)
      .filter((name): name is string => !!name);
  };

  const filterBySearch = (doc: Document) => {
    if (!blockSearch.trim()) return true;
    const q = blockSearch.toLowerCase();
    const titleMatch = doc.title?.toLowerCase().includes(q);
    const contentMatch = doc.content?.toLowerCase().includes(q);
    const targetMatch = getTargetLabel(doc).toLowerCase().includes(q);
    return titleMatch || contentMatch || targetMatch;
  };

  const commonDocs = documents.filter((d) => d.target_type === "vsichni").filter(filterBySearch);
  const groupDocsMap = documents
    .filter((d) => d.target_type === "skupina" && d.target_group)
    .filter(filterBySearch)
    .reduce((acc, doc) => {
      const g = doc.target_group!;
      if (!acc[g]) acc[g] = [];
      acc[g].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);
  const personDocsMap = documents
    .filter((d) => d.target_type === "osoba" && d.target_person_id)
    .filter(filterBySearch)
    .reduce((acc, doc) => {
      const pid = doc.target_person_id!;
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);

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

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat podle názvu…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 pl-8 input-vintage"
            />
          </div>

          {/* View mode */}
          <Select value={viewMode} onValueChange={(v: "type" | "blocks") => setViewMode(v)}>
            <SelectTrigger className="w-44 input-vintage">
              <SelectValue placeholder="Zobrazení" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="type">Podle typu</SelectItem>
              <SelectItem value="blocks">Podle cíle</SelectItem>
            </SelectContent>
          </Select>

          {/* Document type filter */}
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

          {/* Group filter */}
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

          {/* Person filter */}
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

          {/* Clear filters button */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
              <X className="mr-1 h-4 w-4" />
              Zrušit filtry
            </Button>
          )}
        </div>

        {/* Block view search (legacy, now combined with main search) */}
        {viewMode === "blocks" && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Hledat v obsahu dokumentů…"
              value={blockSearch}
              onChange={(e) => setBlockSearch(e.target.value)}
              className="w-64 input-vintage"
            />
          </div>
        )}

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
          <div className="space-y-8">
            <section>
              <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                Společné dokumenty
                <span className="text-sm text-muted-foreground">({commonDocs.length})</span>
              </h3>
              <div className="space-y-3">
                {commonDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Žádné společné dokumenty.</p>
                ) : (
                  commonDocs.map((doc) => (
                    <DocumentListItem
                      key={doc.id}
                      doc={doc}
                      persons={persons}
                      runs={runs}
                      hiddenFromPersons={getHiddenFromNames(doc.id)}
                      onEdit={() => openEditDialog(doc)}
                      onDelete={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }}
                    />
                  ))
                )}
              </div>
            </section>
            <section>
            </section>
            <section>
              <h3 className="font-typewriter text-lg mb-3">Po postavách / CP</h3>
              {Object.keys(personDocsMap).length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné dokumenty cílené na konkrétní osobu.</p>
              ) : (
                Object.entries(personDocsMap).map(([personId, docs]) => {
                  const person = persons.find((p) => p.id === personId);
                  return (
                    <div key={personId} className="mb-6">
                      <h4 className="font-mono text-sm text-muted-foreground mb-2">
                        {person?.name ?? "Osoba"} ({docs.length})
                      </h4>
                      <div className="space-y-3">
                        {docs.map((doc) => (
                          <DocumentListItem
                            key={doc.id}
                            doc={doc}
                            persons={persons}
                            runs={runs}
                            hiddenFromPersons={getHiddenFromNames(doc.id)}
                            onEdit={() => openEditDialog(doc)}
                            onDelete={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedDocs).map(([type, docs]) => (
              <div key={type}>
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <DocBadge type={type as keyof typeof DOCUMENT_TYPES} />
                  <span className="text-sm text-muted-foreground">({docs.length})</span>
                </h3>
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <DocumentListItem
                      key={doc.id}
                      doc={doc}
                      persons={persons}
                      runs={runs}
                      hiddenFromPersons={getHiddenFromNames(doc.id)}
                      showDocType={false}
                      onEdit={() => openEditDialog(doc)}
                      onDelete={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedDoc ? "Upravit dokument" : "Nový dokument"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Název dokumentu"
                className="input-vintage"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ dokumentu</Label>
                <Select
                  value={formData.doc_type}
                  onValueChange={(v) => setFormData({ ...formData, doc_type: v as keyof typeof DOCUMENT_TYPES })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cílení</Label>
                <Select
                  value={formData.target_type}
                  onValueChange={(v) => setFormData({ ...formData, target_type: v as keyof typeof TARGET_TYPES })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TARGET_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.target_type === "skupina" && (
              <div className="space-y-2">
                <Label>Skupina</Label>
                <Select
                  value={formData.target_group}
                  onValueChange={(v) => setFormData({ ...formData, target_group: v })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Vyberte skupinu" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.target_type === "osoba" && (
              <div className="space-y-2">
                <Label>Osoba</Label>
                <Select
                  value={formData.target_person_id}
                  onValueChange={(v) => setFormData({ ...formData, target_person_id: v })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Vyberte osobu" />
                  </SelectTrigger>
                  <SelectContent>
                    {persons.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} {person.group_name ? `(${person.group_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Priorita</Label>
                <Select
                  value={String(formData.priority)}
                  onValueChange={(v) => setFormData({ ...formData, priority: parseInt(v) })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Prioritní</SelectItem>
                    <SelectItem value="2">Normální</SelectItem>
                    <SelectItem value="3">Volitelné</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pořadí</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="input-vintage w-24"
                />
              </div>

              <div className="space-y-2">
                <Label>Pro běh</Label>
                <Select
                  value={formData.run_id}
                  onValueChange={(v) => setFormData({ ...formData, run_id: v })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Všechny běhy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Všechny běhy</SelectItem>
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Režim zobrazení na portálu */}
            <div className="space-y-2 rounded-md border border-input bg-muted/20 p-3">
              <Label className="font-medium">Zobrazení na portálu hráče</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility_mode"
                    value="immediate"
                    checked={formData.visibility_mode === "immediate"}
                    onChange={() => setFormData({ ...formData, visibility_mode: "immediate" })}
                    className="accent-primary"
                  />
                  <span className="text-sm">Zobrazit ihned</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility_mode"
                    value="delayed"
                    checked={formData.visibility_mode === "delayed"}
                    onChange={() => setFormData({ ...formData, visibility_mode: "delayed" })}
                    className="accent-primary"
                  />
                  <span className="text-sm">Zobrazit až</span>
                </label>
                {formData.visibility_mode === "delayed" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={formData.visible_days_before}
                      onChange={(e) => setFormData({ ...formData, visible_days_before: parseInt(e.target.value) || 7 })}
                      className="input-vintage w-20"
                    />
                    <span className="text-sm text-muted-foreground">dní před začátkem běhu</span>
                  </div>
                )}
              </div>
              {formData.visibility_mode === "delayed" && (
                <p className="text-xs text-muted-foreground">
                  Dokument se na portálu zobrazí až {formData.visible_days_before} dní před datem začátku aktivního běhu.
                </p>
              )}
            </div>

            {formData.target_type !== "osoba" && (
              <div className="space-y-2">
                <Label>Skrýt před (dokument se těmto osobám nezobrazí)</Label>
                <ScrollArea className="h-32 rounded-md border border-input bg-muted/30 p-2">
                  <div className="space-y-2">
                    {persons.length === 0 ? (
                      <p className="text-xs text-muted-foreground">V tomto LARPu zatím nejsou žádné osoby.</p>
                    ) : (
                      persons.map((person) => (
                        <label
                          key={person.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={hiddenFromPersonIds.includes(person.id)}
                            onCheckedChange={(checked) => {
                              setHiddenFromPersonIds((prev) =>
                                checked
                                  ? [...prev, person.id]
                                  : prev.filter((id) => id !== person.id)
                              );
                            }}
                          />
                          <span>
                            {person.name}
                            {person.group_name ? ` (${person.group_name})` : ""}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="space-y-2">
              <Label>Obsah (WYSIWYG)</Label>
              <RichTextEditor
                key={selectedDoc?.id ?? "new"}
                value={formData.content}
                onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
                placeholder="Napište obsah dokumentu…"
                minHeight="240px"
                className="border-input"
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
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
