import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Loader2, Users, ArrowLeft, User, FileText, ExternalLink } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  doc_type: string;
  target_type: string;
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    group_name: "",
    password: "",
    medailonek: "",
  });
  const [saving, setSaving] = useState(false);
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);
  const [personDocuments, setPersonDocuments] = useState<PersonDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

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
    
    // Fetch documents that this person can see:
    // 1. target_type = 'vsichni' (for all)
    // 2. target_type = 'skupina' AND target_group = person's group
    // 3. target_type = 'osoba' AND target_person_id = person's id
    // Also exclude hidden documents
    
    let query = supabase
      .from("documents")
      .select("id, title, doc_type, target_type")
      .eq("larp_id", currentLarpId)
      .order("doc_type")
      .order("sort_order")
      .order("title");
    
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
      setPersonDocuments(visibleDocs);
    }
    setLoadingDocuments(false);
  };

  useEffect(() => {
    if (currentLarpId) {
      setLoading(true);
      fetchPersons();
    }
  }, [currentLarpId]);

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
    setFormData({ name: "", slug: "", group_name: "", password: "", medailonek: "" });
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
      medailonek: person.medailonek || "",
    });
    setDialogOpen(true);
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
        medailonek: formData.medailonek || null,
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
        medailonek: formData.medailonek || null,
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

  const filteredPersons = persons.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const groupedPersons = filteredPersons.reduce((acc, person) => {
    const group = person.group_name || "Bez skupiny";
    if (!acc[group]) acc[group] = [];
    acc[group].push(person);
    return acc;
  }, {} as Record<string, Person[]>);

  // Detail view
  if (detailPerson) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/osoby")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-typewriter text-3xl tracking-wide">{detailPerson.name}</h1>
              {detailPerson.group_name && (
                <p className="text-muted-foreground">{detailPerson.group_name}</p>
              )}
            </div>
          </div>

          <PaperCard>
            <PaperCardContent className="py-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Slug</Label>
                  <p className="font-mono">{detailPerson.slug}</p>
                </div>
                {detailPerson.group_name && (
                  <div>
                    <Label className="text-muted-foreground">Skupina</Label>
                    <p>{detailPerson.group_name}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => openEditDialog(detailPerson)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Upravit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedPerson(detailPerson);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Smazat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/hrac/${detailPerson.slug}`, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Zobrazit portál postavy
                  </Button>
                </div>
              </div>
            </PaperCardContent>
          </PaperCard>

          {/* Documents visible to this person */}
          <PaperCard>
            <PaperCardContent className="py-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-typewriter text-xl">Viditelné dokumenty</h2>
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
                <div className="space-y-2">
                  {personDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/dokumenty`)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{doc.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted">
                          {doc.doc_type === "organizacni" && "Organizační"}
                          {doc.doc_type === "herni" && "Herní"}
                          {doc.doc_type === "postava" && "Postava"}
                          {doc.doc_type === "medailonek" && "Medailonek"}
                          {doc.doc_type === "cp" && "CP"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-muted/50">
                          {doc.target_type === "vsichni" && "Všichni"}
                          {doc.target_type === "skupina" && "Skupina"}
                          {doc.target_type === "osoba" && "Osobní"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PaperCardContent>
          </PaperCard>
        </div>

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

        <div className="flex items-center gap-4 flex-wrap">
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
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              {person.slug}
                            </p>
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
              <Label>Medailonek</Label>
              <RichTextEditor
                value={formData.medailonek}
                onChange={(val) => setFormData({ ...formData, medailonek: val })}
                placeholder="Popis postavy, její příběh, charakteristika..."
                minHeight="150px"
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
