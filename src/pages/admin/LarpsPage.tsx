import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Larp {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  theme: string | null;
  created_at: string;
}

export default function LarpsPage() {
  const { user } = useAuth();
  const [larps, setLarps] = useState<Larp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLarp, setSelectedLarp] = useState<Larp | null>(null);
  const THEME_OPTIONS = [
    { value: "wwii", label: "WWII / historie" },
    { value: "fantasy", label: "Fantasy" },
  ];
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    theme: "wwii",
  });
  const [saving, setSaving] = useState(false);

  const fetchLarps = async () => {
    const { data, error } = await supabase
      .from("larps")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Chyba při načítání LARPů");
      return;
    }

    setLarps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLarps();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const openCreateDialog = () => {
    setSelectedLarp(null);
    setFormData({ name: "", slug: "", description: "", theme: "wwii" });
    setDialogOpen(true);
  };

  const openEditDialog = (larp: Larp) => {
    setSelectedLarp(larp);
    setFormData({
      name: larp.name,
      slug: larp.slug,
      description: larp.description || "",
      theme: larp.theme && ["wwii", "fantasy"].includes(larp.theme) ? larp.theme : "wwii",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (larp: Larp) => {
    setSelectedLarp(larp);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Vyplňte název a slug");
      return;
    }

    setSaving(true);

    if (selectedLarp) {
      const { error } = await supabase
        .from("larps")
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          theme: formData.theme || null,
        })
        .eq("id", selectedLarp.id);

      if (error) {
        toast.error("Chyba při ukládání", { description: error.message });
        setSaving(false);
        return;
      }

      toast.success("LARP upraven");
    } else {
      // Create
      const { error } = await supabase.from("larps").insert({
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        theme: formData.theme || null,
        owner_id: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Slug už existuje", { description: "Zvolte jiný slug" });
        } else {
          toast.error("Chyba při vytváření", { description: error.message });
        }
        setSaving(false);
        return;
      }

      toast.success("LARP vytvořen");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchLarps();
  };

  const handleDelete = async () => {
    if (!selectedLarp) return;

    const { error } = await supabase
      .from("larps")
      .delete()
      .eq("id", selectedLarp.id);

    if (error) {
      toast.error("Chyba při mazání", { description: error.message });
      return;
    }

    toast.success("LARP smazán");
    setDeleteDialogOpen(false);
    fetchLarps();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">LARPy</h1>
            <p className="text-muted-foreground">
              Spravujte své živé akční hry
            </p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage">
            <Plus className="mr-2 h-4 w-4" />
            Nový LARP
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : larps.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Zatím nemáte žádné LARPy
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit první LARP
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {larps.map((larp) => (
              <PaperCard key={larp.id}>
                <PaperCardHeader>
                  <div className="flex items-start justify-between">
                    <PaperCardTitle className="text-lg">{larp.name}</PaperCardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(larp)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(larp)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </PaperCardHeader>
                <PaperCardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {larp.description || "Bez popisu"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <span className="font-mono">{larp.slug}</span>
                  </div>
                </PaperCardContent>
              </PaperCard>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedLarp ? "Upravit LARP" : "Nový LARP"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Název</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    slug: selectedLarp ? formData.slug : generateSlug(name),
                  });
                }}
                placeholder="Název vašeho LARPu"
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="url-adresa"
                className="input-vintage font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Používá se v URL adresách, pouze malá písmena a pomlčky
              </p>
            </div>

            <div className="space-y-2">
              <Label>Vizuální téma</Label>
              <Select
                value={formData.theme}
                onValueChange={(v) => setFormData({ ...formData, theme: v })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue placeholder="Vyberte téma" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Určuje barvy a styl portálu a landingu pro tento LARP
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Krátký popis hry..."
                rows={3}
                className="input-vintage"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-vintage">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ukládání...
                </>
              ) : (
                "Uložit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">
              Smazat LARP?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat LARP <strong>{selectedLarp?.name}</strong>?
              Tato akce je nevratná a smaže i všechny běhy, postavy a dokumenty.
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
