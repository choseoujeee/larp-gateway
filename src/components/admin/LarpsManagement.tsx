import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Check } from "lucide-react";
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
import { useLarpContext } from "@/hooks/useLarpContext";
import { toast } from "sonner";

export interface LarpRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  theme: string | null;
  motto: string | null;
  footer_text: string | null;
  created_at: string;
}

const THEME_OPTIONS = [
  { value: "wwii", label: "WWII / historie" },
  { value: "fantasy", label: "Fantasy" },
];

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface LarpsManagementProps {
  title: string;
  subtitle: string;
  /** Zobrazit hero kartu „Začněte tvořit“ / Nový LARP nad seznamem */
  showHeroCard?: boolean;
  /** Zobrazit sekci „Jak to funguje“ pro organizátora */
  showHowItWorks?: boolean;
}

export function LarpsManagement({
  title,
  subtitle,
  showHeroCard = false,
  showHowItWorks = false,
}: LarpsManagementProps) {
  const { user, session } = useAuth();
  const { currentLarpId, setCurrentLarpId, fetchLarps: refreshContext } = useLarpContext();
  const navigate = useNavigate();
  const [larps, setLarps] = useState<LarpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLarp, setSelectedLarp] = useState<LarpRow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    theme: "wwii",
    motto: "",
    footer_text: "",
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

  const openCreateDialog = () => {
    setSelectedLarp(null);
    setFormData({ name: "", slug: "", description: "", theme: "wwii", motto: "", footer_text: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (larp: LarpRow) => {
    setSelectedLarp(larp);
    setFormData({
      name: larp.name,
      slug: larp.slug,
      description: larp.description || "",
      theme: larp.theme && ["wwii", "fantasy"].includes(larp.theme) ? larp.theme : "wwii",
      motto: larp.motto || "",
      footer_text: larp.footer_text || "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (larp: LarpRow) => {
    setSelectedLarp(larp);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Vyplňte název a slug");
      return;
    }
    if (!selectedLarp && !session?.user?.id) {
      toast.error("Pro vytvoření LARPu se musíte přihlásit");
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
          motto: formData.motto || null,
          footer_text: formData.footer_text.trim() || null,
        })
        .eq("id", selectedLarp.id);
      if (error) {
        toast.error("Chyba při ukládání", { description: error.message });
        setSaving(false);
        return;
      }
      toast.success("LARP upraven");
    } else {
      const { error } = await supabase.from("larps").insert({
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        theme: formData.theme || null,
        motto: formData.motto || null,
        footer_text: formData.footer_text.trim() || null,
        owner_id: user?.id,
      });
      if (error) {
        if (error.code === "23505") toast.error("Slug už existuje", { description: "Zvolte jiný slug" });
        else toast.error("Chyba při vytváření", { description: error.message });
        setSaving(false);
        return;
      }
      toast.success("LARP vytvořen");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchLarps();
    refreshContext();
  };

  const handleSelectLarp = (larpId: string) => {
    setCurrentLarpId(larpId);
    navigate("/admin");
    toast.success("LARP přepnut");
  };

  const handleDelete = async () => {
    if (!selectedLarp) return;
    const { error } = await supabase.from("larps").delete().eq("id", selectedLarp.id);
    if (error) {
      toast.error("Chyba při mazání", { description: error.message });
      return;
    }
    if (selectedLarp.id === currentLarpId) setCurrentLarpId(null);
    toast.success("LARP smazán");
    setDeleteDialogOpen(false);
    setSelectedLarp(null);
    fetchLarps();
    refreshContext();
  };

  return (
    <div className="space-y-8">
      {/* Header + seznam */}
      <div className="space-y-6">
        <div>
          <h1 className="font-typewriter text-3xl tracking-wide mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {larps.map((larp) => {
              const isActive = larp.id === currentLarpId;
              return (
                <PaperCard
                  key={larp.id}
                  onClick={() => handleSelectLarp(larp.id)}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    isActive ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <PaperCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {isActive && <Check className="h-5 w-5 text-primary" />}
                        <PaperCardTitle className="text-lg">{larp.name}</PaperCardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(larp);
                          }}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(larp);
                          }}
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
              );
            })}
            {/* Karta „Začněte tvořit“ na konci přehledu – stejná velikost jako LARP karty */}
            <PaperCard
              onClick={openCreateDialog}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 bg-primary/5 border-primary/20 flex flex-col"
            >
              <PaperCardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <PaperCardTitle className="text-lg">Začněte tvořit nový LARP</PaperCardTitle>
                </div>
              </PaperCardHeader>
              <PaperCardContent className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Vytvořte nový LARP nebo vyberte existující kartu výše a přepněte do jeho administrace.
                </p>
              </PaperCardContent>
            </PaperCard>
          </div>
        )}
      </div>

      {/* Jak to funguje – instrukce pro organizátora */}
      {showHowItWorks && (
        <PaperCard>
          <PaperCardContent className="pt-6">
            <h2 className="font-typewriter text-xl mb-4 tracking-wide">Jak to funguje</h2>
            <p className="text-sm text-muted-foreground mb-4">
              LARP Portál slouží k přípravě živých akčních her a ke sdílení informací s hráči a cizími postavami (CP).
            </p>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                <strong className="text-foreground">LARP a běhy.</strong> Každá hra má jeden LARP; pod ním zakládáte běhy (konkrétní termíny). V sekci Běhy přiřadíte hráče k postavám a CP k performerům.
              </li>
              <li>
                <strong className="text-foreground">Postavy a CP.</strong> V Postavách vytvoříte hráčské role, v Cizích postavách role pro CP. Každé postavě/CP můžete přiřadit dokumenty a u CP i scény (vstupy do hry).
              </li>
              <li>
                <strong className="text-foreground">Dokumenty.</strong> Herní texty, briefinky a materiály se zakládají v Dokumentech a cílí na konkrétní postavu, skupinu nebo všechny. Zobrazí se na portálu po přihlášení.
              </li>
              <li>
                <strong className="text-foreground">Harmonogram.</strong> V Harmonogramu skládáte program běhu: CP vstupy, materiály (hlášení, filmy), organizační bloky. Čas a délku lze upravovat přetažením.
              </li>
              <li>
                <strong className="text-foreground">Portály.</strong> Hráči a CP dostanou odkaz na portál (podle slugu). Po přihlášení vidí své dokumenty, scény a harmonogram. Produkce a harmonogram lze zpřístupnit i samostatnými odkazy s heslem.
              </li>
            </ol>
            <p className="text-sm text-muted-foreground mt-4">
              Vyberte LARP výběrem karty výše; pak v postranním menu přejděte do Běhů, Postav, Dokumentů nebo Harmonogramu.
            </p>
          </PaperCardContent>
        </PaperCard>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="paper-card max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-typewriter">
              {selectedLarp ? "Upravit LARP" : "Nový LARP"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto max-h-[70vh] pr-1">
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
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
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
              <Label htmlFor="motto">Motto</Label>
              <Input
                id="motto"
                value={formData.motto}
                onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                placeholder="Úvodní citát nebo motto hry..."
                className="input-vintage"
              />
              <p className="text-xs text-muted-foreground">
                Zobrazí se na hráčském portálu pod názvem LARPu
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer_text">Zápatí portálu</Label>
              <Textarea
                id="footer_text"
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                placeholder="Text v zápatí portálu (hráči i CP). Můžete psát na více řádků."
                rows={3}
                className="input-vintage"
              />
              <p className="text-xs text-muted-foreground">
                Zobrazí se dole na hráčském i CP portálu. Řádky se zachovají.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">
              Smazat LARP?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat LARP <strong>{selectedLarp?.name}</strong>? Tato akce je
              nevratná a smaže i všechny běhy, postavy a dokumenty.
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
    </div>
  );
}
