import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Copy, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRunContext } from "@/hooks/useRunContext";

interface CP {
  id: string;
  run_id: string;
  slug: string;
  name: string;
  performer: string | null;
  performance_times: string | null;
  access_token: string;
}

export default function CpPage() {
  const { runs, selectedRunId } = useRunContext();
  const [cps, setCps] = useState<CP[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCp, setSelectedCp] = useState<CP | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    performer: "",
    performance_times: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCps = async () => {
    if (!selectedRunId) return;
    
    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .eq("run_id", selectedRunId)
      .eq("type", "cp")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Chyba při načítání CP");
      return;
    }

    setCps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedRunId) {
      setLoading(true);
      fetchCps();
    }
  }, [selectedRunId]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const openCreateDialog = () => {
    setSelectedCp(null);
    setFormData({ name: "", slug: "", performer: "", performance_times: "", password: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (cp: CP) => {
    setSelectedCp(cp);
    setFormData({
      name: cp.name,
      slug: cp.slug,
      performer: cp.performer || "",
      performance_times: cp.performance_times || "",
      password: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Vyplňte jméno a slug");
      return;
    }

    if (!selectedCp && !formData.password) {
      toast.error("Zadejte heslo pro nové CP");
      return;
    }

    setSaving(true);

    if (selectedCp) {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        slug: formData.slug,
        performer: formData.performer || null,
        performance_times: formData.performance_times || null,
      };

      const { error } = await supabase
        .from("persons")
        .update(updateData)
        .eq("id", selectedCp.id);

      if (error) {
        toast.error("Chyba při ukládání");
        setSaving(false);
        return;
      }
      toast.success("CP upraveno");
    } else {
      const { error } = await supabase.from("persons").insert({
        run_id: selectedRunId,
        type: "cp" as const,
        name: formData.name,
        slug: formData.slug,
        performer: formData.performer || null,
        performance_times: formData.performance_times || null,
        password_hash: formData.password,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Slug už existuje v tomto běhu");
        } else {
          toast.error("Chyba při vytváření");
        }
        setSaving(false);
        return;
      }
      toast.success("CP vytvořeno");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCps();
  };

  const handleDelete = async () => {
    if (!selectedCp) return;

    const { error } = await supabase.from("persons").delete().eq("id", selectedCp.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("CP smazáno");
    setDeleteDialogOpen(false);
    fetchCps();
  };

  const copyAccessLink = (cp: CP) => {
    const url = `${window.location.origin}/portal/${cp.access_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Odkaz zkopírován do schránky");
  };

  const filteredCps = cps.filter(
    (cp) =>
      cp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cp.performer?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Cizí postavy</h1>
            <p className="text-muted-foreground">CP a jejich přístupy k materiálům</p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage" disabled={!selectedRunId}>
            <Plus className="mr-2 h-4 w-4" />
            Nová CP
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <Input
            placeholder="Hledat CP nebo performera..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 input-vintage"
          />
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
        ) : cps.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Tento běh zatím nemá žádné cizí postavy
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit první CP
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCps.map((cp) => (
              <PaperCard key={cp.id}>
                <PaperCardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-typewriter">{cp.name}</h4>
                      {cp.performer && (
                        <p className="text-sm text-muted-foreground">
                          Hraje: {cp.performer}
                        </p>
                      )}
                      {cp.performance_times && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {cp.performance_times}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono mt-2">
                        {cp.slug}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyAccessLink(cp)}
                        title="Kopírovat odkaz"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(cp)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCp(cp);
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
        <DialogContent className="paper-card">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedCp ? "Upravit CP" : "Nová cizí postava"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jméno CP / role</Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    slug: selectedCp ? formData.slug : generateSlug(name),
                  });
                }}
                placeholder="Tajemný cizinec"
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="tajemny-cizinec"
                className="input-vintage font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Performer (kdo hraje)</Label>
              <Input
                value={formData.performer}
                onChange={(e) => setFormData({ ...formData, performer: e.target.value })}
                placeholder="Jméno herce/herečky"
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Časy vystoupení</Label>
              <Textarea
                value={formData.performance_times}
                onChange={(e) => setFormData({ ...formData, performance_times: e.target.value })}
                placeholder="Sobota 14:00 - 16:00, Neděle 10:00 - 11:00"
                rows={2}
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>{selectedCp ? "Nové heslo (prázdné = beze změny)" : "Heslo"}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={selectedCp ? "••••••••" : "Přístupové heslo"}
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Smazat CP?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat CP <strong>{selectedCp?.name}</strong>?
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
