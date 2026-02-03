import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAdminRole } from "@/hooks/useAdminRole";
import { useLarpContext } from "@/hooks/useLarpContext";
import { toast } from "sonner";

interface LarpOrganizerRow {
  larp_id: string;
  user_id: string;
  email: string | null;
  larps?: { name: string } | null;
}

interface OrganizerAccountRow {
  user_id: string;
  login: string;
  display_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export default function OrganizersPage() {
  const { isSuperAdmin, loading: roleLoading } = useAdminRole();
  const { larps } = useLarpContext();
  const [organizers, setOrganizers] = useState<LarpOrganizerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addByEmailOpen, setAddByEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<LarpOrganizerRow | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addLarpId, setAddLarpId] = useState("");
  const [saving, setSaving] = useState(false);
  /** Formulář pro nového organizátora (login + heslo) */
  const [newLogin, setNewLogin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [accountsByUserId, setAccountsByUserId] = useState<Record<string, OrganizerAccountRow>>({});

  const fetchOrganizers = async () => {
    const { data, error } = await supabase
      .from("larp_organizers")
      .select("larp_id, user_id, email, larps(name)")
      .order("larp_id");

    if (error) {
      toast.error("Chyba při načítání organizátorů");
      setOrganizers([]);
      return;
    }
    setOrganizers((data as LarpOrganizerRow[]) || []);
  };

  const fetchOrganizerAccounts = async () => {
    const { data } = await supabase
      .from("organizer_accounts")
      .select("user_id, login, display_name, contact_email, contact_phone");
    const map: Record<string, OrganizerAccountRow> = {};
    (data || []).forEach((row: OrganizerAccountRow) => {
      map[row.user_id] = row;
    });
    setAccountsByUserId(map);
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      await Promise.all([fetchOrganizers(), fetchOrganizerAccounts()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  /** Vytvoření nového organizátora (login + heslo) – volá Edge Function */
  const handleCreateOrganizer = async () => {
    const loginTrim = newLogin.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!loginTrim || !newPassword.trim() || !addLarpId) {
      toast.error("Vyplňte login, heslo a vyberte LARP");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Heslo musí mít alespoň 6 znaků");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-organizer", {
      body: {
        login: loginTrim,
        password: newPassword.trim(),
        display_name: newDisplayName.trim() || undefined,
        contact_email: newContactEmail.trim() || undefined,
        contact_phone: newContactPhone.trim() || undefined,
        larp_id: addLarpId,
      },
    });
    setSaving(false);
    if (error) {
      const msg = error.message || "Chyba při vytváření organizátora";
      if (msg.toLowerCase().includes("edge function") || msg.toLowerCase().includes("failed to send")) {
        toast.error(
          "Edge Function create-organizer není dostupná. Nasazení: supabase functions deploy create-organizer",
          { duration: 6000 }
        );
      } else {
        toast.error(msg);
      }
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    toast.success("Organizátor vytvořen – přihlašuje se loginem „" + loginTrim + "“");
    setAddOpen(false);
    setNewLogin("");
    setNewPassword("");
    setNewDisplayName("");
    setNewContactEmail("");
    setNewContactPhone("");
    setAddLarpId("");
    fetchOrganizers();
    fetchOrganizerAccounts();
  };

  /** Přiřazení existujícího uživatele (podle e-mailu) – přímý insert do larp_organizers */
  const handleAddByEmail = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!email || !addLarpId) {
      toast.error("Vyplňte e-mail a vyberte LARP");
      return;
    }
    setSaving(true);
    
    // Find user by auth_email in organizer_accounts
    const { data: account, error: accountError } = await supabase
      .from("organizer_accounts")
      .select("user_id")
      .eq("auth_email", email)
      .maybeSingle();
    
    if (accountError || !account) {
      setSaving(false);
      toast.error("Uživatel s tímto e-mailem nebyl nalezen");
      return;
    }
    
    // Insert into larp_organizers
    const { error } = await supabase
      .from("larp_organizers")
      .insert({
        user_id: account.user_id,
        larp_id: addLarpId,
        email: email,
      });
    
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Tento organizátor je již přiřazen k tomuto LARPu");
      } else {
        toast.error(error.message || "Chyba při přidávání organizátora");
      }
      return;
    }
    toast.success("Organizátor přidán");
    setAddByEmailOpen(false);
    setAddEmail("");
    setAddLarpId("");
    fetchOrganizers();
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("larp_organizers")
      .delete()
      .eq("larp_id", selected.larp_id)
      .eq("user_id", selected.user_id);
    setSaving(false);
    setDeleteOpen(false);
    setSelected(null);
    if (error) {
      toast.error("Chyba při odebírání organizátora");
      return;
    }
    toast.success("Organizátor odebrán");
    fetchOrganizers();
  };

