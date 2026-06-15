import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Loader2, Pencil, UserCog, ShieldAlert, Crown } from "lucide-react";
import { V2Shell } from "../components/V2Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLarpPermissions } from "../hooks/useLarpPermissions";
import {
  ALL_SECTIONS, SECTION_LABELS, type PermissionsMap, type SectionLevel, type SectionKey,
} from "../hooks/useLarpPermissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrgRow {
  larp_id: string;
  user_id: string;
  email: string | null;
  permissions: PermissionsMap;
}
interface AccountRow {
  user_id: string;
  login: string;
  display_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  auth_email: string | null;
}

const DEFAULT_PERMS: PermissionsMap = ALL_SECTIONS.reduce(
  (acc, s) => ({ ...acc, [s]: "edit" as SectionLevel }),
  {} as PermissionsMap,
);

export default function V2OrganizersPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const { canManageOrganizers, isSuperAdmin, loading: permLoading } = useLarpPermissions(larpSlug);
  const [larp, setLarp] = useState<{ id: string; name: string; owner_id: string } | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [accounts, setAccounts] = useState<Record<string, AccountRow>>({});
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState<OrgRow | null>(null);
  const [editDisplay, setEditDisplay] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPerms, setEditPerms] = useState<PermissionsMap>({});

  const [selected, setSelected] = useState<OrgRow | null>(null);

  const [nLogin, setNLogin] = useState("");
  const [nPass, setNPass] = useState("");
  const [nName, setNName] = useState("");
  const [nMail, setNMail] = useState("");
  const [nPhone, setNPhone] = useState("");

  const [assignMail, setAssignMail] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async (larpId: string) => {
    const [{ data: orgs }, { data: accs }] = await Promise.all([
      supabase.from("larp_organizers").select("larp_id, user_id, email, permissions").eq("larp_id", larpId),
      supabase.from("organizer_accounts").select("user_id, login, display_name, contact_email, contact_phone, auth_email"),
    ]);
    setRows(((orgs ?? []) as any[]).map((o) => ({
      ...o,
      permissions: (o.permissions && typeof o.permissions === "object" ? o.permissions : {}) as PermissionsMap,
    })));
    const map: Record<string, AccountRow> = {};
    (accs ?? []).forEach((a) => { map[a.user_id] = a as AccountRow; });
    setAccounts(map);
  };

  useEffect(() => {
    if (!larpSlug) return;
    (async () => {
      const { data: l } = await supabase.from("larps").select("id, name, owner_id").eq("slug", larpSlug).maybeSingle();
      if (!l) { setLoading(false); return; }
      setLarp(l);
      // try to resolve owner email via organizer_accounts (best-effort)
      const { data: ownerAcc } = await supabase
        .from("organizer_accounts")
        .select("contact_email, auth_email, display_name, login")
        .eq("user_id", l.owner_id)
        .maybeSingle();
      setOwnerEmail(ownerAcc?.contact_email || ownerAcc?.auth_email || ownerAcc?.display_name || ownerAcc?.login || null);
      await reload(l.id);
      setLoading(false);
    })();
  }, [larpSlug]);

  const handleCreate = async () => {
    const login = nLogin.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!login || !nPass.trim() || !larp) { toast.error("Vyplňte login a heslo"); return; }
    if (nPass.length < 6) { toast.error("Heslo min. 6 znaků"); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-organizer", {
      body: {
        login, password: nPass.trim(),
        display_name: nName.trim() || undefined,
        contact_email: nMail.trim() || undefined,
        contact_phone: nPhone.trim() || undefined,
        larp_id: larp.id,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) { toast.error(error?.message || (data as any)?.error || "Chyba"); return; }
    toast.success(`Organizátor „${login}“ vytvořen`);
    setCreateOpen(false);
    setNLogin(""); setNPass(""); setNName(""); setNMail(""); setNPhone("");
    reload(larp.id);
  };

  const handleAssign = async () => {
    const email = assignMail.trim().toLowerCase();
    if (!email || !larp) { toast.error("Vyplňte e-mail"); return; }
    setSaving(true);
    const { data: acc } = await supabase.from("organizer_accounts")
      .select("user_id").eq("auth_email", email).maybeSingle();
    if (!acc) { setSaving(false); toast.error("Uživatel nenalezen"); return; }
    const { error } = await supabase.from("larp_organizers")
      .insert({ user_id: acc.user_id, larp_id: larp.id, email, permissions: DEFAULT_PERMS as any });
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? "Již je přiřazen" : error.message); return; }
    toast.success("Organizátor přiřazen");
    setAssignOpen(false); setAssignMail("");
    reload(larp.id);
  };

  const openEdit = (row: OrgRow) => {
    const a = accounts[row.user_id];
    setEditing(row);
    setEditDisplay(a?.display_name ?? "");
    setEditEmail(a?.contact_email ?? "");
    setEditPhone(a?.contact_phone ?? "");
    setEditPerms({ ...row.permissions });
    setEditOpen(true);
  };

  const setLevel = (section: SectionKey, level: SectionLevel) => {
    setEditPerms((p) => ({ ...p, [section]: level }));
  };
  const setAllLevels = (level: SectionLevel) => {
    setEditPerms(ALL_SECTIONS.reduce((acc, s) => ({ ...acc, [s]: level }), {} as PermissionsMap));
  };

  const handleSaveEdit = async () => {
    if (!editing || !larp) return;
    setSaving(true);
    const { error: e1 } = await supabase.from("organizer_accounts").update({
      display_name: editDisplay.trim() || null,
      contact_email: editEmail.trim() || null,
      contact_phone: editPhone.trim() || null,
    }).eq("user_id", editing.user_id);
    const { error: e2 } = await supabase.from("larp_organizers")
      .update({ permissions: editPerms as any })
      .eq("larp_id", editing.larp_id)
      .eq("user_id", editing.user_id);
    setSaving(false);
    if (e1 || e2) { toast.error((e1 || e2)!.message); return; }
    toast.success("Uloženo");
    setEditOpen(false); setEditing(null);
    reload(larp.id);
  };

  const handleDelete = async () => {
    if (!selected || !larp) return;
    setSaving(true);
    const { error } = await supabase.from("larp_organizers").delete()
      .eq("larp_id", selected.larp_id).eq("user_id", selected.user_id);
    setSaving(false);
    setDeleteOpen(false); setSelected(null);
    if (error) { toast.error("Chyba"); return; }
    toast.success("Odebráno");
    reload(larp.id);
  };

  if (permLoading || loading) {
    return <V2Shell larpName={larp?.name}><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div></V2Shell>;
  }

  if (!canManageOrganizers) {
    return (
      <V2Shell larpName={larp?.name}>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <ShieldAlert className="h-5 w-5" />
            Správu organizátorů smí používat jen vlastník LARPu nebo super-admin.
          </CardContent>
        </Card>
      </V2Shell>
    );
  }

  return (
    <V2Shell larpName={larp?.name}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold"><UserCog className="h-6 w-6" /> Organizátoři</h1>
            <p className="text-sm text-muted-foreground">Spravujte přístup a oprávnění k LARPu „{larp?.name}“.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isSuperAdmin && <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Nový účet</Button>}
            <Button variant="outline" onClick={() => setAssignOpen(true)}>Přiřadit podle e-mailu</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Vlastník</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 py-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{ownerEmail || larp?.owner_id}</div>
                <div className="text-xs text-muted-foreground">Plný přístup ke všem sekcím (nelze omezit)</div>
              </div>
              <Badge variant="secondary">Vlastník</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Organizátoři</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Zatím nejsou přiřazeni žádní organizátoři.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => {
                  const a = accounts[r.user_id];
                  const title = a?.display_name?.trim() || a?.login || r.email || r.user_id;
                  const sub = [a?.login && `@${a.login}`, a?.contact_email || r.email, a?.contact_phone].filter(Boolean).join(" · ");
                  const editCount = ALL_SECTIONS.filter((s) => r.permissions[s] === "edit").length;
                  const viewCount = ALL_SECTIONS.filter((s) => r.permissions[s] === "view").length;
                  return (
                    <li key={`${r.larp_id}-${r.user_id}`} className="flex items-center justify-between gap-2 py-3">
                      <button onClick={() => openEdit(r)} className="min-w-0 flex-1 text-left">
                        <div className="truncate font-medium">{title}</div>
                        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
                        <div className="mt-1 flex gap-1.5 text-[11px]">
                          <Badge variant="default" className="px-1.5 py-0">{editCount} editovat</Badge>
                          <Badge variant="secondary" className="px-1.5 py-0">{viewCount} zobrazit</Badge>
                          <Badge variant="outline" className="px-1.5 py-0">{ALL_SECTIONS.length - editCount - viewCount} žádné</Badge>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Upravit"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setSelected(r); setDeleteOpen(true); }} aria-label="Odebrat"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nový organizátor</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Organizátor se přihlašuje <strong>loginem</strong> (ne e-mailem).</p>
            <div className="space-y-1"><Label>Login *</Label><Input value={nLogin} onChange={(e) => setNLogin(e.target.value)} placeholder="janovak" autoComplete="username" /></div>
            <div className="space-y-1"><Label>Heslo *</Label><Input type="password" value={nPass} onChange={(e) => setNPass(e.target.value)} placeholder="min. 6 znaků" autoComplete="new-password" /></div>
            <div className="space-y-1"><Label>Jméno</Label><Input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Jan Novák" /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={nMail} onChange={(e) => setNMail(e.target.value)} /></div>
            <div className="space-y-1"><Label>Telefon</Label><Input type="tel" value={nPhone} onChange={(e) => setNPhone(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Zrušit</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Vytvořit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Přiřadit organizátora</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Zadejte přihlašovací e-mail existujícího organizátorského účtu (login@organizer.local).</p>
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={assignMail} onChange={(e) => setAssignMail(e.target.value)} placeholder="jan@organizer.local" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Zrušit</Button>
            <Button onClick={handleAssign} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Přiřadit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upravit organizátora</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label>Jméno</Label><Input value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} /></div>
              <div className="space-y-1"><Label>Kontaktní e-mail</Label><Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label>Telefon</Label><Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm font-semibold">Oprávnění k sekcím</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => setAllLevels("edit")}>Vše editovat</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setAllLevels("view")}>Jen čtení</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setAllLevels("none")}>Nic</Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Sekce</th>
                      <th className="px-2 py-2 text-center w-24">Žádný</th>
                      <th className="px-2 py-2 text-center w-24">Zobrazit</th>
                      <th className="px-2 py-2 text-center w-24">Editovat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_SECTIONS.map((s) => {
                      const current = editPerms[s] ?? "none";
                      return (
                        <tr key={s} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{SECTION_LABELS[s]}</td>
                          {(["none", "view", "edit"] as SectionLevel[]).map((lvl) => (
                            <td key={lvl} className="px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => setLevel(s, lvl)}
                                className={cn(
                                  "inline-flex h-7 w-full items-center justify-center rounded text-xs transition-colors",
                                  current === lvl
                                    ? lvl === "edit"
                                      ? "bg-primary text-primary-foreground"
                                      : lvl === "view"
                                        ? "bg-secondary text-secondary-foreground"
                                        : "bg-muted text-muted-foreground"
                                    : "hover:bg-muted",
                                )}
                              >
                                {current === lvl && "●"}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <strong>Žádný</strong> – sekce je v navigaci skrytá. <strong>Zobrazit</strong> – jen čtení.
                <strong> Editovat</strong> – plné úpravy v dané sekci.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Zrušit</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrat organizátora?</AlertDialogTitle>
            <AlertDialogDescription>Organizátor ztratí přístup k tomuto LARPu. Účet zůstane zachován.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Odebrat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2Shell>
  );
}
