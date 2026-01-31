import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Copy, Loader2, CheckCircle, Circle, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Person {
  id: string;
  name: string;
  type: string;
  group_name: string | null;
}

interface Run {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  run_id: string;
  person_id: string;
  player_name: string | null;
  player_email: string | null;
  paid_at: string | null;
  access_token: string;
  persons?: { name: string; type: string; group_name: string | null };
  runs?: { name: string };
}

export default function RunAssignmentsPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    person_id: "",
    player_name: "",
    player_email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchRuns = async () => {
    if (!currentLarpId) return;
    const { data } = await supabase
      .from("runs")
      .select("id, name")
      .eq("larp_id", currentLarpId)
      .order("date_from", { ascending: false });
    setRuns(data || []);
    if (data && data.length > 0 && !selectedRunId) {
      setSelectedRunId(data[0].id);
    }
  };

  const fetchPersons = async () => {
    if (!currentLarpId) return;
    const { data } = await supabase
      .from("persons")
      .select("id, name, type, group_name")
      .eq("larp_id", currentLarpId)
      .order("type")
      .order("name");
    setPersons(data || []);
  };

  const fetchAssignments = async () => {
    if (!selectedRunId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from("run_person_assignments")
      .select("*, persons(name, type, group_name), runs(name)")
      .eq("run_id", selectedRunId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Chyba při načítání přiřazení");
      setLoading(false);
      return;
    }

    setAssignments((data as Assignment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (currentLarpId) {
      fetchRuns();
      fetchPersons();
    }
  }, [currentLarpId]);

  useEffect(() => {
    if (selectedRunId) {
      fetchAssignments();
    }
  }, [selectedRunId]);

  const openCreateDialog = () => {
    setSelectedAssignment(null);
    setFormData({ person_id: "", player_name: "", player_email: "", password: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      person_id: assignment.person_id,
      player_name: assignment.player_name || "",
      player_email: assignment.player_email || "",
      password: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.person_id) {
      toast.error("Vyberte postavu");
      return;
    }

    if (!selectedAssignment && !formData.password) {
      toast.error("Zadejte heslo pro přístup hráče");
      return;
    }

    setSaving(true);

    if (selectedAssignment) {
      const updateData: Record<string, unknown> = {
        player_name: formData.player_name || null,
        player_email: formData.player_email || null,
      };

      if (formData.password) {
        // Would need RPC to hash password - for now skip password update on edit
        toast.info("Změna hesla vyžaduje nové přiřazení");
      }

      const { error } = await supabase
        .from("run_person_assignments")
        .update(updateData)
        .eq("id", selectedAssignment.id);

      if (error) {
        toast.error("Chyba při ukládání");
        setSaving(false);
        return;
      }
      toast.success("Přiřazení upraveno");
    } else {
      // Use RPC to create assignment with hashed password
      const { error } = await supabase.rpc("create_person_assignment_with_password", {
        p_run_id: selectedRunId,
        p_person_id: formData.person_id,
        p_password: formData.password,
        p_player_name: formData.player_name || null,
        p_player_email: formData.player_email || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Tato postava je již přiřazena k tomuto běhu");
        } else {
          toast.error("Chyba při vytváření přiřazení");
        }
        setSaving(false);
        return;
      }
      toast.success("Přiřazení vytvořeno");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchAssignments();
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;

    const { error } = await supabase
      .from("run_person_assignments")
      .delete()
      .eq("id", selectedAssignment.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Přiřazení smazáno");
    setDeleteDialogOpen(false);
    fetchAssignments();
  };

  const copyAccessLink = (assignment: Assignment) => {
    const url = `${window.location.origin}/portal/${assignment.access_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Odkaz zkopírován do schránky");
  };

  const togglePaid = async (assignment: Assignment) => {
    const newPaidAt = assignment.paid_at ? null : new Date().toISOString();
    const { error } = await supabase
      .from("run_person_assignments")
      .update({ paid_at: newPaidAt })
      .eq("id", assignment.id);

    if (error) {
      toast.error("Chyba při změně stavu platby");
      return;
    }
    toast.success(newPaidAt ? "Označeno jako zaplaceno" : "Zrušeno označení zaplaceno");
    fetchAssignments();
  };

  // Get persons not yet assigned to this run
  const availablePersons = persons.filter(
    (p) => !assignments.some((a) => a.person_id === p.id) || selectedAssignment?.person_id === p.id
  );

  const filteredAssignments = assignments.filter(
    (a) =>
      a.persons?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.player_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.player_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by person type
  const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
    const type = assignment.persons?.type === "cp" ? "Cizí postavy" : "Postavy";
    if (!acc[type]) acc[type] = [];
    acc[type].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  const currentRun = runs.find((r) => r.id === selectedRunId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Přiřazení hráčů</h1>
            <p className="text-muted-foreground">
              Hráči a performeři pro běhy LARPu {currentLarp?.name}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage" disabled={!selectedRunId}>
            <Plus className="mr-2 h-4 w-4" />
            Přiřadit hráče
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="font-mono">Běh:</Label>
            <Select value={selectedRunId} onValueChange={setSelectedRunId}>
              <SelectTrigger className="w-64 input-vintage">
                <SelectValue placeholder="Vyberte běh" />
              </SelectTrigger>
              <SelectContent>
                {runs.map((run) => (
                  <SelectItem key={run.id} value={run.id}>
                    {run.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Hledat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 input-vintage"
          />
        </div>

        {!currentLarpId ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nejprve vyberte LARP</p>
            </PaperCardContent>
          </PaperCard>
        ) : runs.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nejprve vytvořte běh v sekci Běhy
              </p>
            </PaperCardContent>
          </PaperCard>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.length === 0 ? (
          <PaperCard>
            <PaperCardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Běh "{currentRun?.name}" zatím nemá žádné přiřazení hráčů
              </p>
              <Button onClick={openCreateDialog} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Přiřadit prvního hráče
              </Button>
            </PaperCardContent>
          </PaperCard>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAssignments).map(([type, typeAssignments]) => (
              <div key={type}>
                <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {type}
                  <span className="text-sm text-muted-foreground">
                    ({typeAssignments.length})
                  </span>
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {typeAssignments.map((assignment) => (
                    <PaperCard key={assignment.id}>
                      <PaperCardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-typewriter">{assignment.persons?.name}</h4>
                            {assignment.player_name && (
                              <p className="text-sm text-muted-foreground">
                                Hráč: {assignment.player_name}
                              </p>
                            )}
                            {assignment.player_email && (
                              <p className="text-xs text-muted-foreground">
                                {assignment.player_email}
                              </p>
                            )}
                            {assignment.paid_at != null && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Zaplaceno
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePaid(assignment)}
                              title={assignment.paid_at ? "Zrušit označení zaplaceno" : "Označit jako zaplaceno"}
                            >
                              {assignment.paid_at ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyAccessLink(assignment)}
                              title="Kopírovat odkaz pro hráče"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(assignment)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAssignment(assignment);
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
              {selectedAssignment ? "Upravit přiřazení" : "Přiřadit hráče k postavě"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Postava</Label>
              <Select
                value={formData.person_id}
                onValueChange={(v) => setFormData({ ...formData, person_id: v })}
                disabled={!!selectedAssignment}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue placeholder="Vyberte postavu" />
                </SelectTrigger>
                <SelectContent>
                  {availablePersons.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.type === "cp" ? "CP" : "Postava"})
                      {person.group_name && ` - ${person.group_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jméno hráče</Label>
              <Input
                value={formData.player_name}
                onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                placeholder="Jméno hráče/performera"
                className="input-vintage"
              />
            </div>

            <div className="space-y-2">
              <Label>Email hráče</Label>
              <Input
                type="email"
                value={formData.player_email}
                onChange={(e) => setFormData({ ...formData, player_email: e.target.value })}
                placeholder="email@example.com"
                className="input-vintage"
              />
            </div>

            {!selectedAssignment && (
              <div className="space-y-2">
                <Label>Heslo pro přístup</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Přístupové heslo"
                  className="input-vintage"
                />
                <p className="text-xs text-muted-foreground">
                  Toto heslo hráč použije pro přístup do portálu
                </p>
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
            <AlertDialogTitle className="font-typewriter">Zrušit přiřazení?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete zrušit přiřazení hráče k postavě <strong>{selectedAssignment?.persons?.name}</strong>?
              Hráč ztratí přístup do portálu.
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