  if (!roleLoading && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const byLarp = organizers.reduce((acc, row) => {
    const name = (row.larps as { name: string } | null)?.name ?? row.larp_id;
    if (!acc[name]) acc[name] = [];
    acc[name].push(row);
    return acc;
  }, {} as Record<string, LarpOrganizerRow[]>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-typewriter text-3xl tracking-wide mb-2">Organizátoři</h1>
            <p className="text-muted-foreground">
              Přidávejte organizátory k LARPům. Nový organizátor dostane login a heslo; přihlašuje se loginem (ne e-mailem).
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setAddOpen(true); setNewLogin(""); setNewPassword(""); setNewDisplayName(""); setNewContactEmail(""); setNewContactPhone(""); setAddLarpId(""); }} className="btn-vintage">
              <Plus className="h-4 w-4 mr-2" />
              Nový organizátor
            </Button>
            <Button variant="outline" onClick={() => { setAddByEmailOpen(true); setAddEmail(""); setAddLarpId(""); }}>
              Přiřadit podle e-mailu
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PaperCard>
            <PaperCardHeader>
              <PaperCardTitle className="font-typewriter tracking-wider flex items-center gap-2">
                <Users className="h-5 w-5" />
                Přiřazení organizátorů k LARPům
              </PaperCardTitle>
            </PaperCardHeader>
            <PaperCardContent>
              {organizers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Zatím nejsou přiřazeni žádní organizátoři. Klikněte na „Přiřadit organizátora“.
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(byLarp).sort(([a], [b]) => a.localeCompare(b)).map(([larpName, rows]) => (
                    <div key={larpName}>
                      <h3 className="font-typewriter text-sm tracking-wider uppercase text-muted-foreground mb-2">
                        {larpName}
                      </h3>
                      <ul className="space-y-2">
                        {rows.map((row) => {
                          const acc = accountsByUserId[row.user_id];
                          const label = acc
                            ? (acc.display_name?.trim() ? `${acc.display_name.trim()} (${acc.login})` : acc.login)
                            : (row.email || row.user_id);
                          return (
                          <li
                            key={`${row.larp_id}-${row.user_id}`}
                            className="flex items-center justify-between py-2 px-3 rounded border bg-card"
                          >
                            <span className="text-sm">{label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelected(row);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </PaperCardContent>
          </PaperCard>
        )}
      </div>

      {/* Dialog: Nový organizátor (login + heslo) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter tracking-wider">Nový organizátor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Organizátor se bude přihlašovat <strong>loginem</strong> (ne e-mailem). Jméno, e-mail a telefon jsou volitelné.
            </p>
            <div className="space-y-2">
              <Label htmlFor="org-login">Login</Label>
              <Input
                id="org-login"
                type="text"
                autoComplete="username"
                value={newLogin}
                onChange={(e) => setNewLogin(e.target.value)}
                placeholder="např. janovak"
              />
              <p className="text-xs text-muted-foreground">Pouze písmena, číslice, pomlčka, podtržítko.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-password">Heslo</Label>
              <Input
                id="org-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min. 6 znaků"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-display-name">Jméno (volitelné)</Label>
              <Input
                id="org-display-name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Jan Novák"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-contact-email">E-mail (volitelný)</Label>
              <Input
                id="org-contact-email"
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder="jan@example.cz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-contact-phone">Telefon (volitelný)</Label>
              <Input
                id="org-contact-phone"
                type="tel"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+420 123 456 789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-larp">LARP</Label>
              <select
                id="org-larp"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addLarpId}
                onChange={(e) => setAddLarpId(e.target.value)}
              >
                <option value="">Vyberte LARP</option>
                {larps.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleCreateOrganizer} disabled={saving} className="btn-vintage">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Vytvořit organizátora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Přiřadit existujícího podle e-mailu */}
      <Dialog open={addByEmailOpen} onOpenChange={setAddByEmailOpen}>
        <DialogContent className="paper-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-typewriter tracking-wider">Přiřadit organizátora podle e-mailu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Uživatel s tímto e-mailem musí již existovat v Supabase (Authentication → Users).
            </p>
            <div className="space-y-2">
              <Label htmlFor="org-email">E-mail</Label>
              <Input
                id="org-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="organizator@example.cz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-larp-email">LARP</Label>
              <select
                id="org-larp-email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addLarpId}
                onChange={(e) => setAddLarpId(e.target.value)}
              >
                <option value="">Vyberte LARP</option>
                {larps.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddByEmailOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleAddByEmail} disabled={saving} className="btn-vintage">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Přiřadit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="paper-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-typewriter">Odebrat organizátora?</AlertDialogTitle>
            <AlertDialogDescription>
              Organizátor {selected ? (accountsByUserId[selected.user_id]?.display_name?.trim() || accountsByUserId[selected.user_id]?.login || selected.email) : ""} bude odebrán z LARPu. Může se znovu přidat kdykoli.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Odebrat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
