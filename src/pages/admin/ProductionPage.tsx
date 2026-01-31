import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductionLink {
  id: string;
  larp_id: string;
  title: string;
  url: string;
  description: string | null;
  link_type: string | null;
  sort_order: number | null;
}

export default function ProductionPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const [items, setItems] = useState<ProductionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProductionLink | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    link_type: "",
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    if (!currentLarpId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("production_links")
      .select("*")
      .eq("larp_id", currentLarpId)
      .order("sort_order", { ascending: true })
      .order("title");
    if (error) {
      toast.error("Chyba při načítání");
    } else {
      setItems((data as ProductionLink[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentLarpId) fetchItems();
  }, [currentLarpId]);

  const openCreate = () => {
    setSelectedItem(null);
    setFormData({ title: "", url: "", description: "", link_type: "", sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: ProductionLink) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      url: item.url,
      description: item.description ?? "",
      link_type: item.link_type ?? "",
      sort_order: item.sort_order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.url) {
      toast.error("Vyplňte název a URL");
      return;
    }
    setSaving(true);
    const payload = {
      larp_id: currentLarpId,
      title: formData.title,
      url: formData.url,
      description: formData.description || null,
      link_type: formData.link_type || null,
      sort_order: formData.sort_order,
    };
    if (selectedItem) {
      const { error } = await supabase.from("production_links").update(payload).eq("id", selectedItem.id);
      if (error) {
        toast.error("Chyba při ukládání");
      } else {
      toast.success("Odkaz upraven");
      }
    } else {
      // Using type assertion until types.ts is regenerated with larp_id
      const { error } = await supabase.from("production_links").insert(payload as never);
      if (error) {
        toast.error("Chyba při vytváření");
      } else {
        toast.success("Odkaz přidán");
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const { error } = await supabase.from("production_links").delete().eq("id", selectedItem.id);
    if (error) {
      toast.error("Chyba při mazání");
    } else {
      toast.success("Odkaz smazán");
    }
    setDeleteDialogOpen(false);
    fetchItems();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Produkce</h1>
            <p className="text-muted-foreground">
              Užitečné odkazy a materiály pro LARP {currentLarp?.name}
            </p>
          </div>
          <Button onClick={openCreate} className="btn-vintage" disabled={!currentLarpId}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat odkaz
          </Button>
        </div>

        {!currentLarpId ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nejprve vyberte LARP.</p>
            </PaperCardContent>
          </PaperCard>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Žádné produkční odkazy.</p>
              <Button onClick={openCreate} variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Přidat první odkaz
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <PaperCard key={item.id}>
                <PaperCardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-typewriter font-medium">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                        title="Otevřít"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Upravit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItem(item);
                          setDeleteDialogOpen(true);
                        }}
                        title="Smazat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </PaperCardContent>
              </PaperCard>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedItem ? "Upravit odkaz" : "Přidat odkaz"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-vintage"
                placeholder="Např. Úvodní video"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input-vintage"
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label>Popis (volitelné)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-vintage"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Typ (volitelně, např. pdf, audio, video)</Label>
              <Input
                value={formData.link_type}
                onChange={(e) => setFormData({ ...formData, link_type: e.target.value })}
                className="input-vintage"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
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
            <AlertDialogTitle className="font-typewriter">Smazat odkaz?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat <strong>{selectedItem?.title}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
