import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useLarpContext } from "@/hooks/useLarpContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Palette } from "lucide-react";
import { toast } from "sonner";

interface DesignSettings {
  id?: string;
  larp_id: string;
  primary_color: string | null;
  primary_foreground: string | null;
  secondary_color: string | null;
  secondary_foreground: string | null;
  accent_color: string | null;
  accent_foreground: string | null;
  background_color: string | null;
  foreground_color: string | null;
  card_color: string | null;
  card_foreground: string | null;
  border_color: string | null;
  muted_color: string | null;
  muted_foreground: string | null;
  destructive_color: string | null;
  destructive_foreground: string | null;
  font_heading: string | null;
  font_body: string | null;
  button_radius: string | null;
  sidebar_background: string | null;
  sidebar_foreground: string | null;
  custom_css: string | null;
}

const GOOGLE_FONTS = [
  "", // default
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
  "PT Sans",
  "Nunito",
  "Raleway",
  "Oswald",
  "Special Elite",
  "IM Fell English",
  "Crimson Text",
  "Libre Baskerville",
];

const COLOR_FIELDS: { key: keyof DesignSettings; label: string; group: string }[] = [
  { key: "primary_color", label: "Primární", group: "Hlavní" },
  { key: "primary_foreground", label: "Primární text", group: "Hlavní" },
  { key: "secondary_color", label: "Sekundární", group: "Hlavní" },
  { key: "secondary_foreground", label: "Sekundární text", group: "Hlavní" },
  { key: "accent_color", label: "Accent", group: "Hlavní" },
  { key: "accent_foreground", label: "Accent text", group: "Hlavní" },
  { key: "background_color", label: "Pozadí", group: "Plocha" },
  { key: "foreground_color", label: "Text", group: "Plocha" },
  { key: "card_color", label: "Karta", group: "Plocha" },
  { key: "card_foreground", label: "Karta text", group: "Plocha" },
  { key: "border_color", label: "Okraj", group: "Plocha" },
  { key: "muted_color", label: "Muted", group: "Plocha" },
  { key: "muted_foreground", label: "Muted text", group: "Plocha" },
  { key: "destructive_color", label: "Destructive", group: "Ostatní" },
  { key: "destructive_foreground", label: "Destructive text", group: "Ostatní" },
  { key: "sidebar_background", label: "Sidebar pozadí", group: "Ostatní" },
  { key: "sidebar_foreground", label: "Sidebar text", group: "Ostatní" },
];

function hslToHex(hsl: string): string {
  // Parse "H S% L%" format
  const match = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%?\s+(\d+(?:\.\d+)?)%?/);
  if (!match) return "#888888";
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const emptySettings = (larpId: string): DesignSettings => ({
  larp_id: larpId,
  primary_color: null,
  primary_foreground: null,
  secondary_color: null,
  secondary_foreground: null,
  accent_color: null,
  accent_foreground: null,
  background_color: null,
  foreground_color: null,
  card_color: null,
  card_foreground: null,
  border_color: null,
  muted_color: null,
  muted_foreground: null,
  destructive_color: null,
  destructive_foreground: null,
  font_heading: null,
  font_body: null,
  button_radius: null,
  sidebar_background: null,
  sidebar_foreground: null,
  custom_css: null,
});

