import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, KeyRound, Plus, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { randomPassword } from "../../lib/slug";
import { toast } from "sonner";

interface AccessRow {
  id: string;
  token: string;
  password_hash: string;
}

interface Props {
  larpId: string;
  /** null = LARP-scope portal (whole LARP); uuid = běh-specifický */
  runId: string | null;
}

export function ProductionPortalCard({ larpId, runId }: Props) {
  const [access, setAccess] = useState<AccessRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("production_portal_access").select("id, token, password_hash").eq("larp_id", larpId);
    q = runId ? q.eq("run_id", runId) : q.is("run_id", null);
    const { data, error } = await q.maybeSingle();
    if (error && error.code !== "PGRST116") toast.error(error.message);
    setAccess((data ?? null) as AccessRow | null);
    setLoading(false);
  }, [larpId, runId]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    const { error } = await supabase.rpc("create_production_portal_access_no_password", {
      p_larp_id: larpId, p_run_id: runId ?? undefined,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Odkaz vytvořen");
    load();
  }

  async function setPassword() {
    if (!access) return;
    const pw = prompt("Nové heslo (prázdné = bez hesla):", randomPassword());
    if (pw === null) return;
    if (pw.trim() === "") {
      const { error } = await supabase.rpc("remove_production_portal_password", { p_access_id: access.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Heslo odebráno");
    } else {
      const { error } = await supabase.rpc("set_production_portal_password", { p_access_id: access.id, p_new_password: pw.trim() });
      if (error) { toast.error(error.message); return; }
      toast.success(`Heslo nastaveno: ${pw.trim()}`, { duration: 10000 });
    }
    load();
  }

  async function revoke() {
    if (!access) return;
    if (!confirm("Smazat přístup do portálu? Stávající odkaz přestane fungovat.")) return;
    const { error } = await supabase.from("production_portal_access").delete().eq("id", access.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Smazáno");
    load();
  }

  const url = access ? `${window.location.origin}/~/produkce/${access.token}` : "";
  const hasPassword = !!access?.password_hash && access.password_hash.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-typewriter text-base">Produkční portál</CardTitle>
        {!loading && !access && (
          <Button size="sm" onClick={generate}>
            <Plus className="mr-1 h-4 w-4" />Vytvořit odkaz
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !access ? (
          <p className="text-sm text-muted-foreground">
            Sdílený odkaz pro tým produkce. Po vytvoření můžete nastavit volitelné heslo.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input readOnly value={url} className="flex-1 min-w-[200px] font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Zkopírováno"); }}>
                <Copy className="mr-1 h-4 w-4" />Kopírovat
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Otevřít</a>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasPassword
                ? <Badge variant="secondary">Chráněno heslem</Badge>
                : <Badge variant="outline">Bez hesla — přístup přes odkaz</Badge>}
              <Button size="sm" variant="outline" onClick={setPassword}>
                <KeyRound className="mr-1 h-4 w-4" />{hasPassword ? "Změnit / odebrat heslo" : "Nastavit heslo"}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={revoke}>
                <Trash2 className="mr-1 h-4 w-4" />Zrušit přístup
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
