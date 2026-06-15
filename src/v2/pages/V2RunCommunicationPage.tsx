import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, Mail, FileText, KeyRound, History, Send, Plus, Copy, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { useAuth } from "@/hooks/useAuth";
import { useRun } from "../hooks/useRun";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

type TemplateKind = "pozvanka" | "info" | "diky" | "magic-link" | "vlastni";
const KIND_LABELS: Record<TemplateKind, string> = {
  "pozvanka": "Pozvánka",
  "info": "Info před hrou",
  "diky": "Poděkování",
  "magic-link": "Přihlašovací odkaz",
  "vlastni": "Vlastní",
};

interface EmailTemplate {
  id: string;
  larp_id: string;
  kind: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  updated_at: string;
}

interface PersonRow {
  id: string;
  name: string;
  slug: string;
  type: "postava" | "cp";
  email: string | null;
  group_name: string | null;
}

interface AssignmentRow {
  person_id: string;
  player_name: string | null;
  player_email: string | null;
}

interface LogRow {
  id: string;
  created_at: string;
  recipient_email: string;
  subject: string | null;
  template_kind: string;
  status: string;
  error: string | null;
  person_id: string | null;
}

interface MagicLinkRow {
  id: string;
  person_id: string | null;
  scope: string;
  valid_until: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function V2RunCommunicationPage() {
  const { larpSlug, runSlug } = useParams<{ larpSlug: string; runSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { run, loading: runLoading, notFound } = useRun(larpSlug, runSlug);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "composer";

  if (!authLoading && !user) return <Navigate to="/auth" replace />;
  if (runLoading || authLoading) return <Loading />;
  if (notFound || !run) return <Navigate to="/" replace />;

  return (
    <V2Shell>
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Komunikace</h1>
            <p className="text-sm text-muted-foreground">{run.larp_name} · {run.name}</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList>
            <TabsTrigger value="composer"><Send className="h-4 w-4 mr-1.5" />Rozeslat</TabsTrigger>
            <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-1.5" />Šablony</TabsTrigger>
            <TabsTrigger value="magic"><KeyRound className="h-4 w-4 mr-1.5" />Odkazy pro hráče</TabsTrigger>
            <TabsTrigger value="log"><History className="h-4 w-4 mr-1.5" />Historie</TabsTrigger>
          </TabsList>

          <TabsContent value="composer" className="mt-4">
            <ComposerTab runId={run.id} larpId={run.larp_id} />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <TemplatesTab larpId={run.larp_id} />
          </TabsContent>
          <TabsContent value="magic" className="mt-4">
            <MagicLinksTab runId={run.id} larpId={run.larp_id} larpSlug={run.larp_slug} />
          </TabsContent>
          <TabsContent value="log" className="mt-4">
            <LogTab runId={run.id} />
          </TabsContent>
        </Tabs>
      </div>
    </V2Shell>
  );
}

function Loading() {
  return (
    <V2Shell>
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </V2Shell>
  );
}

// ============ COMPOSER ============
function ComposerTab({ runId, larpId }: { runId: string; larpId: string }) {
  const [recipients, setRecipients] = useState<{ players: boolean; cp: boolean; organizers: boolean; personIds: string[] }>({
    players: true, cp: false, organizers: false, personIds: [],
  });
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentRow>>({});
  const [organizersCount, setOrganizersCount] = useState(0);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: rpa }, { data: tpls }, { count: orgCnt }] = await Promise.all([
        supabase.from("persons").select("id, name, slug, type, email, group_name").eq("larp_id", larpId).order("name"),
        supabase.from("run_person_assignments").select("person_id, player_name, player_email").eq("run_id", runId),
        supabase.from("email_templates").select("*").eq("larp_id", larpId).order("kind"),
        supabase.from("larp_organizers").select("*", { count: "exact", head: true }).eq("larp_id", larpId),
      ]);
      setPersons((ps ?? []) as PersonRow[]);
      const m: Record<string, AssignmentRow> = {};
      (rpa ?? []).forEach((r: any) => { m[r.person_id] = r; });
      setAssignments(m);
      setTemplates((tpls ?? []) as EmailTemplate[]);
      setOrganizersCount(orgCnt ?? 0);
    })();
  }, [runId, larpId]);

  const assignedPersonIds = useMemo(() => new Set(Object.keys(assignments)), [assignments]);

  const recipientList = useMemo(() => {
    const out: { id: string; name: string; email: string | null; type: string }[] = [];
    if (recipients.players) {
      persons.filter((p) => p.type === "postava" && assignedPersonIds.has(p.id)).forEach((p) => {
        out.push({ id: p.id, name: assignments[p.id]?.player_name ?? p.name, email: assignments[p.id]?.player_email ?? p.email, type: "hráč" });
      });
    }
    if (recipients.cp) {
      persons.filter((p) => p.type === "cp").forEach((p) => {
        out.push({ id: p.id, name: p.name, email: p.email, type: "cp" });
      });
    }
    recipients.personIds.forEach((pid) => {
      if (out.some((x) => x.id === pid)) return;
      const p = persons.find((x) => x.id === pid);
      if (!p) return;
      const email = p.type === "postava" ? (assignments[p.id]?.player_email ?? p.email) : p.email;
      out.push({ id: p.id, name: p.name, email, type: p.type });
    });
    return out;
  }, [recipients, persons, assignments, assignedPersonIds]);

  const withEmail = recipientList.filter((r) => r.email && r.email.includes("@"));

  const handleTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) { setSubject(t.subject); setBody(t.body_html); }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { toast.error("Doplň předmět a obsah"); return; }
    if (withEmail.length === 0) { toast.error("Žádní příjemci s e-mailem"); return; }
    if (!confirm(`Opravdu odeslat ${withEmail.length} e-mailům?`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-run-broadcast", {
      body: {
        runId,
        recipients: {
          players: recipients.players,
          cp: recipients.cp,
          organizers: recipients.organizers,
          personIds: recipients.personIds,
        },
        subject, html: body,
        templateKind: templates.find((t) => t.id === templateId)?.kind ?? "vlastni",
      },
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Zařazeno do fronty: ${data?.queued ?? 0} zpráv`);
    if (data?.warning) toast.warning(data.warning);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader><CardTitle>Nová zpráva</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Šablona (volitelně)</Label>
            <Select value={templateId} onValueChange={handleTemplate}>
              <SelectTrigger><SelectValue placeholder="Bez šablony" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{KIND_LABELS[t.kind as TemplateKind] ?? t.kind} — {t.subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Předmět</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Předmět e-mailu" />
          </div>
          <div>
            <Label>Obsah (HTML)</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14}
              placeholder="<p>Ahoj {{jmeno}},...</p>" className="font-mono text-sm" />
            <p className="mt-1 text-xs text-muted-foreground">
              Proměnné: {"{{jmeno}}"}, {"{{postava}}"}, {"{{skupina}}"}, {"{{larp}}"}, {"{{beh}}"}, {"{{magic_link}}"}
            </p>
          </div>
          <Button onClick={handleSend} disabled={sending || withEmail.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Odeslat ({withEmail.length})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Příjemci</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2">
            <Checkbox checked={recipients.players} onCheckedChange={(v) => setRecipients((r) => ({ ...r, players: !!v }))} />
            <span>Všichni hráči ({Array.from(assignedPersonIds).length})</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={recipients.cp} onCheckedChange={(v) => setRecipients((r) => ({ ...r, cp: !!v }))} />
            <span>Všichni CP ({persons.filter((p) => p.type === "cp").length})</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={recipients.organizers} onCheckedChange={(v) => setRecipients((r) => ({ ...r, organizers: !!v }))} />
            <span>Organizátoři ({organizersCount})</span>
          </label>
          <div className="border-t pt-3 space-y-1 max-h-64 overflow-auto">
            <p className="text-xs text-muted-foreground mb-1">Konkrétní osoby:</p>
            {persons.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={recipients.personIds.includes(p.id)}
                  onCheckedChange={(v) => setRecipients((r) => ({
                    ...r,
                    personIds: v ? [...r.personIds, p.id] : r.personIds.filter((x) => x !== p.id),
                  }))}
                />
                <span className="truncate">{p.name} <Badge variant="outline" className="ml-1 text-[10px]">{p.type}</Badge></span>
              </label>
            ))}
          </div>
          <div className="border-t pt-3 text-sm">
            <p>Celkem: <strong>{recipientList.length}</strong></p>
            <p className="text-muted-foreground">S e-mailem: <strong>{withEmail.length}</strong></p>
            {recipientList.length > withEmail.length && (
              <p className="text-destructive text-xs mt-1">{recipientList.length - withEmail.length} bez e-mailu — přeskočí se</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ TEMPLATES ============
function TemplatesTab({ larpId }: { larpId: string }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("email_templates").select("*").eq("larp_id", larpId).order("kind");
    setTemplates((data ?? []) as EmailTemplate[]);
    setLoading(false);
  }, [larpId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.subject || !editing.body_html || !editing.kind) { toast.error("Vyplň všechna pole"); return; }
    if (editing.id) {
      const { error } = await supabase.from("email_templates").update({
        kind: editing.kind, subject: editing.subject, body_html: editing.body_html, body_text: editing.body_text ?? null,
      }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("email_templates").insert({
        larp_id: larpId, kind: editing.kind, subject: editing.subject, body_html: editing.body_html, body_text: editing.body_text ?? null,
      });
      if (error) { toast.error(error.message); return; }
    }
    setEditing(null);
    toast.success("Uloženo");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Smazat šablonu?")) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Šablony e-mailů</CardTitle>
        <Button size="sm" onClick={() => setEditing({ kind: "vlastni", subject: "", body_html: "" })}>
          <Plus className="h-4 w-4 mr-1" /> Nová šablona
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím žádné šablony.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-md p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{KIND_LABELS[t.kind as TemplateKind] ?? t.kind}</Badge>
                    <span className="font-medium truncate">{t.subject}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.body_html.replace(/<[^>]+>/g, " ").slice(0, 120)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Upravit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Upravit šablonu" : "Nová šablona"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Typ</Label>
                <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(KIND_LABELS).map(([k, lbl]) => <SelectItem key={k} value={k}>{lbl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Předmět</Label>
                <Input value={editing.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
              </div>
              <div>
                <Label>Obsah HTML</Label>
                <Textarea rows={12} className="font-mono text-sm"
                  value={editing.body_html ?? ""} onChange={(e) => setEditing({ ...editing, body_html: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Zrušit</Button>
            <Button onClick={save}>Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ MAGIC LINKS ============
function MagicLinksTab({ runId, larpId, larpSlug }: { runId: string; larpId: string; larpSlug: string }) {
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentRow>>({});
  const [links, setLinks] = useState<MagicLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatedToken, setGeneratedToken] = useState<{ name: string; url: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ps }, { data: rpa }, { data: ml }] = await Promise.all([
      supabase.from("persons").select("id, name, slug, type, email, group_name").eq("larp_id", larpId).order("name"),
      supabase.from("run_person_assignments").select("person_id, player_name, player_email").eq("run_id", runId),
      supabase.from("magic_links").select("id, person_id, scope, valid_until, last_used_at, revoked_at, created_at").eq("run_id", runId).order("created_at", { ascending: false }),
    ]);
    setPersons((ps ?? []) as PersonRow[]);
    const m: Record<string, AssignmentRow> = {};
    (rpa ?? []).forEach((r: any) => { m[r.person_id] = r; });
    setAssignments(m);
    setLinks((ml ?? []) as MagicLinkRow[]);
    setLoading(false);
  }, [runId, larpId]);

  useEffect(() => { load(); }, [load]);

  const generate = async (personId: string, name: string, scope: string) => {
    const { data, error } = await supabase.rpc("create_run_magic_link", {
      p_run_id: runId, p_person_id: personId, p_scope: scope, p_ttl_days: 30,
    });
    if (error) { toast.error(error.message); return; }
    const url = `${window.location.origin}/portal/magic/${data}`;
    setGeneratedToken({ name, url });
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("magic_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const linksByPerson = useMemo(() => {
    const m: Record<string, MagicLinkRow[]> = {};
    links.forEach((l) => { if (l.person_id) (m[l.person_id] ??= []).push(l); });
    return m;
  }, [links]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Magic linky pro hráče a CP</CardTitle>
        <p className="text-sm text-muted-foreground">
          Jednorázový odkaz na portál (platnost 30 dní). Po vygenerování ho zkopíruj nebo pošli přes rozesílku.
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {persons.map((p) => {
            const isAssigned = !!assignments[p.id];
            if (p.type === "postava" && !isAssigned) return null;
            const playerLinks = linksByPerson[p.id] ?? [];
            const active = playerLinks.find((l) => !l.revoked_at && new Date(l.valid_until) > new Date());
            return (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{assignments[p.id]?.player_name ?? p.name}</span>
                    <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                    {active && <Badge variant="secondary" className="text-[10px]">Aktivní link</Badge>}
                    {active?.last_used_at && <Badge variant="default" className="text-[10px]">Použito</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{assignments[p.id]?.player_email ?? p.email ?? "bez e-mailu"}</p>
                </div>
                <div className="flex gap-1">
                  {active && <Button size="sm" variant="ghost" onClick={() => revoke(active.id)}>Zneplatnit</Button>}
                  <Button size="sm" variant="outline" onClick={() => generate(p.id, p.name, p.type === "cp" ? "cp" : "player")}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />Vygenerovat
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={!!generatedToken} onOpenChange={(o) => !o && setGeneratedToken(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Magic link vygenerován</DialogTitle></DialogHeader>
          <p className="text-sm">Pro: <strong>{generatedToken?.name}</strong></p>
          <div className="flex gap-2">
            <Input readOnly value={generatedToken?.url ?? ""} onFocus={(e) => e.currentTarget.select()} />
            <Button size="icon" variant="outline" onClick={() => {
              navigator.clipboard.writeText(generatedToken?.url ?? "");
              toast.success("Zkopírováno");
            }}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tento odkaz se zobrazí jen jednou. Po zavření ho už znovu nezobrazíš (v DB je uložen jen hash).
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ LOG ============
function LogTab({ runId }: { runId: string }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("email_log_v2").select("*").eq("run_id", runId).order("created_at", { ascending: false }).limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setRows((data ?? []) as LogRow[]);
    setLoading(false);
  }, [runId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const s = { sent: 0, pending: 0, failed: 0, suppressed: 0 };
    rows.forEach((r) => {
      if (r.status === "sent") s.sent++;
      else if (r.status === "pending") s.pending++;
      else if (r.status === "suppressed") s.suppressed++;
      else s.failed++;
    });
    return s;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Odesláno" value={stats.sent} />
        <StatCard label="Ve frontě" value={stats.pending} />
        <StatCard label="Selhalo" value={stats.failed} />
        <StatCard label="Blokováno" value={stats.suppressed} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historie odeslaných</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vše</SelectItem>
              <SelectItem value="sent">Odesláno</SelectItem>
              <SelectItem value="pending">Ve frontě</SelectItem>
              <SelectItem value="failed">Selhalo</SelectItem>
              <SelectItem value="suppressed">Blokováno</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné záznamy.</p>
          ) : (
            <div className="divide-y text-sm">
              {rows.map((r) => (
                <div key={r.id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="truncate font-medium">{r.subject ?? "(bez předmětu)"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.recipient_email} · {KIND_LABELS[r.template_kind as TemplateKind] ?? r.template_kind}</p>
                    {r.error && <p className="text-xs text-destructive mt-0.5">{r.error}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(r.created_at).toLocaleString("cs-CZ")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent></Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: any = status === "sent" ? "default" : status === "pending" ? "secondary" : status === "suppressed" ? "outline" : "destructive";
  const label = status === "sent" ? "Odesláno" : status === "pending" ? "Čeká" : status === "suppressed" ? "Blokováno" : "Selhalo";
  return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
}
