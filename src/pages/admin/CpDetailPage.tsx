import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  User,
  FileText,
  Medal,
  Briefcase,
  Theater,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useLarpContext } from "@/hooks/useLarpContext";
import { useRunContext } from "@/hooks/useRunContext";
import { CpSceneList, type CpScene } from "@/components/admin/CpSceneList";
import { DocumentListItem } from "@/components/admin/DocumentListItem";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { sortDocuments } from "@/lib/documentUtils";

interface CP {
  id: string;
  larp_id: string;
  slug: string;
  name: string;
  performer: string | null;
  performance_times: string | null;
  medailonek: string | null;
  mission_briefing: string | null;
  act_info: string | null;
}

interface Document {
  id: string;
  title: string;
  doc_type: string;
  target_type: string;
  target_group: string | null;
  target_person_id: string | null;
  priority: number;
  sort_order: number | null;
}

export default function CpDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { currentLarpId, currentLarp } = useLarpContext();
  const { selectedRunId, runs } = useRunContext();
  const selectedRun = runs.find((r) => r.id === selectedRunId);

  const [cp, setCp] = useState<CP | null>(null);
  const [scenes, setScenes] = useState<CpScene[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medailonekDialogOpen, setMedailonekDialogOpen] = useState(false);
  const [missionBriefingDialogOpen, setMissionBriefingDialogOpen] = useState(false);
  const [actInfoDialogOpen, setActInfoDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    performer: "",
    performance_times: "",
  });
  const [richTextContent, setRichTextContent] = useState("");

  const fetchCp = async () => {
    if (!currentLarpId || !slug) return;

    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .eq("larp_id", currentLarpId)
      .eq("slug", slug)
      .eq("type", "cp")
      .single();

    if (error || !data) {
      navigate("/admin/cp", { replace: true });
      return;
    }

    setCp(data as CP);
    setFormData({
      name: data.name,
      slug: data.slug,
      performer: data.performer || "",
      performance_times: data.performance_times || "",
    });
  };

  const fetchScenes = async () => {
    if (!cp?.id || !selectedRunId) {
      setScenes([]);
      return;
    }

    const { data, error } = await supabase
      .from("cp_scenes")
      .select("*")
      .eq("cp_id", cp.id)
      .eq("run_id", selectedRunId)
      .order("day_number")
      .order("start_time");

    if (error) {
      console.error("Error fetching scenes:", error);
      return;
    }

    setScenes((data as CpScene[]) || []);
  };

  const fetchDocuments = async () => {
    if (!currentLarpId || !cp?.id) return;

    // Fetch documents for CP group or specific to this CP
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, doc_type, target_type, target_group, target_person_id, priority, sort_order")
      .eq("larp_id", currentLarpId)
      .or(`target_type.eq.vsichni,and(target_type.eq.skupina,target_group.eq.CP),and(target_type.eq.osoba,target_person_id.eq.${cp.id})`);

    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }

    setDocuments(sortDocuments(data || []));
  };

  useEffect(() => {
    if (currentLarpId && slug) {
      setLoading(true);
      fetchCp().finally(() => setLoading(false));
    }
  }, [currentLarpId, slug]);

  useEffect(() => {
    if (cp?.id) {
      fetchScenes();
      fetchDocuments();
    }
  }, [cp?.id, selectedRunId]);

  const handleSaveBasic = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Vyplňte jméno a slug");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("persons")
      .update({
        name: formData.name,
        slug: formData.slug,
        performer: formData.performer || null,
        performance_times: formData.performance_times || null,
      })
      .eq("id", cp?.id);

    if (error) {
      if (error.code === "23505") {
        toast.error("Slug už existuje");
      } else {
        toast.error("Chyba při ukládání");
      }
      setSaving(false);
      return;
    }

    toast.success("CP upraveno");
    setSaving(false);
    setEditDialogOpen(false);

    // If slug changed, navigate to new URL
    if (formData.slug !== slug) {
      navigate(`/admin/cp/${formData.slug}`, { replace: true });
    } else {
      fetchCp();
    }
  };

  const handleSaveRichText = async (field: "medailonek" | "mission_briefing" | "act_info") => {
    setSaving(true);

    const { error } = await supabase
      .from("persons")
      .update({ [field]: richTextContent || null })
      .eq("id", cp?.id);

    if (error) {
      toast.error("Chyba při ukládání");
      setSaving(false);
      return;
    }

    toast.success("Uloženo");
    setSaving(false);
    setMedailonekDialogOpen(false);
    setMissionBriefingDialogOpen(false);
    setActInfoDialogOpen(false);
    fetchCp();
  };

  const handleDelete = async () => {
    if (!cp) return;

    const { error } = await supabase.from("persons").delete().eq("id", cp.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("CP smazáno");
    navigate("/admin/cp", { replace: true });
  };

  const openRichTextDialog = (
    field: "medailonek" | "mission_briefing" | "act_info",
    setOpen: (open: boolean) => void
  ) => {
    setRichTextContent(cp?.[field] || "");
    setOpen(true);
  };

  // Calculate run days
  const runDays = selectedRun?.date_from && selectedRun?.date_to
    ? Math.ceil(
        (new Date(selectedRun.date_to).getTime() - new Date(selectedRun.date_from).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 3;

  // Separate documents by type
  const sharedDocs = documents.filter(
    (d) => d.target_type === "vsichni" || (d.target_type === "skupina" && d.target_group === "CP")
  );
  const individualDocs = documents.filter(
    (d) => d.target_type === "osoba" && d.target_person_id === cp?.id
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!cp) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/cp")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-typewriter text-3xl tracking-wide">{cp.name}</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {cp.slug}
              </Badge>
            </div>
            {cp.performer && (
              <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                <User className="h-4 w-4" />
                Hraje: {cp.performer}
              </p>
            )}
            {cp.performance_times && (
              <p className="text-sm text-muted-foreground mt-1">
                {cp.performance_times}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Upravit
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Smazat
            </Button>
          </div>
        </div>

        {/* Rich text sections */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Medailonek */}
          <PaperCard className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openRichTextDialog("medailonek", setMedailonekDialogOpen)}>
            <PaperCardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-typewriter flex items-center gap-2">
                  <Medal className="h-4 w-4" />
                  Medailonek
                </h3>
                <Button
                  variant={cp.medailonek ? "default" : "destructive"}
                  size="sm"
                  className={cp.medailonek ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {cp.medailonek ? "✓" : "✗"}
                </Button>
              </div>
              {cp.medailonek ? (
                <div
                  className="text-sm text-muted-foreground line-clamp-3 prose-sm"
                  dangerouslySetInnerHTML={{ __html: cp.medailonek }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">Klikni pro přidání</p>
              )}
            </PaperCardContent>
          </PaperCard>

          {/* Mission Briefing */}
          <PaperCard className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openRichTextDialog("mission_briefing", setMissionBriefingDialogOpen)}>
            <PaperCardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-typewriter flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Mission Briefing
                </h3>
                <Button
                  variant={cp.mission_briefing ? "default" : "outline"}
                  size="sm"
                  className={cp.mission_briefing ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {cp.mission_briefing ? "✓" : "✗"}
                </Button>
              </div>
              {cp.mission_briefing ? (
                <div
                  className="text-sm text-muted-foreground line-clamp-3 prose-sm"
                  dangerouslySetInnerHTML={{ __html: cp.mission_briefing }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">Klikni pro přidání</p>
              )}
            </PaperCardContent>
          </PaperCard>

          {/* Act Info */}
          <PaperCard className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openRichTextDialog("act_info", setActInfoDialogOpen)}>
            <PaperCardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-typewriter flex items-center gap-2">
                  <Theater className="h-4 w-4" />
                  Act Info
                </h3>
                <Button
                  variant={cp.act_info ? "default" : "outline"}
                  size="sm"
                  className={cp.act_info ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {cp.act_info ? "✓" : "✗"}
                </Button>
              </div>
              {cp.act_info ? (
                <div
                  className="text-sm text-muted-foreground line-clamp-3 prose-sm"
                  dangerouslySetInnerHTML={{ __html: cp.act_info }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">Klikni pro přidání</p>
              )}
            </PaperCardContent>
          </PaperCard>
        </div>

        {/* Scenes section */}
        {selectedRunId ? (
          <PaperCard>
            <PaperCardContent className="py-6">
              <CpSceneList
                scenes={scenes}
                cpId={cp.id}
                runId={selectedRunId}
                runDays={runDays}
                onScenesChange={fetchScenes}
              />
            </PaperCardContent>
          </PaperCard>
        ) : (
          <PaperCard>
            <PaperCardContent className="py-6 text-center text-muted-foreground">
              Vyberte běh pro zobrazení scén
            </PaperCardContent>
          </PaperCard>
        )}

        {/* Documents section */}
        <div className="space-y-4">
          {sharedDocs.length > 0 && (
            <PaperCard>
              <PaperCardContent className="py-4">
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dokumenty společné
                </h3>
                <div className="space-y-1">
                  {sharedDocs.map((doc) => (
                    <DocumentListItem
                      key={doc.id}
                      doc={doc as never}
                      persons={[]}
                      runs={[]}
                      hiddenFromPersons={[]}
                      onEdit={() => navigate(`/admin/dokumenty?edit=${doc.id}`)}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              </PaperCardContent>
            </PaperCard>
          )}

          {individualDocs.length > 0 && (
            <PaperCard>
              <PaperCardContent className="py-4">
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dokumenty individuální
                </h3>
                <div className="space-y-1">
                  {individualDocs.map((doc) => (
                    <DocumentListItem
                      key={doc.id}
                      doc={doc as never}
                      persons={[]}
                      runs={[]}
                      hiddenFromPersons={[]}
                      onEdit={() => navigate(`/admin/dokumenty?edit=${doc.id}`)}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              </PaperCardContent>
            </PaperCard>
          )}

          {sharedDocs.length === 0 && individualDocs.length === 0 && (
            <PaperCard>
              <PaperCardContent className="py-6 text-center text-muted-foreground">
                <p>Tato CP nemá žádné přiřazené dokumenty</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/admin/dokumenty")}
                  className="mt-2"
                >
                  Přejít na dokumenty
                </Button>
              </PaperCardContent>
            </PaperCard>
          )}
        </div>
      </div>

      {/* Edit Basic Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="paper-card">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Upravit CP</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jméno CP / role</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveBasic} disabled={saving} className="btn-vintage">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rich Text Dialogs */}
      <Dialog open={medailonekDialogOpen} onOpenChange={setMedailonekDialogOpen}>
        <DialogContent className="paper-card max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Medailonek</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RichTextEditor value={richTextContent} onChange={setRichTextContent} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMedailonekDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={() => handleSaveRichText("medailonek")} disabled={saving} className="btn-vintage">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={missionBriefingDialogOpen} onOpenChange={setMissionBriefingDialogOpen}>
        <DialogContent className="paper-card max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Mission Briefing</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RichTextEditor value={richTextContent} onChange={setRichTextContent} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMissionBriefingDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={() => handleSaveRichText("mission_briefing")} disabled={saving} className="btn-vintage">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actInfoDialogOpen} onOpenChange={setActInfoDialogOpen}>
        <DialogContent className="paper-card max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-typewriter">Act Info</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RichTextEditor value={richTextContent} onChange={setRichTextContent} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActInfoDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={() => handleSaveRichText("act_info")} disabled={saving} className="btn-vintage">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              Opravdu chcete smazat CP <strong>{cp.name}</strong>? Tato akce je nevratná.
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
