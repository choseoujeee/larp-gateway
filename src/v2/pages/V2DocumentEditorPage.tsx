import { useEffect, useState } from "react";
import { useParams, Navigate, useNavigate, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Save, Trash2 } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
  priority: number;
}

interface PersonRow { id: string; name: string; type: string; }

export default function V2DocumentEditorPage() {
  const { larpSlug, docId } = useParams<{ larpSlug: string; docId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
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
      if (d) setDoc(d as DocRow);
      if (l) {
        const { data: p } = await supabase.from("persons").select("id, name, type, group_name").eq("larp_id", l.id).order("name");
        setPersons((p ?? []) as PersonRow[]);
        const gs = Array.from(new Set((p ?? []).map((x: any) => x.group_name).filter(Boolean))) as string[];
        setGroups(gs);
      }
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
    const { error } = await supabase.from("documents").update({
      title: doc.title,
      content: doc.content,
      doc_category: doc.doc_category,
      is_personal: doc.is_personal,
      target_type: doc.target_type,
      target_group: doc.target_type === "skupina" ? doc.target_group : null,
      target_person_id: doc.target_type === "osoba" ? doc.target_person_id : null,
      priority: doc.priority,
    }).eq("id", doc.id);
    setSaving(false);
    if (error) { toast.error("Ukládání selhalo: " + error.message); return; }
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

                <div className="grid gap-3 sm:grid-cols-3">
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
                  <div className="flex items-end">
                    <div className="flex items-center gap-2 rounded border border-border px-3 py-2 w-full">
                      <Switch id="personal" checked={doc.is_personal} onCheckedChange={(v) => update("is_personal", v)} />
                      <Label htmlFor="personal" className="cursor-pointer text-sm">Osobní dokument</Label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Cílení</Label>
                    <Select value={doc.target_type} onValueChange={(v) => update("target_type", v as TargetType)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vsichni">Všichni</SelectItem>
                        <SelectItem value="skupina">Skupina</SelectItem>
                        <SelectItem value="osoba">Konkrétní osoba</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {doc.target_type === "skupina" && (
                    <div>
                      <Label>Skupina</Label>
                      <Select value={doc.target_group ?? ""} onValueChange={(v) => update("target_group", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Vyberte…" /></SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {doc.target_type === "osoba" && (
                    <div>
                      <Label>Osoba</Label>
                      <Select value={doc.target_person_id ?? ""} onValueChange={(v) => update("target_person_id", v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Vyberte…" /></SelectTrigger>
                        <SelectContent>
                          {persons.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
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