export default function LarpDesignPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const [settings, setSettings] = useState<DesignSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentLarpId) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("larp_design_settings" as any)
      .select("*")
      .eq("larp_id", currentLarpId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading design settings:", error);
          setSettings(emptySettings(currentLarpId));
        } else if (data) {
          setSettings(data as any as DesignSettings);
        } else {
          setSettings(emptySettings(currentLarpId));
        }
        setLoading(false);
      });
  }, [currentLarpId]);

  const handleColorChange = (key: keyof DesignSettings, hex: string) => {
    if (!settings) return;
    const hsl = hexToHsl(hex);
    setSettings({ ...settings, [key]: hsl });
  };

  const handleClearColor = (key: keyof DesignSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: null });
  };

  const handleSave = async () => {
    if (!settings || !currentLarpId) return;
    setSaving(true);
    try {
      const payload = { ...settings };
      delete (payload as any).id;
      delete (payload as any).created_at;
      delete (payload as any).updated_at;

      if (settings.id) {
        const { error } = await (supabase.from("larp_design_settings" as any) as any)
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from("larp_design_settings" as any) as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setSettings(data as any as DesignSettings);
      }
      toast.success("Nastavení vzhledu uloženo");
    } catch (err: any) {
      console.error("Error saving design settings:", err);
      toast.error("Chyba při ukládání: " + (err.message || "Neznámá chyba"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!currentLarpId) return;
    const id = settings?.id;
    const reset = emptySettings(currentLarpId);
    if (id) (reset as any).id = id;
    setSettings(reset);
  };

  if (!currentLarpId) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Nejprve vyberte LARP v levém panelu.
        </div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) return null;

  const colorGroups = [...new Set(COLOR_FIELDS.map(f => f.group))];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="h-6 w-6" />
              Vzhled portálu – {currentLarp?.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Nastavte barvy, fonty a styly portálu pro hráče. Ponechané prázdné hodnoty použijí výchozí nastavení.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset na výchozí
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Uložit
            </Button>
          </div>
        </div>

        {/* Colors */}
        {colorGroups.map(group => (
          <PaperCard key={group}>
            <PaperCardHeader>
              <PaperCardTitle>{group} barvy</PaperCardTitle>
            </PaperCardHeader>
            <PaperCardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {COLOR_FIELDS.filter(f => f.group === group).map(field => {
                  const value = settings[field.key] as string | null;
                  const hexValue = value ? hslToHex(value) : "#888888";
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{field.label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={hexValue}
                          onChange={(e) => handleColorChange(field.key, e.target.value)}
                          className="w-10 h-8 rounded border border-border cursor-pointer"
                        />
                        <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
                          {value || "výchozí"}
                        </span>
                        {value && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => handleClearColor(field.key)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </PaperCardContent>
          </PaperCard>
        ))}

        {/* Fonts */}
        <PaperCard>
          <PaperCardHeader>
            <PaperCardTitle>Fonty</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font nadpisů</Label>
                <Select
                  value={settings.font_heading || ""}
                  onValueChange={(v) => setSettings({ ...settings, font_heading: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Výchozí (systémový)" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map(f => (
                      <SelectItem key={f || "__default"} value={f || "__default"}>
                        {f || "Výchozí (systémový)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Font těla</Label>
                <Select
                  value={settings.font_body || ""}
                  onValueChange={(v) => setSettings({ ...settings, font_body: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Výchozí (systémový)" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map(f => (
                      <SelectItem key={f || "__default"} value={f || "__default"}>
                        {f || "Výchozí (systémový)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Button radius */}
        <PaperCard>
          <PaperCardHeader>
            <PaperCardTitle>Zaoblení tlačítek</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <div className="flex items-center gap-4 max-w-xs">
              <Input
                type="text"
                placeholder="např. 0.5rem"
                value={settings.button_radius || ""}
                onChange={(e) => setSettings({ ...settings, button_radius: e.target.value || null })}
              />
              <div
                className="w-24 h-10 bg-primary rounded flex items-center justify-center text-primary-foreground text-sm"
                style={{ borderRadius: settings.button_radius || undefined }}
              >
                Ukázka
              </div>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Custom CSS */}
        <PaperCard>
          <PaperCardHeader>
            <PaperCardTitle>Vlastní CSS (pokročilé)</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <Textarea
              placeholder="/* Vlastní CSS pravidla pro portál */"
              value={settings.custom_css || ""}
              onChange={(e) => setSettings({ ...settings, custom_css: e.target.value || null })}
              rows={6}
              className="font-mono text-sm"
            />
          </PaperCardContent>
        </PaperCard>

        {/* Live preview */}
        <PaperCard>
          <PaperCardHeader>
            <PaperCardTitle>Náhled</PaperCardTitle>
          </PaperCardHeader>
          <PaperCardContent>
            <div
              className="rounded-lg border p-6 space-y-4"
              style={{
                backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined,
                color: settings.foreground_color ? `hsl(${settings.foreground_color})` : undefined,
                borderColor: settings.border_color ? `hsl(${settings.border_color})` : undefined,
                fontFamily: settings.font_body || undefined,
              }}
            >
              <h2
                className="text-2xl font-bold tracking-wider"
                style={{
                  fontFamily: settings.font_heading || undefined,
                  color: settings.foreground_color ? `hsl(${settings.foreground_color})` : undefined,
                }}
              >
                {currentLarp?.name || "Název LARPu"}
              </h2>
              <p style={{ color: settings.muted_foreground ? `hsl(${settings.muted_foreground})` : undefined }}>
                Ukázkový text portálu pro hráče. Toto je náhled jak bude vypadat portál s vašimi barvami.
              </p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: settings.primary_color ? `hsl(${settings.primary_color})` : undefined,
                    color: settings.primary_foreground ? `hsl(${settings.primary_foreground})` : undefined,
                    borderRadius: settings.button_radius || "0.375rem",
                  }}
                >
                  Primární
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium border"
                  style={{
                    backgroundColor: settings.secondary_color ? `hsl(${settings.secondary_color})` : undefined,
                    color: settings.secondary_foreground ? `hsl(${settings.secondary_foreground})` : undefined,
                    borderRadius: settings.button_radius || "0.375rem",
                    borderColor: settings.border_color ? `hsl(${settings.border_color})` : undefined,
                  }}
                >
                  Sekundární
                </button>
              </div>
              <div
                className="p-4 rounded border"
                style={{
                  backgroundColor: settings.card_color ? `hsl(${settings.card_color})` : undefined,
                  color: settings.card_foreground ? `hsl(${settings.card_foreground})` : undefined,
                  borderColor: settings.border_color ? `hsl(${settings.border_color})` : undefined,
                }}
              >
                Ukázková karta s obsahem dokumentu.
              </div>
            </div>
          </PaperCardContent>
        </PaperCard>
      </div>
    </AdminLayout>
  );
}
