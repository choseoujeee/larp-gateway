import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Filter, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { CpCard } from "@/components/admin/CpCard";
import { detectPerformerConflicts, getCpIdsWithConflicts } from "@/lib/cpUtils";

interface CP {
  id: string;
  larp_id: string;
  slug: string;
  name: string;
  performer: string | null;
  performance_times: string | null;
}

interface CpPerformer {
  cp_id: string;
  performer_name: string;
}

interface CpSceneRow {
  cp_id: string;
  day_number: number;
  start_time: string;
}

interface Document {
  target_type: string;
  target_group: string | null;
  target_person_id: string | null;
}

export default function CpPage() {
  const navigate = useNavigate();
  const { currentLarpId, currentLarp } = useLarpContext();
  const { selectedRunId } = useRunContext();
  const [cps, setCps] = useState<CP[]>([]);
  const [performers, setPerformers] = useState<CpPerformer[]>([]);
  const [scenes, setScenes] = useState<CpSceneRow[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCp, setSelectedCp] = useState<CP | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [filterPerformer, setFilterPerformer] = useState<string>("");
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterTimeFrom, setFilterTimeFrom] = useState<string>("");
  const [filterTimeTo, setFilterTimeTo] = useState<string>("");
  const [conflictCpIds, setConflictCpIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    performer: "",
    performance_times: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCps = async () => {
    if (!currentLarpId) return;
    
    const { data, error } = await supabase
      .from("persons")
      .select("id, larp_id, slug, name, performer, performance_times")
      .eq("larp_id", currentLarpId)
      .eq("type", "cp")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Chyba při načítání CP");
      return;
    }

    setCps(data || []);
    setLoading(false);
  };

  const fetchPerformers = async () => {
    if (!selectedRunId) {
      setPerformers([]);
      return;
    }
    const { data } = await supabase
      .from("cp_performers")
      .select("cp_id, performer_name")
      .eq("run_id", selectedRunId);
    setPerformers((data as CpPerformer[]) || []);
  };

  /** Přiřazení CP k běhu: person_id -> player_name („Hraje:“ z běhu – Přiřadit CP) */
  const [runAssignmentsPerformer, setRunAssignmentsPerformer] = useState<Record<string, string>>({});
  const fetchRunAssignmentsPerformer = async () => {
    if (!selectedRunId) {
      setRunAssignmentsPerformer({});
      return;
    }
    const { data } = await supabase
      .from("run_person_assignments")
      .select("person_id, player_name")
      .eq("run_id", selectedRunId);
    const map: Record<string, string> = {};
    (data || []).forEach((row: { person_id: string; player_name: string | null }) => {
      if (row.player_name?.trim()) map[row.person_id] = row.player_name.trim();
    });
    setRunAssignmentsPerformer(map);
  };

  const fetchScenes = async () => {
    if (!selectedRunId) {
      setScenes([]);
      return;
    }
    const { data } = await supabase
      .from("cp_scenes")
      .select("cp_id, day_number, start_time")
      .eq("run_id", selectedRunId)
      .order("day_number")
      .order("start_time");
    setScenes((data as CpSceneRow[]) || []);
  };

  const fetchDocuments = async () => {
    if (!currentLarpId) return;
    const { data } = await supabase
      .from("documents")
      .select("target_type, target_group, target_person_id")
      .eq("larp_id", currentLarpId);
    setDocuments((data as Document[]) || []);
  };

  useEffect(() => {
    if (currentLarpId) {
      setLoading(true);
      Promise.all([fetchCps(), fetchDocuments()]).finally(() => setLoading(false));
    }
  }, [currentLarpId]);

  useEffect(() => {
    fetchPerformers();
    fetchScenes();
    fetchRunAssignmentsPerformer();
  }, [selectedRunId]);

  useEffect(() => {
    if (!selectedRunId) {
      setConflictCpIds(new Set());
      return;
    }
    detectPerformerConflicts(selectedRunId).then((conflicts) => {
      setConflictCpIds(getCpIdsWithConflicts(conflicts));
    });
  }, [selectedRunId, performers, scenes]);

  const getPerformer = (cpId: string) => performers.find((p) => p.cp_id === cpId);

  /** „Hraje:“ pro CP v běhu: nejdřív přiřazení z běhu (player_name), pak cp_performers, pak persons.performer */
  const getPerformerName = (cp: CP) =>
    runAssignmentsPerformer[cp.id] ?? getPerformer(cp.id)?.performer_name ?? cp.performer ?? null;

  const getScenesCount = (cpId: string) => scenes.filter((s) => s.cp_id === cpId).length;

  const getSceneTimesSummary = (cpId: string): string | null => {
    const cpScenes = scenes.filter((s) => s.cp_id === cpId);
    if (cpScenes.length === 0) return null;
    return cpScenes
      .map((s) => `Den ${s.day_number} ${s.start_time.substring(0, 5)}`)
      .join(", ");
  };
  
  /** Počet jen individuálních dokumentů pro tuto CP (ne společné pro všechny CP). */
  const getDocumentsCount = (cpId: string) => {
    return documents.filter((d) => d.target_type === "osoba" && d.target_person_id === cpId).length;
  };

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

  const openEditDialog = (cp: CP, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      await supabase
        .from("run_person_assignments")
        .update({ player_name: formData.performer?.trim() || null })
        .eq("person_id", selectedCp.id);
      toast.success("CP upraveno");
      fetchRunAssignmentsPerformer();
    } else {
      const { error } = await supabase.from("persons").insert({
        larp_id: currentLarpId,
        type: "cp" as const,
        name: formData.name,
        slug: formData.slug,
        performer: formData.performer || null,
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

  const handleCardClick = (cp: CP) => {
    navigate(`/admin/cp/${cp.slug}`);
  };

  const uniquePerformers = Array.from(
    new Set([
      ...cps.map((c) => getPerformerName(c)).filter((p): p is string => !!p),
      ...Object.values(runAssignmentsPerformer),
    ])
  ).sort((a, b) => a.localeCompare(b));
  const uniqueSceneDays = Array.from(new Set(scenes.map((s) => s.day_number))).sort((a, b) => a - b);

  const filteredCps = cps.filter((cp) => {
    const perfName = getPerformerName(cp);
    const matchesSearch =
      !searchTerm.trim() ||
      cp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (perfName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesUnassigned = !showOnlyUnassigned || !perfName;

    if (filterPerformer) {
      if ((perfName || "") !== filterPerformer) return false;
    }

    const cpScenesList = scenes.filter((s) => s.cp_id === cp.id);
    const dayNumFilter = filterDay === "" ? null : parseInt(filterDay, 10);
    if (dayNumFilter != null && !cpScenesList.some((s) => s.day_number === dayNumFilter)) return false;

    const timeFrom = filterTimeFrom.trim().substring(0, 5);
    const timeTo = filterTimeTo.trim().substring(0, 5);
    if (timeFrom && !cpScenesList.some((s) => s.start_time.substring(0, 5) >= timeFrom)) return false;
    if (timeTo && !cpScenesList.some((s) => s.start_time.substring(0, 5) <= timeTo)) return false;

    return matchesSearch && matchesUnassigned;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Cizí postavy</h1>
            <p className="text-muted-foreground">
              CP a NPC pro LARP {currentLarp?.name}
            </p>
          </div>
          <div className="flex gap-2">
            {currentLarp?.slug && (
              <Button
                variant="outline"
                asChild
              >
                <a
                  href={`${window.location.origin}/cp/${currentLarp.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Portál pro všechny CP
                </a>
              </Button>
            )}
            <Button onClick={openCreateDialog} className="btn-vintage" disabled={!currentLarpId}>
              <Plus className="mr-2 h-4 w-4" />
              Nová CP
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Label htmlFor="cp-search" className="text-sm text-muted-foreground">
                Vyhledat
              </Label>
              <Input
                id="cp-search"
                placeholder="Podle názvu nebo performera..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 input-vintage w-full"
              />
            </div>
            {selectedRunId && (
              <>
                <div className="w-[180px]">
                  <Label htmlFor="cp-filter-performer" className="text-sm text-muted-foreground">
                    Performer
                  </Label>
                  <Select value={filterPerformer || "all"} onValueChange={(v) => setFilterPerformer(v === "all" ? "" : v)}>
                    <SelectTrigger id="cp-filter-performer" className="mt-1 input-vintage">
                      <SelectValue placeholder="Všichni" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všichni</SelectItem>
                      {uniquePerformers.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[100px]">
                  <Label htmlFor="cp-filter-day" className="text-sm text-muted-foreground">
                    Den scény
                  </Label>
                  <Select value={filterDay || "all"} onValueChange={(v) => setFilterDay(v === "all" ? "" : v)}>
                    <SelectTrigger id="cp-filter-day" className="mt-1 input-vintage">
                      <SelectValue placeholder="Vše" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Vše</SelectItem>
                      {uniqueSceneDays.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Den {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[100px]">
                  <Label htmlFor="cp-filter-time-from" className="text-sm text-muted-foreground">
                    Čas od
                  </Label>
                  <Input
                    id="cp-filter-time-from"
                    type="time"
                    value={filterTimeFrom}
                    onChange={(e) => setFilterTimeFrom(e.target.value)}
                    className="mt-1 input-vintage"
                  />
                </div>
                <div className="w-[100px]">
                  <Label htmlFor="cp-filter-time-to" className="text-sm text-muted-foreground">
                    Čas do
                  </Label>
                  <Input
                    id="cp-filter-time-to"
                    type="time"
                    value={filterTimeTo}
                    onChange={(e) => setFilterTimeTo(e.target.value)}
                    className="mt-1 input-vintage"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unassigned"
                    checked={showOnlyUnassigned}
                    onCheckedChange={(checked) => setShowOnlyUnassigned(checked === true)}
                  />
                  <Label htmlFor="unassigned" className="text-sm cursor-pointer flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Jen nepřiřazené
                  </Label>
                </div>
              </>
            )}
          </div>
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
        ) : cps.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Tento LARP zatím nemá žádné cizí postavy
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
                <CpCard
                  key={cp.id}
                  name={cp.name}
                  slug={cp.slug}
                  performerName={getPerformerName(cp) || undefined}
                  sceneTimesSummary={getSceneTimesSummary(cp.id)}
                  scenesCount={getScenesCount(cp.id)}
                  documentsCount={getDocumentsCount(cp.id)}
                  hasConflict={conflictCpIds.has(cp.id)}
                  onClick={() => handleCardClick(cp)}
                  onEdit={(e) => openEditDialog(cp, e)}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setSelectedCp(cp);
                    setDeleteDialogOpen(true);
                  }}
                />
            ))}
          </div>
        )}
      </div>

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
              <Label>Performer (kdo hraje - globálně)</Label>
              <Input
                value={formData.performer}
                onChange={(e) => setFormData({ ...formData, performer: e.target.value })}
                placeholder="Jméno herce/herečky"
                className="input-vintage"
              />
              <p className="text-xs text-muted-foreground">
                Pro přiřazení k běhu použij detail CP
              </p>
            </div>

            {!selectedCp && (
              <div className="space-y-2">
                <Label>Heslo</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Přístupové heslo"
                  className="input-vintage"
                />
              </div>
            )}
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
