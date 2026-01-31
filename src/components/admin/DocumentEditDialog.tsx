import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { DOCUMENT_TYPES, TARGET_TYPES } from "@/lib/constants";
import { RunOption } from "@/hooks/useRunContext";

interface Person {
  id: string;
  name: string;
  group_name: string | null;
  type: string;
}

interface Document {
  id: string;
  larp_id: string;
  run_id: string | null;
  title: string;
  content: string | null;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: keyof typeof TARGET_TYPES;
  target_group: string | null;
  target_person_id: string | null;
  sort_order: number;
  priority: number;
  visibility_mode: string;
  visible_days_before: number | null;
}

interface DocumentFormData {
  title: string;
  content: string;
  doc_type: keyof typeof DOCUMENT_TYPES;
  target_type: keyof typeof TARGET_TYPES;
  target_group: string;
  target_person_id: string;
  sort_order: number;
  priority: number;
  run_id: string;
  visibility_mode: string;
  visible_days_before: number;
}

interface DocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  larpId: string;
  persons: Person[];
  groups: string[];
  runs: RunOption[];
  onSaved: () => void;
  /** Pre-fill form with specific values (for new individual documents) */
  defaultValues?: Partial<DocumentFormData>;
}

const defaultFormData: DocumentFormData = {
  title: "",
  content: "",
  doc_type: "postava",
  target_type: "osoba",
  target_group: "",
  target_person_id: "",
  sort_order: 0,
  priority: 2,
  run_id: "__all__",
  visibility_mode: "immediate",
  visible_days_before: 7,
};

