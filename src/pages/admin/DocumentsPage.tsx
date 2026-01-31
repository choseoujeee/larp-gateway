import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocBadge } from "@/components/ui/doc-badge";
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
import { useRunContext } from "@/hooks/useRunContext";

interface Person {
  id: string;
  name: string;
  group_name: string | null;
  type: string;
}

interface Document {
  id: string;
  run_id: string;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: keyof typeof TARGET_TYPES;
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
}

export default function DocumentsPage() {
  const { runs, selectedRunId } = useRunContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
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
  });
  const [hiddenFromPersonIds, setHiddenFromPersonIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    if (!selectedRunId) return;
    
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("run_id", selectedRunId)
      .order("doc_type")
      .order("sort_order")
      .order("title");

    if (error) {
      toast.error("Chyba při načítání dokumentů");
      return;
    }

    setDocuments(data || []);
    setLoading(false);
  };

  const fetchPersons = async () => {
    if (!selectedRunId) return;

    const { data } = await supabase
      .from("persons")
      .select("id, name, group_name, type")
      .eq("run_id", selectedRunId)
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
    if (selectedRunId) {
      setLoading(true);
      fetchDocuments();
      fetchPersons();
    }
  }, [selectedRunId]);

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
      run_id: selectedRunId,
      title: formData.title,
      content: formData.content || null,
      doc_type: formData.doc_type,
      target_type: formData.target_type,
      target_group: formData.target_type === "skupina" ? formData.target_group : null,
      target_person_id: formData.target_type === "osoba" ? formData.target_person_id : null,
      sort_order: formData.sort_order,
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
      const { data: inserted, error } = await supabase
        .from("documents")
        .insert(payload)
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

  const filteredDocs = filterType === "all" 
    ? documents 
    : documents.filter((d) => d.doc_type === filterType);

  // Group by doc_type
  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = [];
    acc[doc.doc_type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const getTargetLabel = (doc: Document) => {
    if (doc.target_type === "vsichni") return "Všichni";
    if (doc.target_type === "skupina") return `Skupina: ${doc.target_group}`;
    if (doc.target_type === "osoba") {
      const person = persons.find((p) => p.id === doc.target_person_id);
      return person ? `Osoba: ${person.name}` : "Osoba";
    }
    return "";
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
            <p className="text-muted-foreground">Herní a organizační texty</p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage" disabled={!selectedRunId}>
            <Plus className="mr-2 h-4 w-4" />
            Nový dokument
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="font-mono">Zobrazení:</Label>
            <Select value={viewMode} onValueChange={(v: "type" | "blocks") => setViewMode(v)}>
              <SelectTrigger className="w-48 input-vintage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type">Podle typu</SelectItem>
                <SelectItem value="blocks">Společné / Skupiny / Osoby</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {viewMode === "type" && (
            <div className="flex items-center gap-2">
              <Label className="font-mono">Typ:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48 input-vintage">
                  <SelectValue />
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
            </div>
          )}
          {viewMode === "blocks" && (
            <Input
              placeholder="Hledat v dokumentech…"
              value={blockSearch}
              onChange={(e) => setBlockSearch(e.target.value)}
              className="w-64 input-vintage"
            />
          )}
        </div>

        {/* Content */}
        {runs.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nejprve vytvořte LARP a běh
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
                Tento běh zatím nemá žádné dokumenty
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
                    <PaperCard key={doc.id}>
                      <PaperCardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <DocBadge type={doc.doc_type} />
                              <h4 className="font-typewriter">{doc.title}</h4>
                            </div>
                            {doc.content && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {doc.content.replace(/<[^>]*>/g, "").slice(0, 150)}...
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(doc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </PaperCardContent>
                    </PaperCard>
                  ))
                )}
              </div>
            </section>
            <section>
              <h3 className="font-typewriter text-lg mb-3">Po skupinách</h3>
              {Object.keys(groupDocsMap).length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné dokumenty cílené na skupiny.</p>
              ) : (
                Object.entries(groupDocsMap).map(([groupName, docs]) => (
                  <div key={groupName} className="mb-6">
                    <h4 className="font-mono text-sm text-muted-foreground mb-2">{groupName} ({docs.length})</h4>
                    <div className="space-y-3">
                      {docs.map((doc) => (
                        <PaperCard key={doc.id}>
                          <PaperCardContent className="py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <DocBadge type={doc.doc_type} />
                                  <h4 className="font-typewriter">{doc.title}</h4>
                                </div>
                                {doc.content && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {doc.content.replace(/<[^>]*>/g, "").slice(0, 150)}...
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1 ml-4">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(doc)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          </PaperCardContent>
                        </PaperCard>
                      ))}
                    </div>
                  </div>
                ))
              )}
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
                          <PaperCard key={doc.id}>
                            <PaperCardContent className="py-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <DocBadge type={doc.doc_type} />
                                    <h4 className="font-typewriter">{doc.title}</h4>
                                  </div>
                                  {doc.content && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {doc.content.replace(/<[^>]*>/g, "").slice(0, 150)}...
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-4">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(doc)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            </PaperCardContent>
                          </PaperCard>
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
                    <PaperCard key={doc.id}>
                      <PaperCardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-typewriter">{doc.title}</h4>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {getTargetLabel(doc)}
                              </span>
                            </div>
                            {doc.content && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {doc.content.replace(/<[^>]*>/g, "").slice(0, 150)}...
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(doc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedDoc(doc); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </PaperCardContent>
                    </PaperCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedDoc ? "Upravit dokument" : "Nový dokument"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
              <Label>Skrýt před (dokument se těmto osobám nezobrazí)</Label>
              <ScrollArea className="h-32 rounded-md border border-input bg-muted/30 p-2">
                <div className="space-y-2">
                  {persons.length === 0 ? (
                    <p className="text-xs text-muted-foreground">V tomto běhu zatím nejsou žádné osoby.</p>
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
