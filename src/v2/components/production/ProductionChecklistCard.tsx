import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Folder, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [newTitle, setNewTitle] = useState("");
  const [newGroup, setNewGroup] = useState("Hlavní");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGroup, setEditGroup] = useState("");

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

  async function add() {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("run_checklist").insert({
      run_id: runId,
      title: newTitle.trim(),
      checklist_group: newGroup.trim() || "Hlavní",
      sort_order: items.filter((i) => i.checklist_group === (newGroup.trim() || "Hlavní")).length,
    });
    if (error) { toast.error(error.message); return; }
    setNewTitle("");
    load();
  }

  async function toggle(item: Item) {
    const newVal = !item.completed;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, completed: newVal } : i));
    const { error } = await supabase.from("run_checklist").update({ completed: newVal }).eq("id", item.id);
    if (error) { toast.error(error.message); load(); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("run_checklist").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  const groups = Array.from(new Set(items.map((i) => i.checklist_group))).sort((a, b) => a.localeCompare(b, "cs"));
  const groupOptions = Array.from(new Set([...groups, "Hlavní"]));

  const totalDone = items.filter((i) => i.completed).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-typewriter text-base">
          Checklist <span className="ml-2 text-xs font-normal text-muted-foreground">{totalDone} / {items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            list="cl-groups"
            className="w-32"
            placeholder="Skupina"
          />
          <datalist id="cl-groups">
            {groupOptions.map((g) => <option key={g} value={g} />)}
          </datalist>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="Nová položka…"
            className="flex-1 min-w-[180px]"
          />
          <Button size="sm" onClick={add}><Plus className="mr-1 h-4 w-4" />Přidat</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Žádné položky.</div>
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
                    {groupItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5">
                        <Checkbox checked={item.completed} onCheckedChange={() => toggle(item)} aria-label={item.title} />
                        <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