export function DocumentEditDialog({
  open,
  onOpenChange,
  document,
  larpId,
  persons,
  groups,
  runs,
  onSaved,
  defaultValues,
}: DocumentEditDialogProps) {
  const [formData, setFormData] = useState<DocumentFormData>(defaultFormData);
  const [hiddenFromPersonIds, setHiddenFromPersonIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return;

    if (document) {
      // Editing existing document
      setFormData({
        title: document.title,
        content: document.content || "",
        doc_type: document.doc_type,
        target_type: document.target_type,
        target_group: document.target_group || "",
        target_person_id: document.target_person_id || "",
        sort_order: document.sort_order,
        priority: document.priority ?? 2,
        run_id: document.run_id || "__all__",
        visibility_mode: document.visibility_mode || "immediate",
        visible_days_before: document.visible_days_before ?? 7,
      });
      // Fetch hidden persons
      supabase
        .from("hidden_documents")
        .select("person_id")
        .eq("document_id", document.id)
        .then(({ data }) => {
          setHiddenFromPersonIds((data ?? []).map((r) => r.person_id));
        });
    } else {
      // New document - use defaults with any overrides
      setFormData({
        ...defaultFormData,
        ...defaultValues,
      });
      setHiddenFromPersonIds([]);
    }
  }, [open, document, defaultValues]);

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Vyplňte název dokumentu");
      return;
    }

    setSaving(true);

    const payload = {
      larp_id: larpId,
      run_id: formData.run_id === "__all__" ? null : formData.run_id,
      title: formData.title,
      content: formData.content || null,
      doc_type: formData.doc_type,
      target_type: formData.target_type,
      target_group: formData.target_type === "skupina" ? formData.target_group : null,
      target_person_id: formData.target_type === "osoba" ? formData.target_person_id : null,
      sort_order: formData.sort_order,
      priority: formData.priority,
      visibility_mode: formData.visibility_mode,
      visible_days_before: formData.visibility_mode === "delayed" ? formData.visible_days_before : null,
    };

    let documentId: string;

    if (document) {
      const { error } = await supabase
        .from("documents")
        .update(payload)
        .eq("id", document.id);

      if (error) {
        toast.error("Chyba při ukládání");
        setSaving(false);
        return;
      }
      documentId = document.id;
      toast.success("Dokument upraven");
    } else {
      const { data: inserted, error } = await supabase
        .from("documents")
        .insert(payload as never)
        .select("id")
        .single();

      if (error) {
        toast.error("Chyba při vytváření");
        setSaving(false);
        return;
      }
      documentId = inserted.id;
      toast.success("Dokument vytvořen");
    }

    // Sync hidden documents
    await supabase.from("hidden_documents").delete().eq("document_id", documentId);
    if (hiddenFromPersonIds.length > 0) {
      await supabase.from("hidden_documents").insert(
        hiddenFromPersonIds.map((person_id) => ({ document_id: documentId, person_id }))
      );
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!document) return;
    
    setDeleting(true);
    
    // First delete hidden_documents entries
    await supabase.from("hidden_documents").delete().eq("document_id", document.id);
    
    // Then delete the document
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", document.id);
    
    if (error) {
      toast.error("Chyba při mazání dokumentu");
      setDeleting(false);
      return;
    }
    
    toast.success("Dokument smazán");
    setDeleting(false);
    setDeleteDialogOpen(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-card max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-typewriter">
            {document ? "Upravit dokument" : "Nový dokument"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          <div className="space-y-2">
            <Label>Název</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Název dokumentu"
              className="input-vintage"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Typ dokumentu</Label>
              <Select
                value={formData.doc_type}
                onValueChange={(v) => setFormData({ ...formData, doc_type: v as keyof typeof DOCUMENT_TYPES })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cílení</Label>
              <Select
                value={formData.target_type}
                onValueChange={(v) => setFormData({ ...formData, target_type: v as keyof typeof TARGET_TYPES })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGET_TYPES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.target_type === "skupina" && (
            <div className="space-y-2">
              <Label>Skupina</Label>
              <Select
                value={formData.target_group}
                onValueChange={(v) => setFormData({ ...formData, target_group: v })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue placeholder="Vyberte skupinu" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.target_type === "osoba" && (
            <div className="space-y-2">
              <Label>Osoba</Label>
              <Select
                value={formData.target_person_id}
                onValueChange={(v) => setFormData({ ...formData, target_person_id: v })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue placeholder="Vyberte osobu" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} {person.group_name ? `(${person.group_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Priorita</Label>
              <Select
                value={String(formData.priority)}
                onValueChange={(v) => setFormData({ ...formData, priority: parseInt(v) })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Prioritní</SelectItem>
                  <SelectItem value="2">Normální</SelectItem>
                  <SelectItem value="3">Volitelné</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pořadí</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="input-vintage w-24"
              />
            </div>

            <div className="space-y-2">
              <Label>Pro běh</Label>
              <Select
                value={formData.run_id}
                onValueChange={(v) => setFormData({ ...formData, run_id: v })}
              >
                <SelectTrigger className="input-vintage">
                  <SelectValue placeholder="Všechny běhy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Všechny běhy</SelectItem>
                  {runs.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility mode */}
          <div className="space-y-2 rounded-md border border-input bg-muted/20 p-3">
            <Label className="font-medium">Zobrazení na portálu hráče</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility_mode"
                  value="immediate"
                  checked={formData.visibility_mode === "immediate"}
                  onChange={() => setFormData({ ...formData, visibility_mode: "immediate" })}
                  className="accent-primary"
                />
                <span className="text-sm">Zobrazit ihned</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility_mode"
                  value="delayed"
                  checked={formData.visibility_mode === "delayed"}
                  onChange={() => setFormData({ ...formData, visibility_mode: "delayed" })}
                  className="accent-primary"
                />
                <span className="text-sm">Zobrazit až</span>
              </label>
              {formData.visibility_mode === "delayed" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={formData.visible_days_before}
                    onChange={(e) => setFormData({ ...formData, visible_days_before: parseInt(e.target.value) || 7 })}
                    className="input-vintage w-20"
                  />
                  <span className="text-sm text-muted-foreground">dní před začátkem běhu</span>
                </div>
              )}
            </div>
            {formData.visibility_mode === "delayed" && (
              <p className="text-xs text-muted-foreground">
                Dokument se na portálu zobrazí až {formData.visible_days_before} dní před datem začátku aktivního běhu.
              </p>
            )}
          </div>

          {formData.target_type !== "osoba" && (
            <div className="space-y-2">
              <Label>Skrýt před (dokument se těmto osobám nezobrazí)</Label>
              <ScrollArea className="h-32 rounded-md border border-input bg-muted/30 p-2">
                <div className="space-y-2">
                  {persons.length === 0 ? (
                    <p className="text-xs text-muted-foreground">V tomto LARPu zatím nejsou žádné osoby.</p>
                  ) : (
                    persons.map((person) => (
                      <label
                        key={person.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={hiddenFromPersonIds.includes(person.id)}
                          onCheckedChange={(checked) => {
                            setHiddenFromPersonIds((prev) =>
                              checked
                                ? [...prev, person.id]
                                : prev.filter((id) => id !== person.id)
                            );
                          }}
                        />
                        <span>
                          {person.name}
                          {person.group_name ? ` (${person.group_name})` : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <Label>Obsah (WYSIWYG)</Label>
            <RichTextEditor
              key={document?.id ?? "new"}
              value={formData.content}
              onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
              placeholder="Napište obsah dokumentu…"
              minHeight="240px"
              className="border-input"
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
          <div className="flex w-full justify-between">
            {document ? (
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Smazat
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={saving} className="btn-vintage">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Uložit
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat dokument?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat dokument "{document?.title}"? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
