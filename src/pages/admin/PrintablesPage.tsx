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

interface Printable {
  id: string;
  larp_id: string;
  title: string;
  url: string | null;
  print_instructions: string | null;
  sort_order: number | null;
}

export default function PrintablesPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const [items, setItems] = useState<Printable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Printable | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    print_instructions: "",
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    if (!currentLarpId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("printables")
      .select("*")
      .eq("larp_id", currentLarpId)
      .order("sort_order", { ascending: true })
      .order("title");
    if (error) {
      toast.error("Chyba při načítání");
    } else {
      setItems((data as Printable[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentLarpId) fetchItems();
  }, [currentLarpId]);

  const openCreate = () => {
    setSelectedItem(null);
    setFormData({ title: "", url: "", print_instructions: "", sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: Printable) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      url: item.url ?? "",
      print_instructions: item.print_instructions ?? "",
      sort_order: item.sort_order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Vyplňte název");
      return;
    }
    setSaving(true);
    const payload = {
      larp_id: currentLarpId,
      title: formData.title,
      url: formData.url || null,
      print_instructions: formData.print_instructions || null,
      sort_order: formData.sort_order,
    };
    if (selectedItem) {
      const { error } = await supabase.from("printables").update(payload).eq("id", selectedItem.id);
      if (error) {
        toast.error("Chyba při ukládání");
      } else {
      toast.success("Tiskovina upravena");
      }
    } else {
      // Using type assertion until types.ts is regenerated with larp_id
      const { error } = await supabase.from("printables").insert(payload as never);
      if (error) {
        toast.error("Chyba při vytváření");
      } else {
        toast.success("Tiskovina přidána");
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const { error } = await supabase.from("printables").delete().eq("id", selectedItem.id);
    if (error) {
      toast.error("Chyba při mazání");
    } else {
      toast.success("Tiskovina smazána");
    }
    setDeleteDialogOpen(false);
    fetchItems();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Tiskoviny</h1>
            <p className="text-muted-foreground">
              Materiály k tisku pro LARP {currentLarp?.name}
            </p>
          </div>
          <Button onClick={openCreate} className="btn-vintage" disabled={!currentLarpId}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat tiskovinu
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
              <p className="text-muted-foreground">Žádné tiskoviny.</p>
              <Button onClick={openCreate} variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Přidat první tiskovinu
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
                      {item.print_instructions && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.print_instructions}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {item.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(item.url!, "_blank", "noopener,noreferrer")}
                          title="Otevřít / Stáhnout"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
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
              {selectedItem ? "Upravit tiskovinu" : "Přidat tiskovinu"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-vintage"
                placeholder="Např. Mapy lokací"
              />
            </div>
            <div className="space-y-2">
              <Label>URL (odkaz na soubor, volitelné)</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input-vintage"
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label>Instrukce k tisku (volitelné)</Label>
              <Textarea
                value={formData.print_instructions}
                onChange={(e) => setFormData({ ...formData, print_instructions: e.target.value })}
                className="input-vintage"
                rows={3}
                placeholder="Např. Tisknout oboustranně, A4…"
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
            <AlertDialogTitle className="font-typewriter">Smazat tiskovinu?</AlertDialogTitle>
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
