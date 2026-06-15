import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Folder, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Item {
  id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  checklist_group: string;
}

interface Props { runId: string; }

export function ProductionChecklistCard({ runId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGroup, setEditGroup] = useState("");

  // per-group inline "add item" state
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");

  // new-checklist dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogName, setDialogName] = useState("");
  const [dialogFirstItem, setDialogFirstItem] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("run_checklist")
      .select("id, title, completed, sort_order, checklist_group")
      .eq("run_id", runId)
      .order("checklist_group").order("sort_order").order("title");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  }, [runId]);

  useEffect(() => { load(); }, [load]);

  async function addItem(group: string, title: string) {
    if (!title.trim()) return;
    const { error } = await supabase.from("run_checklist").insert({
      run_id: runId,
      title: title.trim(),
      checklist_group: group.trim() || "Hlavní",
      sort_order: items.filter((i) => i.checklist_group === group).length,
    });
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function createChecklist() {
    const name = dialogName.trim();
    if (!name) { toast.error("Zadej název checklistu"); return; }
    if (groups.includes(name)) { toast.error("Checklist s tímto názvem už existuje"); return; }
    // Insert at least one placeholder so the group exists, or a real item if provided.
    const firstTitle = dialogFirstItem.trim() || "První bod";
    const { error } = await supabase.from("run_checklist").insert({
      run_id: runId,
      title: firstTitle,
      checklist_group: name,
      sort_order: 0,
    });
    if (error) { toast.error(error.message); return; }
    setDialogOpen(false);
    setDialogName("");
    setDialogFirstItem("");
    toast.success("Checklist vytvořen");
    load();
  }

  async function toggle(item: Item) {
    const newVal = !item.completed;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, completed: newVal } : i));
    const { error } = await supabase.from("run_checklist").update({ completed: newVal }).eq("id", item.id);
    if (error) { toast.error(error.message); load(); }
  }

  async function remove(id: string) {
    if (!confirm("Smazat položku?")) return;
    const { error } = await supabase.from("run_checklist").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditGroup(item.checklist_group);
  }
  function cancelEdit() { setEditingId(null); setEditTitle(""); setEditGroup(""); }
  async function saveEdit(item: Item) {
    if (!editTitle.trim()) { toast.error("Vyplň název"); return; }
    const { error } = await supabase.from("run_checklist").update({
      title: editTitle.trim(),
      checklist_group: editGroup.trim() || "Hlavní",
    }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    cancelEdit();
    load();
  }

  const groups = Array.from(new Set(items.map((i) => i.checklist_group))).sort((a, b) => a.localeCompare(b, "cs"));
  const totalDone = items.filter((i) => i.completed).length;

  function openAdd(group: string) {
    setAddingTo(group);
    setAddTitle("");
  }
  async function confirmAdd(group: string) {
    await addItem(group, addTitle);
    setAddTitle("");
    setAddingTo(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-typewriter text-base">
          Checklist <span className="ml-2 text-xs font-normal text-muted-foreground">{totalDone} / {items.length}</span>
        </CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />Nový checklist
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Zatím žádný checklist. Vytvoř první přes <strong>Nový checklist</strong>.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => {
              const groupItems = items.filter((i) => i.checklist_group === g);
              const done = groupItems.filter((i) => i.completed).length;
              return (
                <div key={g}>
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Folder className="h-3 w-3" />
                    <span>{g}</span>
                    <span>· {done}/{groupItems.length}</span>
                  </div>
                  <ul className="space-y-1">
                    {groupItems.map((item) => {
                      const isEditing = editingId === item.id;
                      return (
                        <li key={item.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5">
                          <Checkbox checked={item.completed} onCheckedChange={() => toggle(item)} aria-label={item.title} disabled={isEditing} />
                          {isEditing ? (
                            <>
                              <Input
                                value={editGroup}
                                onChange={(e) => setEditGroup(e.target.value)}
                                className="h-7 w-28 text-sm"
                                placeholder="Skupina"
                              />
                              <Input
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(item); if (e.key === "Escape") cancelEdit(); }}
                                className="h-7 flex-1 text-sm"
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => saveEdit(item)} title="Uložit">
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit} title="Zrušit">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className={`flex-1 text-left text-sm hover:underline ${item.completed ? "line-through text-muted-foreground" : ""}`}
                                title="Upravit"
                              >
                                {item.title}
                              </button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)} title="Upravit">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(item.id)} title="Smazat">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {addingTo === g ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        autoFocus
                        value={addTitle}
                        onChange={(e) => setAddTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmAdd(g);
                          if (e.key === "Escape") { setAddingTo(null); setAddTitle(""); }
                        }}
                        placeholder="Název bodu…"
                        className="h-8 flex-1 text-sm"
                      />
                      <Button size="sm" onClick={() => confirmAdd(g)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setAddTitle(""); }}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => openAdd(g)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />Přidat další bod
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nový checklist</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Název checklistu</label>
              <Input
                autoFocus
                value={dialogName}
                onChange={(e) => setDialogName(e.target.value)}
                placeholder="např. Catering, Lokace, Kostýmy…"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">První bod (volitelně)</label>
              <Input
                value={dialogFirstItem}
                onChange={(e) => setDialogFirstItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createChecklist(); }}
                placeholder="Nech prázdné — doplníš později"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={createChecklist}>Vytvořit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
