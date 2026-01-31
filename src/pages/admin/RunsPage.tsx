import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Loader2, Calendar, ArrowLeft, Users, Copy, CheckCircle, Circle, Mail, Phone } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLarpContext } from "@/hooks/useLarpContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  payment_account?: string | null;
  payment_amount?: string | null;
  payment_due_date?: string | null;
  larps?: { name: string };
}

interface Person {
  id: string;
  name: string;
  type: string;
  group_name: string | null;
  slug: string;
}

interface Assignment {
  id: string;
  run_id: string;
  person_id: string;
  player_name: string | null;
  player_email: string | null;
  player_phone: string | null;
  paid_at: string | null;
  access_token: string;
  persons?: { name: string; type: string; group_name: string | null; slug: string };
}

export default function RunsPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { currentLarpId, currentLarp } = useLarpContext();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [detailRun, setDetailRun] = useState<Run | null>(null);
  
  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteAssignDialogOpen, setDeleteAssignDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignFormData, setAssignFormData] = useState({
    person_id: "",
    player_name: "",
    player_email: "",
    player_phone: "",
    password: "",
  });
  const [assignSaving, setAssignSaving] = useState(false);

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
    payment_account: "",
    payment_amount: "",
    payment_due_date: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchRuns = async () => {
    if (!currentLarpId) {
      setRuns([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("runs")
      .select("*, larps(name)")
      .eq("larp_id", currentLarpId)
      .order("date_from", { ascending: false });

    if (error) {
      toast.error("Chyba při načítání běhů");
      setLoading(false);
      return;
    }

    setRuns(data || []);
    setLoading(false);
  };

  const fetchPersons = async () => {
    if (!currentLarpId) return;
    const { data } = await supabase
      .from("persons")
      .select("id, name, type, group_name, slug")
      .eq("larp_id", currentLarpId)
      .order("type")
      .order("name");
    setPersons(data || []);
  };

  const fetchAssignments = async (runId: string) => {
    setAssignmentsLoading(true);
    const { data, error } = await supabase
      .from("run_person_assignments")
      .select("*, persons(name, type, group_name, slug)")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Chyba při načítání přiřazení");
      setAssignmentsLoading(false);
      return;
    }

    setAssignments((data as Assignment[]) || []);
    setAssignmentsLoading(false);
  };

  useEffect(() => {
    fetchRuns();
    fetchPersons();
  }, [currentLarpId]);

  // Handle detail view from URL param
  useEffect(() => {
    if (slug && runs.length > 0) {
      const run = runs.find((r) => r.slug === slug);
      if (run) {
        setDetailRun(run);
        fetchAssignments(run.id);
      } else {
        navigate("/admin/behy", { replace: true });
      }
    } else if (!slug) {
      setDetailRun(null);
      setAssignments([]);
    }
  }, [slug, runs, navigate]);

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
      larp_id: currentLarpId ?? "",
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
      payment_account: "",
      payment_amount: "",
      payment_due_date: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (run: Run, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      payment_account: run.payment_account || "",
      payment_amount: run.payment_amount || "",
      payment_due_date: run.payment_due_date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.larp_id) {
      toast.error("Vyplňte název a slug");
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
      payment_account: formData.payment_account?.trim() || null,
      payment_amount: formData.payment_amount?.trim() || null,
      payment_due_date: formData.payment_due_date || null,
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
    if (detailRun?.id === selectedRun.id) {
      navigate("/admin/behy", { replace: true });
    }
    fetchRuns();
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("cs-CZ");
  };

  const handleCardClick = (run: Run) => {
    navigate(`/admin/behy/${run.slug}`);
  };

  // Assignment functions
  const openAssignDialog = () => {
    setSelectedAssignment(null);
    setAssignFormData({ person_id: "", player_name: "", player_email: "", player_phone: "", password: "" });
    setAssignDialogOpen(true);
  };

  const openEditAssignDialog = (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssignment(assignment);
    setAssignFormData({
      person_id: assignment.person_id,
      player_name: assignment.player_name || "",
      player_email: assignment.player_email || "",
      player_phone: assignment.player_phone || "",
      password: "",
    });
    setAssignDialogOpen(true);
  };

  const handleAssignSave = async () => {
    if (!assignFormData.person_id || !detailRun) {
      toast.error("Vyberte postavu");
      return;
    }

    if (!selectedAssignment && !assignFormData.password) {
      toast.error("Zadejte heslo pro přístup hráče");
      return;
    }

    setAssignSaving(true);

    if (selectedAssignment) {
      const updateData: Record<string, unknown> = {
        person_id: assignFormData.person_id,
        player_name: assignFormData.player_name || null,
        player_email: assignFormData.player_email || null,
        player_phone: assignFormData.player_phone || null,
      };

      if (assignFormData.password) {
        toast.info("Změna hesla vyžaduje nové přiřazení");
      }

      const { error } = await supabase
        .from("run_person_assignments")
        .update(updateData)
        .eq("id", selectedAssignment.id);

      if (error) {
        toast.error("Chyba při ukládání");
        setAssignSaving(false);
        return;
      }
      toast.success("Přiřazení upraveno");
    } else {
      const { error } = await supabase.rpc("create_person_assignment_with_password", {
        p_run_id: detailRun.id,
        p_person_id: assignFormData.person_id,
        p_password: assignFormData.password,
        p_player_name: assignFormData.player_name || null,
        p_player_email: assignFormData.player_email || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Tato postava je již přiřazena k tomuto běhu");
        } else {
          toast.error("Chyba při vytváření přiřazení");
        }
        setAssignSaving(false);
        return;
      }
      toast.success("Přiřazení vytvořeno");
    }

    setAssignSaving(false);
    setAssignDialogOpen(false);
    fetchAssignments(detailRun.id);
  };

  const handleAssignDelete = async () => {
    if (!selectedAssignment || !detailRun) return;

    const { error } = await supabase
      .from("run_person_assignments")
      .delete()
      .eq("id", selectedAssignment.id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Přiřazení smazáno");
    setDeleteAssignDialogOpen(false);
    fetchAssignments(detailRun.id);
  };

  const copyAccessLink = (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/portal/${assignment.access_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Odkaz zkopírován do schránky");
  };

  const togglePaid = async (assignment: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!detailRun) return;
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
    fetchAssignments(detailRun.id);
  };

  const handleAssignRowClick = (assignment: Assignment) => {
    const type = assignment.persons?.type;
    const personSlug = assignment.persons?.slug;
    if (type === "cp") {
      navigate(`/admin/cp/${personSlug}`);
    } else {
      navigate(`/admin/osoby/${personSlug}`);
    }
  };

  // Get available persons for assignment
  const availablePersons = persons.filter(
    (p) => !assignments.some((a) => a.person_id === p.id) || selectedAssignment?.person_id === p.id
  );

  // Sort and group assignments
  const sortByPersonName = (a: Assignment, b: Assignment) => {
    return (a.persons?.name || "").localeCompare(b.persons?.name || "");
  };

  const postavyAssignments = assignments
    .filter((a) => a.persons?.type === "postava")
    .sort(sortByPersonName);
  
  const cpAssignments = assignments
    .filter((a) => a.persons?.type === "cp")
    .sort(sortByPersonName);

  const renderAssignmentTable = (typeAssignments: Assignment[], title: string) => (
    <div>
      <h3 className="font-typewriter text-lg mb-3 flex items-center gap-2">
        <Users className="h-4 w-4" />
        {title}
        <span className="text-sm text-muted-foreground">
          ({typeAssignments.length})
        </span>
      </h3>
      <PaperCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Postava</TableHead>
              <TableHead>Hráč</TableHead>
              <TableHead className="w-20 text-center">Kontakt</TableHead>
              <TableHead className="w-20 text-center">Zaplaceno</TableHead>
              <TableHead className="w-32 text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {typeAssignments.map((assignment) => (
              <TableRow
                key={assignment.id}
                className="cursor-pointer"
                onClick={() => handleAssignRowClick(assignment)}
              >
                <TableCell className="font-typewriter">
                  {assignment.persons?.name}
                  {assignment.persons?.group_name && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({assignment.persons.group_name})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {assignment.player_name || (
                    <span className="text-muted-foreground italic">nepřiřazeno</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    {assignment.player_phone ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`tel:${assignment.player_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{assignment.player_phone}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {assignment.player_email ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`mailto:${assignment.player_email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{assignment.player_email}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {!assignment.player_phone && !assignment.player_email && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => togglePaid(assignment, e)}
                    title={assignment.paid_at ? "Zrušit označení zaplaceno" : "Označit jako zaplaceno"}
                  >
                    {assignment.paid_at ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => copyAccessLink(assignment, e)}
                      title="Kopírovat odkaz pro hráče"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => openEditAssignDialog(assignment, e)}
                      title="Upravit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAssignment(assignment);
                        setDeleteAssignDialogOpen(true);
                      }}
                      title="Smazat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PaperCard>
    </div>
  );

  // Detail view
  if (detailRun) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/behy")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="font-typewriter text-3xl tracking-wide">{detailRun.name}</h1>
                {detailRun.is_active && (
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded">
                    Aktivní
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {formatDate(detailRun.date_from)} – {formatDate(detailRun.date_to)}
                {detailRun.location && ` • ${detailRun.location}`}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => openEditDialog(detailRun)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Upravit běh
            </Button>
          </div>

          <Tabs defaultValue="assignments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="assignments">Přiřazení hráčů</TabsTrigger>
              <TabsTrigger value="info">Informace o běhu</TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="space-y-6">
              <div className="flex justify-end">
                <Button onClick={openAssignDialog} className="btn-vintage">
                  <Plus className="mr-2 h-4 w-4" />
                  Přiřadit hráče
                </Button>
              </div>

              {assignmentsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <PaperCard>
                  <PaperCardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      Tento běh zatím nemá žádné přiřazení hráčů
                    </p>
                    <Button onClick={openAssignDialog} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Přiřadit prvního hráče
                    </Button>
                  </PaperCardContent>
                </PaperCard>
              ) : (
                <div className="space-y-8">
                  {postavyAssignments.length > 0 && renderAssignmentTable(postavyAssignments, "Postavy")}
                  {cpAssignments.length > 0 && renderAssignmentTable(cpAssignments, "Cizí postavy")}
                </div>
              )}
            </TabsContent>

            <TabsContent value="info">
              <PaperCard>
                <PaperCardContent className="py-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Slug</Label>
                      <p className="font-mono">{detailRun.slug}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Lokace</Label>
                      <p>{detailRun.location || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Adresa</Label>
                      <p>{detailRun.address || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Kontakt</Label>
                      <p>{detailRun.contact || "-"}</p>
                    </div>
                    {detailRun.mission_briefing && (
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Mission Briefing</Label>
                        <p className="whitespace-pre-wrap">{detailRun.mission_briefing}</p>
                      </div>
                    )}
                    {detailRun.payment_amount && (
                      <>
                        <div>
                          <Label className="text-muted-foreground">Cena</Label>
                          <p>{detailRun.payment_amount}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Účet</Label>
                          <p className="font-mono">{detailRun.payment_account || "-"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Splatnost</Label>
                          <p>{formatDate(detailRun.payment_due_date || null)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </PaperCardContent>
              </PaperCard>
            </TabsContent>
          </Tabs>
        </div>

        {/* Assignment Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
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
                  value={assignFormData.person_id}
                  onValueChange={(v) => setAssignFormData({ ...assignFormData, person_id: v })}
                >
                  <SelectTrigger className="input-vintage">
                    <SelectValue placeholder="Vyberte postavu" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedAssignment ? persons : availablePersons).map((person) => (
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
                  value={assignFormData.player_name}
                  onChange={(e) => setAssignFormData({ ...assignFormData, player_name: e.target.value })}
                  placeholder="Jméno hráče/performera"
                  className="input-vintage"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefon hráče</Label>
                  <Input
                    type="tel"
                    value={assignFormData.player_phone}
                    onChange={(e) => setAssignFormData({ ...assignFormData, player_phone: e.target.value })}
                    placeholder="+420 123 456 789"
                    className="input-vintage"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email hráče</Label>
                  <Input
                    type="email"
                    value={assignFormData.player_email}
                    onChange={(e) => setAssignFormData({ ...assignFormData, player_email: e.target.value })}
                    placeholder="email@example.com"
                    className="input-vintage"
                  />
                </div>
              </div>

              {!selectedAssignment && (
                <div className="space-y-2">
                  <Label>Heslo pro přístup</Label>
                  <Input
                    type="password"
                    value={assignFormData.password}
                    onChange={(e) => setAssignFormData({ ...assignFormData, password: e.target.value })}
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
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={handleAssignSave} disabled={assignSaving} className="btn-vintage">
                {assignSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Uložit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Assignment Dialog */}
        <AlertDialog open={deleteAssignDialogOpen} onOpenChange={setDeleteAssignDialogOpen}>
          <AlertDialogContent className="paper-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-typewriter">Smazat přiřazení?</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat přiřazení hráče k postavě{" "}
                <strong>{selectedAssignment?.persons?.name}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAssignDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Smazat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Run Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="paper-card max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-typewriter">Upravit běh</DialogTitle>
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

              <div className="border-t pt-4 mt-4 space-y-3">
                <h4 className="font-typewriter text-sm font-medium">Platba (pro hráče)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transparentní účet</Label>
                    <Input
                      value={formData.payment_account}
                      onChange={(e) => setFormData({ ...formData, payment_account: e.target.value })}
                      placeholder="např. 123456789/0800"
                      className="input-vintage font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cena (text)</Label>
                    <Input
                      value={formData.payment_amount}
                      onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                      placeholder="např. 500 Kč"
                      className="input-vintage"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Datum splatnosti</Label>
                  <Input
                    type="date"
                    value={formData.payment_due_date}
                    onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
                    className="input-vintage w-48"
                  />
                </div>
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

        {/* Delete Run Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="paper-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-typewriter">Smazat běh?</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat běh <strong>{selectedRun?.name}</strong>?
                Tato akce smaže i všechna přiřazení hráčů tohoto běhu.
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

  // List view
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Běhy</h1>
            <p className="text-muted-foreground">
              Jednotlivá uvedení LARPu {currentLarp?.name}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="btn-vintage" disabled={!currentLarpId}>
            <Plus className="mr-2 h-4 w-4" />
            Nový běh
          </Button>
        </div>

        {/* Content */}
        {loading ? (
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
              <PaperCard 
                key={run.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCardClick(run)}
              >
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
                        onClick={(e) => openEditDialog(run, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
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

            <div className="border-t pt-4 mt-4 space-y-3">
              <h4 className="font-typewriter text-sm font-medium">Platba (pro hráče)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transparentní účet</Label>
                  <Input
                    value={formData.payment_account}
                    onChange={(e) => setFormData({ ...formData, payment_account: e.target.value })}
                    placeholder="např. 123456789/0800"
                    className="input-vintage font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cena (text)</Label>
                  <Input
                    value={formData.payment_amount}
                    onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                    placeholder="např. 500 Kč"
                    className="input-vintage"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Datum splatnosti</Label>
                <Input
                  type="date"
                  value={formData.payment_due_date}
                  onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
                  className="input-vintage w-48"
                />
              </div>
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
              Tato akce smaže i všechna přiřazení hráčů tohoto běhu.
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
