import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileText, GripVertical, Plus, User, Users, UsersRound, Drama, Share2 } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Doc {
  id: string;
  title: string;
  doc_category: "organizacni" | "herni" | "produkcni";
  target_type: string;
  is_personal: boolean;
  priority: number;
  sort_order: number;
  audience: string[] | null;
}

interface Props {
  larpSlug: string;
  larpId: string;
  personId: string;
  personName: string;
  personType: "postava" | "cp";
  personGroupName: string | null;
  onCreatePersonal: () => Promise<void>;
}

const CATS = [
  { key: "organizacni" as const, label: "Organizační" },
  { key: "herni" as const, label: "Herní" },
  { key: "osobni" as const, label: "Osobní" },
];

function TargetBadge({ doc, personId, personType }: { doc: Doc; personId: string; personType: "postava" | "cp" }) {
  const a = doc.audience ?? [];
  const personTag = `${personType === "cp" ? "cp" : "players"}:person:${personId}`;
  if (doc.is_personal || a.includes(personTag) || doc.target_type === "osoba") {
    return <Badge variant="secondary" className="gap-1 text-[10px]"><User className="h-2.5 w-2.5" />osobní</Badge>;
  }
  const hasPlayersAll = a.includes("players:all");
  const hasCpAll = a.includes("cp:all");
  if (hasPlayersAll && hasCpAll) {
    return <Badge variant="outline" className="gap-1 border-violet-400/60 text-[10px] text-violet-600 dark:text-violet-300"><Share2 className="h-2.5 w-2.5" />sdílené</Badge>;
  }
  if (hasCpAll) {
    return <Badge variant="outline" className="gap-1 border-amber-400/60 text-[10px] text-amber-700 dark:text-amber-300"><Drama className="h-2.5 w-2.5" />všichni CP</Badge>;
  }
  if (hasPlayersAll) {
    return <Badge variant="outline" className="gap-1 border-sky-400/60 text-[10px] text-sky-700 dark:text-sky-300"><UsersRound className="h-2.5 w-2.5" />všichni hráči</Badge>;
  }
  if (a.some((t) => t.startsWith("players:group:") || t.startsWith("cp:group:")) || doc.target_type === "skupina") {
    return <Badge variant="outline" className="gap-1 text-[10px]"><Users className="h-2.5 w-2.5" />skupina</Badge>;
  }
  return null;
}

function SortableRow({ doc, larpSlug, personId, personType }: { doc: Doc; larpSlug: string; personId: string; personType: "postava" | "cp" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch">
      <button
        type="button"
        className="flex-shrink-0 flex items-center justify-center w-7 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l border border-r-0 border-border bg-muted/20"
        {...attributes}
        {...listeners}
        aria-label="Přesunout"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Link
        to={`/larp/${larpSlug}/dokumenty/${doc.id}`}
        className="flex flex-1 items-center gap-2 rounded-r border border-border p-2 transition-colors hover:border-primary"
      >
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 truncate text-sm">{doc.title}</span>
        {doc.priority === 1 && <Badge variant="destructive" className="text-[10px]">prioritní</Badge>}
        {doc.priority === 3 && <Badge variant="outline" className="text-[10px]">volitelné</Badge>}
        <TargetBadge doc={doc} personId={personId} personType={personType} />
      </Link>
    </div>
  );
}

/**
 * Documents grouped like the player portal: Organizační / Herní / Osobní.
 * Each category sortable via drag&drop; persists sort_order per category.
 */
export function PersonDocumentsList({
  larpSlug, larpId, personId, personType, personGroupName, onCreatePersonal,
}: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = useCallback(async () => {
    setLoading(true);
    const select = "id, title, doc_category, is_personal, target_type, priority, sort_order";
    const q1 = supabase.from("documents").select(select).eq("larp_id", larpId).eq("target_type", "vsichni");
    const q2 = supabase.from("documents").select(select).eq("larp_id", larpId).eq("target_type", "osoba").eq("target_person_id", personId);
    const q3 = personGroupName
      ? supabase.from("documents").select(select).eq("larp_id", larpId).eq("target_type", "skupina").eq("target_group", personGroupName)
      : Promise.resolve({ data: [] as Doc[] });
    const [r1, r2, r3] = await Promise.all([q1, q2, q3 as Promise<{ data: Doc[] | null }>]);
    const all = ([...(r1.data ?? []), ...(r2.data ?? []), ...(r3.data ?? [])] as Doc[])
      .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)
      .sort((a, b) => a.sort_order - b.sort_order || a.priority - b.priority);
    setDocs(all);
    setLoading(false);
  }, [larpId, personId, personGroupName]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    // "osobni" = is_personal OR target_type='osoba' targeted at this person
    const g: Record<"organizacni" | "herni" | "osobni", Doc[]> = { organizacni: [], herni: [], osobni: [] };
    docs.forEach((d) => {
      if (d.is_personal || d.target_type === "osoba") g.osobni.push(d);
      else if (d.doc_category === "organizacni") g.organizacni.push(d);
      else g.herni.push(d);
    });
    return g;
  }, [docs]);

  async function handleDragEnd(catKey: "organizacni" | "herni" | "osobni", e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = grouped[catKey];
    const oldIndex = list.findIndex((d) => d.id === active.id);
    const newIndex = list.findIndex((d) => d.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    // Update local state optimistically
    setDocs((prev) => {
      const otherCats = prev.filter((d) => !reordered.some((r) => r.id === d.id));
      const updated = reordered.map((d, i) => ({ ...d, sort_order: i + 1 }));
      return [...otherCats, ...updated].sort((a, b) => a.sort_order - b.sort_order);
    });
    // Persist
    const updates = reordered.map((d, i) =>
      supabase.from("documents").update({ sort_order: i + 1 }).eq("id", d.id),
    );
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) toast.error("Uložení pořadí selhalo");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-typewriter text-lg">Dokumenty</CardTitle>
        <Button size="sm" onClick={onCreatePersonal}><Plus className="mr-1 h-4 w-4" />Osobní dokument</Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? null : docs.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">Žádné dokumenty.</p>
        ) : (
          CATS.map(({ key, label }) => {
            const list = grouped[key];
            if (list.length === 0) return null;
            return (
              <section key={key}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(key, e)}>
                  <SortableContext items={list.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {list.map((d) => <SortableRow key={d.id} doc={d} larpSlug={larpSlug} />)}
                    </div>
                  </SortableContext>
                </DndContext>
              </section>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
