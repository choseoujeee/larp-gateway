import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
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

interface Person {
  id: string;
  larp_id: string;
  slug: string;
  name: string;
  group_name: string | null;
}

export default function PersonsPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const [persons, setPersons] = useState<Person[]>([]);
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
  });
  const [saving, setSaving] = useState(false);

  const fetchPersons = async () => {
    if (!currentLarpId) return;
    
    const { data, error } = await supabase
      .from("persons")
      .select("id, larp_id, slug, name, group_name")
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

  useEffect(() => {
    if (currentLarpId) {
      setLoading(true);
      fetchPersons();
    }
  }, [currentLarpId]);

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

  const openEditDialog = (person: Person) => {
    setSelectedPerson(person);
    setFormData({
      name: person.name,
      slug: person.slug,
      group_name: person.group_name || "",
      password: "",
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
      // Using type assertion until types.ts is regenerated with larp_id
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
    fetchPersons();
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
                  {groupPersons.map((person) => (
                    <PaperCard key={person.id}>
                      <PaperCardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-typewriter">{person.name}</h4>
                            <p className="text-xs text-muted-foreground font-mono">
                              {person.slug}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(person)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
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
                  ))}
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
