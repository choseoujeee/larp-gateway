import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, useNavigate, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Save, Trash2, X, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { toast } from "sonner";

type DocCategory = "organizacni" | "herni" | "produkcni";
type TargetType = "vsichni" | "skupina" | "osoba";

interface DocRow {
  id: string;
  larp_id: string;
  title: string;
  content: string | null;
  doc_category: DocCategory;
  is_personal: boolean;
  target_type: TargetType;
  target_group: string | null;
  target_person_id: string | null;
  extra_target_person_ids: string[];
  extra_target_group_names: string[];
  priority: number;
}

interface PersonRow { id: string; name: string; type: string; group_name: string | null; }

export default function V2DocumentEditorPage() {
  const { larpSlug, docId } = useParams<{ larpSlug: string; docId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [hiddenPersonIds, setHiddenPersonIds] = useState<string[]>([]);
  const [hiddenGroupNames, setHiddenGroupNames] = useState<string[]>([]);
  const [larpName, setLarpName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (!user || !docId || !larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (l) setLarpName(l.name);
      const { data: d } = await supabase.from("documents").select("*").eq("id", docId).maybeSingle();
      if (d) setDoc({
        ...(d as any),
        extra_target_person_ids: (d as any).extra_target_person_ids ?? [],
        extra_target_group_names: (d as any).extra_target_group_names ?? [],
      } as DocRow);
      if (l) {
        const { data: p } = await supabase.from("persons").select("id, name, type, group_name").eq("larp_id", l.id).order("name");
        setPersons((p ?? []) as PersonRow[]);
        const gs = Array.from(new Set((p ?? []).map((x: any) => x.group_name).filter(Boolean))) as string[];
        setGroups(gs.sort());
      }
      const [{ data: hp }, { data: hg }] = await Promise.all([
        supabase.from("hidden_documents").select("person_id").eq("document_id", docId),
        supabase.from("hidden_document_groups").select("group_name").eq("document_id", docId),
      ]);
      setHiddenPersonIds((hp ?? []).map((r: any) => r.person_id));
      setHiddenGroupNames((hg ?? []).map((r: any) => r.group_name));
      setLoading(false);
    })();
  }, [user, docId, larpSlug]);

  function update<K extends keyof DocRow>(k: K, v: DocRow[K]) {
    if (!doc) return;
    setDoc({ ...doc, [k]: v });
    setDirty(true);
  }

  async function save() {
    if (!doc) return;
    setSaving(true);
    // Derive is_personal from targeting: a doc aimed at a specific person is "personal".
    const targetsPerson =
      (doc.target_type === "osoba" && !!doc.target_person_id) ||
      (doc.extra_target_person_ids && doc.extra_target_person_ids.length > 0);
    const payload: any = {
      title: doc.title,
      content: doc.content,
      doc_category: doc.doc_category,
      is_personal: !!targetsPerson,
      target_type: doc.target_type,
      target_group: doc.target_type === "skupina" ? doc.target_group : null,
      target_person_id: doc.target_type === "osoba" ? doc.target_person_id : null,
      extra_target_person_ids: doc.extra_target_person_ids,
      extra_target_group_names: doc.extra_target_group_names,
      priority: doc.priority,
    };
    const { error } = await supabase.from("documents").update(payload).eq("id", doc.id);
    if (error) { setSaving(false); toast.error("Ukládání selhalo: " + error.message); return; }

    // Sync hidden tables
    await supabase.from("hidden_documents").delete().eq("document_id", doc.id);
    if (hiddenPersonIds.length) {
      await supabase.from("hidden_documents").insert(hiddenPersonIds.map((pid) => ({ document_id: doc.id, person_id: pid })));
    }
    await supabase.from("hidden_document_groups").delete().eq("document_id", doc.id);
    if (hiddenGroupNames.length) {
      await supabase.from("hidden_document_groups").insert(hiddenGroupNames.map((g) => ({ document_id: doc.id, group_name: g })));
    }

    setSaving(false);
    setDirty(false);
    toast.success("Uloženo");
  }


  async function remove() {
    if (!doc) return;
    if (!confirm(`Smazat dokument „${doc.title}"?`)) return;
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) { toast.error("Smazání selhalo"); return; }
    toast.success("Smazáno");
    setDirty(false);
    navigate(`/larp/${larpSlug}/dokumenty`);
  }

  if (!authLoading && !user) return <Navigate to={`/login?next=/larp/${larpSlug}/dokumenty/${docId}`} replace />;

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/larp/${larpSlug}/dokumenty`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />Zpět na dokumenty
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={remove} disabled={!doc || loading} className="text-destructive">
              <Trash2 className="mr-1 h-4 w-4" />Smazat
            </Button>
            <Button onClick={save} disabled={!dirty || saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Uložit
            </Button>
          </div>
        </div>

        {loading || !doc ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardContent className="space-y-4 py-4">
                <div>
                  <Label htmlFor="title">Název</Label>
                  <Input id="title" value={doc.title} onChange={(e) => update("title", e.target.value)} className="mt-1 font-typewriter text-lg" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Kategorie</Label>
                    <Select value={doc.doc_category} onValueChange={(v) => update("doc_category", v as DocCategory)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="organizacni">Organizační</SelectItem>
                        <SelectItem value="herni">Herní</SelectItem>
                        <SelectItem value="produkcni">Produkční</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priorita</Label>
                    <Select value={String(doc.priority)} onValueChange={(v) => update("priority", Number(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Prioritní</SelectItem>
                        <SelectItem value="2">Normální</SelectItem>
                        <SelectItem value="3">Volitelné</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                <TargetingSection
                  doc={doc}
                  persons={persons}
                  groups={groups}
                  hiddenPersonIds={hiddenPersonIds}
                  hiddenGroupNames={hiddenGroupNames}
                  onDocChange={(patch) => { setDoc({ ...doc, ...patch }); setDirty(true); }}
                  onHiddenPersonsChange={(ids) => { setHiddenPersonIds(ids); setDirty(true); }}
                  onHiddenGroupsChange={(gs) => { setHiddenGroupNames(gs); setDirty(true); }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <Label className="mb-2 block">Obsah</Label>
                <RichTextEditor
                  value={doc.content ?? ""}
                  onChange={(html) => update("content", html)}
                  imageFolderPath={larpSlug}
                  minHeight="400px"
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </V2Shell>
  );
}

function TargetingSection({
  doc, persons, groups, hiddenPersonIds, hiddenGroupNames,
  onDocChange, onHiddenPersonsChange, onHiddenGroupsChange,
}: {
  doc: DocRow;
  persons: PersonRow[];
  groups: string[];
  hiddenPersonIds: string[];
  hiddenGroupNames: string[];
  onDocChange: (patch: Partial<DocRow>) => void;
  onHiddenPersonsChange: (ids: string[]) => void;
  onHiddenGroupsChange: (gs: string[]) => void;
}) {
  const personMap = useMemo(() => {
    const m: Record<string, PersonRow> = {};
    persons.forEach((p) => { m[p.id] = p; });
    return m;
  }, [persons]);

  // Selected lists, regardless of target_type
  const includePersons = useMemo(() => {
    const ids = new Set<string>(doc.extra_target_person_ids ?? []);
    if (doc.target_type === "osoba" && doc.target_person_id) ids.add(doc.target_person_id);
    return Array.from(ids);
  }, [doc]);

  const includeGroups = useMemo(() => {
    const gs = new Set<string>(doc.extra_target_group_names ?? []);
    if (doc.target_type === "skupina" && doc.target_group) gs.add(doc.target_group);
    return Array.from(gs);
  }, [doc]);

  // UI mode: vsichni / skupina / osoba
  const mode: "vsichni" | "skupina" | "osoba" =
    doc.target_type === "vsichni" ? "vsichni" : doc.target_type === "skupina" ? "skupina" : "osoba";

  function setMode(next: "vsichni" | "skupina" | "osoba") {
    if (next === "vsichni") {
      onDocChange({ target_type: "vsichni", target_group: null, target_person_id: null, extra_target_person_ids: [], extra_target_group_names: [] });
    } else if (next === "skupina") {
      onDocChange({ target_type: "skupina", target_group: null, target_person_id: null, extra_target_person_ids: [], extra_target_group_names: [] });
    } else {
      onDocChange({ target_type: "osoba", target_group: null, target_person_id: null, extra_target_person_ids: [], extra_target_group_names: [] });
    }
  }

  function addPerson(id: string) {
    if (!id || includePersons.includes(id)) return;
    const next = [...(doc.extra_target_person_ids ?? []), id];
    onDocChange({ target_type: "osoba", target_person_id: null, target_group: null, extra_target_person_ids: next });
  }
  function removePerson(id: string) {
    const patch: Partial<DocRow> = {};
    patch.extra_target_person_ids = (doc.extra_target_person_ids ?? []).filter((x) => x !== id);
    if (doc.target_person_id === id) patch.target_person_id = null;
    onDocChange(patch);
  }

  function addGroup(g: string) {
    if (!g || includeGroups.includes(g)) return;
    const next = [...(doc.extra_target_group_names ?? []), g];
    onDocChange({ target_type: "skupina", target_person_id: null, target_group: null, extra_target_group_names: next });
  }
  function removeGroup(g: string) {
    const patch: Partial<DocRow> = {};
    patch.extra_target_group_names = (doc.extra_target_group_names ?? []).filter((x) => x !== g);
    if (doc.target_group === g) patch.target_group = null;
    onDocChange(patch);
  }

  const hasHidden = hiddenPersonIds.length > 0 || hiddenGroupNames.length > 0;
  const [hiddenOpen, setHiddenOpen] = useState<boolean>(hasHidden);

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/30 p-3">
      <div>
        <Label>Komu</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as "vsichni" | "skupina" | "osoba")}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vsichni">Všem</SelectItem>
            <SelectItem value="skupina">Skupině</SelectItem>
            <SelectItem value="osoba">Osobě</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "skupina" && (
        <PickerRow
          label="Skupiny, které dokument uvidí"
          chips={includeGroups.map((g) => ({ key: g, label: g, onRemove: () => removeGroup(g) }))}
          options={groups.filter((g) => !includeGroups.includes(g)).map((g) => ({ value: g, label: g }))}
          onAdd={addGroup}
          placeholder="Přidat skupinu…"
          emptyText="Žádná skupina"
        />
      )}

      {mode === "osoba" && (
        <PickerRow
          label="Osoby, které dokument uvidí"
          chips={includePersons.map((id) => ({ key: id, label: personMap[id]?.name ?? "Osoba", onRemove: () => removePerson(id) }))}
          options={persons.filter((p) => !includePersons.includes(p.id)).map((p) => ({ value: p.id, label: `${p.name}${p.group_name ? ` (${p.group_name})` : ""}` }))}
          onAdd={addPerson}
          placeholder="Přidat osobu…"
          emptyText="Žádná osoba"
        />
      )}

      <div className="border-t border-border pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setHiddenOpen((o) => !o)}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <EyeOff className="mr-1.5 h-3.5 w-3.5" />
          Skrýt před {hasHidden && <span className="ml-1 text-foreground">({hiddenPersonIds.length + hiddenGroupNames.length})</span>}
          {hiddenOpen ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
        </Button>

        {hiddenOpen && (
          <div className="mt-2 space-y-2">
            <PickerRow
              label="Skupiny, kterým se NEzobrazí"
              chips={hiddenGroupNames.map((g) => ({ key: g, label: g, onRemove: () => onHiddenGroupsChange(hiddenGroupNames.filter((x) => x !== g)) }))}
              options={groups.filter((g) => !hiddenGroupNames.includes(g)).map((g) => ({ value: g, label: g }))}
              onAdd={(g) => onHiddenGroupsChange([...hiddenGroupNames, g])}
              placeholder="Skrýt před skupinou…"
              emptyText="Nikdo nevyloučen"
            />
            <PickerRow
              label="Osoby, kterým se NEzobrazí"
              chips={hiddenPersonIds.map((id) => ({ key: id, label: personMap[id]?.name ?? "Osoba", onRemove: () => onHiddenPersonsChange(hiddenPersonIds.filter((x) => x !== id)) }))}
              options={persons.filter((p) => !hiddenPersonIds.includes(p.id)).map((p) => ({ value: p.id, label: `${p.name}${p.group_name ? ` (${p.group_name})` : ""}` }))}
              onAdd={(id) => onHiddenPersonsChange([...hiddenPersonIds, id])}
              placeholder="Skrýt před osobou…"
              emptyText="Nikdo nevyloučen"
            />
          </div>
        )}
      </div>
    </div>
  );
}


function PickerRow({
  label, chips, options, onAdd, placeholder, emptyText,
}: {
  label: string;
  chips: { key: string; label: string; onRemove: () => void }[];
  options: { value: string; label: string }[];
  onAdd: (v: string) => void;
  placeholder: string;
  emptyText: string;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="mt-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {chips.length === 0 ? (
          <span className="text-xs italic text-muted-foreground">{emptyText}</span>
        ) : (
          chips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
              {c.label}
              <button type="button" onClick={c.onRemove} className="ml-1 rounded hover:bg-background/50 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <Select value={val} onValueChange={(v) => { onAdd(v); setVal(""); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Žádné další možnosti</div>
            ) : options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
