import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Copy, Loader2, Calendar } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

interface Larp {
  id: string;
  name: string;
}

interface Run {
  id: string;
  larp_id: string;
  name: string;
  slug: string;
  date_from: string | null;
  date_to: string | null;
  location: string | null;
  address: string | null;
  contact: string | null;
  footer_text: string | null;
  mission_briefing: string | null;
  is_active: boolean;
  larps?: { name: string };
}

export default function RunsPage() {
  const [larps, setLarps] = useState<Larp[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedLarpId, setSelectedLarpId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [formData, setFormData] = useState({
    larp_id: "",
    name: "",
    slug: "",
    date_from: "",
    date_to: "",
    location: "",
    address: "",
    contact: "",
    footer_text: "",
    mission_briefing: "",
    is_active: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchLarps = async () => {
    const { data } = await supabase.from("larps").select("id, name").order("name");
    setLarps(data || []);
    if (data && data.length > 0 && !selectedLarpId) {
      setSelectedLarpId(data[0].id);
    }
  };

  const fetchRuns = async () => {
    let query = supabase
      .from("runs")
      .select("*, larps(name)")
      .order("date_from", { ascending: false });

    if (selectedLarpId) {
      query = query.eq("larp_id", selectedLarpId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Chyba při načítání běhů");
      return;
    }

    setRuns(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLarps();
  }, []);

  useEffect(() => {
    if (selectedLarpId) {
      fetchRuns();
    }
  }, [selectedLarpId]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const openCreateDialog = () => {
    setSelectedRun(null);
    setFormData({
      larp_id: selectedLarpId,
      name: "",
      slug: "",
      date_from: "",
      date_to: "",
      location: "",
      address: "",
      contact: "",
      footer_text: "",
      mission_briefing: "",
      is_active: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (run: Run) => {
    setSelectedRun(run);
    setFormData({
      larp_id: run.larp_id,
      name: run.name,
      slug: run.slug,
      date_from: run.date_from || "",
      date_to: run.date_to || "",
      location: run.location || "",
      address: run.address || "",
      contact: run.contact || "",
      footer_text: run.footer_text || "",
      mission_briefing: run.mission_briefing || "",
      is_active: run.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.larp_id) {
      toast.error("Vyplňte název, slug a vyberte LARP");
      return;
    }

    setSaving(true);

    const payload = {
      larp_id: formData.larp_id,
      name: formData.name,
      slug: formData.slug,
      date_from: formData.date_from || null,
      date_to: formData.date_to || null,
      location: formData.location || null,
      address: formData.address || null,
      contact: formData.contact || null,
      footer_text: formData.footer_text || null,
      mission_briefing: formData.mission_briefing || null,
      is_active: formData.is_active,
    };

    if (selectedRun) {
      const { error } = await supabase
        .from("runs")
        .update(payload)
        .eq("id", selectedRun.id);

      if (error) {
        toast.error("Chyba při ukládání", { description: error.message });
        setSaving(false);
        return;
      }
      toast.success("Běh upraven");
    } else {
      const { error } = await supabase.from("runs").insert(payload);

      if (error) {
        toast.error("Chyba při vytváření", { description: error.message });
        setSaving(false);
        return;
      }
      toast.success("Běh vytvořen");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchRuns();
  };

  const handleDelete = async () => {
    if (!selectedRun) return;

    const { error } = await supabase.from("runs").delete().eq("id", selectedRun.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Běh smazán");
    setDeleteDialogOpen(false);
    fetchRuns();
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("cs-CZ");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Běhy</h1>
            <p className="text-muted-foreground">
              Jednotlivá uvedení vašich LARPů
            </p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage" disabled={!selectedLarpId}>
            <Plus className="mr-2 h-4 w-4" />
            Nový běh
          </Button>
        </div>

        {/* LARP filter */}
        <div className="flex items-center gap-4">
          <Label className="font-mono">LARP:</Label>
          <Select value={selectedLarpId} onValueChange={setSelectedLarpId}>
            <SelectTrigger className="w-64 input-vintage">
              <SelectValue placeholder="Vyberte LARP" />
            </SelectTrigger>
            <SelectContent>
              {larps.map((larp) => (
                <SelectItem key={larp.id} value={larp.id}>
                  {larp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {larps.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nejprve vytvořte LARP v sekci "LARPy"
              </p>
            </PaperCardContent>
          </PaperCard>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Tento LARP zatím nemá žádné běhy
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit první běh
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <PaperCard key={run.id}>
                <PaperCardContent>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-typewriter text-lg">{run.name}</h3>
                        {run.is_active && (
                          <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                            Aktivní
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(run.date_from)} – {formatDate(run.date_to)}
                        </span>
                        {run.location && <span>{run.location}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        slug: {run.slug}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(run)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedRun(run);
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
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedRun ? "Upravit běh" : "Nový běh"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Název</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: selectedRun ? formData.slug : generateSlug(name),
                    });
                  }}
                  placeholder="Jarní běh 2024"
                  className="input-vintage"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="jarni-beh-2024"
                  className="input-vintage font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum od</Label>
                <Input
                  type="date"
                  value={formData.date_from}
                  onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                  className="input-vintage"
                />
              </div>
              <div className="space-y-2">
                <Label>Datum do</Label>
                <Input
                  type="date"
                  value={formData.date_to}
                  onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                  className="input-vintage"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Místo</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Název lokace"
                  className="input-vintage"
                />
              </div>
              <div className="space-y-2">
                <Label>Kontakt</Label>
                <Input
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Email nebo telefon"
                  className="input-vintage"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adresa</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ulice, město, PSČ"
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Mission Briefing</Label>
              <Textarea
                value={formData.mission_briefing}
                onChange={(e) => setFormData({ ...formData, mission_briefing: e.target.value })}
                placeholder="Uvítací text pro hráče..."
                rows={4}
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Text zápatí</Label>
              <Input
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                placeholder="Text na konci dokumentů"
                className="input-vintage"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Aktivní běh</Label>
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
            <AlertDialogTitle className="font-typewriter">Smazat běh?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat běh <strong>{selectedRun?.name}</strong>?
              Tato akce smaže i všechny postavy a dokumenty tohoto běhu.
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
