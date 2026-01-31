import { useState } from "react";
import { FileText, Gamepad2, Plus, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard, PaperCardContent } from "@/components/ui/paper-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLarpContext } from "@/hooks/useLarpContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LarpPickerPage() {
  const { user, signOut } = useAuth();
  const { larps, currentLarpId, setCurrentLarpId, loading, fetchLarps } = useLarpContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createTheme, setCreateTheme] = useState("wwii");
  const [saving, setSaving] = useState(false);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleCreate = async () => {
    if (!createName?.trim()) {
      toast.error("Zadejte název LARPu");
      return;
    }
    const slug = createSlug?.trim() || generateSlug(createName);
    if (!slug) {
      toast.error("Slug nemůže být prázdný");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("larps")
      .insert({
        name: createName.trim(),
        slug,
        theme: createTheme,
        owner_id: user?.id,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Slug už existuje");
      else toast.error("Chyba při vytváření", { description: error.message });
      return;
    }
    toast.success("LARP vytvořen");
    setCreateOpen(false);
    setCreateName("");
    setCreateSlug("");
    setCreateTheme("wwii");
    await fetchLarps();
    if (data?.id) setCurrentLarpId(data.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-typewriter text-xl text-muted-foreground animate-pulse">
          Načítání LARPů...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-typewriter text-lg tracking-wider text-foreground">
                LARP Portál – Administrace
              </h1>
              <p className="text-xs text-muted-foreground">
                Vyberte LARP, do kterého chcete vstoupit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Odhlásit
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h2 className="font-typewriter text-2xl mb-6 tracking-wide">
          Vaše LARPy
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {larps.map((larp) => (
            <button
              key={larp.id}
              type="button"
              onClick={() => setCurrentLarpId(larp.id)}
              className={cn(
                "text-left rounded-lg border-2 transition-all hover:shadow-lg hover:-translate-y-0.5",
                currentLarpId === larp.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <PaperCard className="h-full border-0 shadow-none">
                <PaperCardContent>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-primary/10">
                      <Gamepad2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-typewriter text-lg font-medium truncate">
                        {larp.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Klikněte pro vstup do administrace
                      </p>
                    </div>
                  </div>
                </PaperCardContent>
              </PaperCard>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="text-left rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <PaperCard className="h-full border-0 shadow-none">
              <PaperCardContent>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-typewriter text-lg font-medium text-muted-foreground">
                      Nový LARP
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Vytvořit nový LARP
                    </p>
                  </div>
                </div>
              </PaperCardContent>
            </PaperCard>
          </button>
        </div>
        {larps.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            Zatím nemáte žádný LARP. Klikněte na „Nový LARP“ a vytvořte první.
          </p>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nový LARP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="create-name">Název</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value);
                  if (!createSlug) setCreateSlug(generateSlug(e.target.value));
                }}
                placeholder="např. Krypta"
              />
            </div>
            <div>
              <Label htmlFor="create-slug">Slug (URL)</Label>
              <Input
                id="create-slug"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="krypta"
              />
            </div>
            <div>
              <Label>Téma</Label>
              <Select value={createTheme} onValueChange={setCreateTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wwii">WWII / historie</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vytvořit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
