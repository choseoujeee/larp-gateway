import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useLarpContext } from "@/hooks/useLarpContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PaperCard, PaperCardHeader, PaperCardTitle, PaperCardContent } from "@/components/ui/paper-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Palette, Upload, X, Sun, Moon, Info } from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */

interface TypographyLevel {
  font_size: string | null;
  font_weight: string | null;
  letter_spacing: string | null;
  line_height: string | null;
  margin_bottom: string | null;
}

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
  logo_url: string | null;
  favicon_url: string | null;
  // H1-H5 typography
  h1_font_size: string | null;
  h1_font_weight: string | null;
  h1_letter_spacing: string | null;
  h1_line_height: string | null;
  h1_margin_bottom: string | null;
  h2_font_size: string | null;
  h2_font_weight: string | null;
  h2_letter_spacing: string | null;
  h2_line_height: string | null;
  h2_margin_bottom: string | null;
  h3_font_size: string | null;
  h3_font_weight: string | null;
  h3_letter_spacing: string | null;
  h3_line_height: string | null;
  h3_margin_bottom: string | null;
  h4_font_size: string | null;
  h4_font_weight: string | null;
  h4_letter_spacing: string | null;
  h4_line_height: string | null;
  h4_margin_bottom: string | null;
  h5_font_size: string | null;
  h5_font_weight: string | null;
  h5_letter_spacing: string | null;
  h5_line_height: string | null;
  h5_margin_bottom: string | null;
}

/* ─── Constants ─── */

const GOOGLE_FONTS = [
  "", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Playfair Display", "Merriweather", "Source Sans Pro", "PT Sans",
  "Nunito", "Raleway", "Oswald", "Special Elite", "IM Fell English",
  "Crimson Text", "Libre Baskerville",
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

const HEADING_LEVELS = [1, 2, 3, 4, 5] as const;
const FONT_WEIGHT_OPTIONS = ["400", "500", "600", "700", "800", "900"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/svg+xml,image/x-icon,image/webp";

/* ─── Helpers ─── */

function hslToHex(hsl: string): string {
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

/** Validate CSS dimension value like "2rem", "16px", "1.5em", "120%" */
function isValidCssValue(v: string | null): boolean {
  if (!v || v.trim() === "") return true;
  return /^-?\d+(\.\d+)?(rem|px|em|%|ex|ch|vw|vh)$/.test(v.trim());
}

const emptySettings = (larpId: string): DesignSettings => ({
  larp_id: larpId,
  primary_color: null, primary_foreground: null,
  secondary_color: null, secondary_foreground: null,
  accent_color: null, accent_foreground: null,
  background_color: null, foreground_color: null,
  card_color: null, card_foreground: null,
  border_color: null, muted_color: null, muted_foreground: null,
  destructive_color: null, destructive_foreground: null,
  font_heading: null, font_body: null,
  button_radius: null,
  sidebar_background: null, sidebar_foreground: null,
  custom_css: null,
  logo_url: null, favicon_url: null,
  h1_font_size: null, h1_font_weight: null, h1_letter_spacing: null, h1_line_height: null, h1_margin_bottom: null,
  h2_font_size: null, h2_font_weight: null, h2_letter_spacing: null, h2_line_height: null, h2_margin_bottom: null,
  h3_font_size: null, h3_font_weight: null, h3_letter_spacing: null, h3_line_height: null, h3_margin_bottom: null,
  h4_font_size: null, h4_font_weight: null, h4_letter_spacing: null, h4_line_height: null, h4_margin_bottom: null,
  h5_font_size: null, h5_font_weight: null, h5_letter_spacing: null, h5_line_height: null, h5_margin_bottom: null,
});

function getTypography(s: DesignSettings, level: number): TypographyLevel {
  const prefix = `h${level}_` as const;
  return {
    font_size: (s as any)[`${prefix}font_size`] ?? null,
    font_weight: (s as any)[`${prefix}font_weight`] ?? null,
    letter_spacing: (s as any)[`${prefix}letter_spacing`] ?? null,
    line_height: (s as any)[`${prefix}line_height`] ?? null,
    margin_bottom: (s as any)[`${prefix}margin_bottom`] ?? null,
  };
}

function setTypography(s: DesignSettings, level: number, field: keyof TypographyLevel, value: string | null): DesignSettings {
  const key = `h${level}_${field}`;
  return { ...s, [key]: value || null };
}

/* ─── Component ─── */

export default function LarpDesignPage() {
  const { currentLarpId, currentLarp } = useLarpContext();
  const [settings, setSettings] = useState<DesignSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewDark, setPreviewDark] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentLarpId) { setSettings(null); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("larp_design_settings" as any)
      .select("*")
      .eq("larp_id", currentLarpId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error(error); setSettings(emptySettings(currentLarpId)); }
        else setSettings(data ? (data as any as DesignSettings) : emptySettings(currentLarpId));
        setLoading(false);
      });
  }, [currentLarpId]);

  /* ─── Handlers ─── */

  const handleColorChange = (key: keyof DesignSettings, hex: string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: hexToHsl(hex) });
  };

  const handleClearColor = (key: keyof DesignSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: null });
  };

  const handleFileUpload = async (type: "logo" | "favicon") => {
    if (!currentLarpId || !settings) return;
    const input = type === "logo" ? logoRef.current : faviconRef.current;
    if (!input?.files?.[0]) return;
    const file = input.files[0];
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Soubor je příliš velký (max 2 MB)");
      return;
    }
    setUploading(type);
    const ext = file.name.split(".").pop() || "png";
    const path = `${currentLarpId}/${type}.${ext}`;
    const { error } = await supabase.storage.from("larp-assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Chyba při nahrávání: " + error.message);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("larp-assets").getPublicUrl(path);
    const urlKey = type === "logo" ? "logo_url" : "favicon_url";
    setSettings({ ...settings, [urlKey]: urlData.publicUrl });
    toast.success(`${type === "logo" ? "Logo" : "Favicon"} nahráno`);
    setUploading(null);
    input.value = "";
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
        const { error } = await (supabase.from("larp_design_settings" as any) as any).update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from("larp_design_settings" as any) as any).insert(payload).select().single();
        if (error) throw error;
        setSettings(data as any as DesignSettings);
      }
      toast.success("Nastavení vzhledu uloženo");
    } catch (err: any) {
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

  /* ─── Render ─── */

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

  // Gate: vizual_fix mode
  if (currentLarp?.visual_mode === "vizual_fix") {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Info className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">Pevný vizuální styl</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Tento LARP používá režim <strong>vizual_fix</strong> — vizuální styl je pevně nastaven a nelze ho měnit přes admin.
            Pro aktivaci konfigurace změňte režim na <em>Konfigurovatelný vzhled</em> v nastavení LARPu.
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (!settings) return null;

  const colorGroups = [...new Set(COLOR_FIELDS.map(f => f.group))];

  // Build preview style
  const pBg = settings.background_color ? `hsl(${settings.background_color})` : undefined;
  const pFg = settings.foreground_color ? `hsl(${settings.foreground_color})` : undefined;
  const pBorder = settings.border_color ? `hsl(${settings.border_color})` : undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="h-6 w-6" />
              Vzhled portálu – {currentLarp?.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Nastavte barvy, fonty, logo a typografii portálu pro hráče.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />Reset
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Uložit
            </Button>
          </div>
        </div>

        {/* Logo & Favicon */}
        <PaperCard>
          <PaperCardHeader><PaperCardTitle>Logo & Favicon</PaperCardTitle></PaperCardHeader>
          <PaperCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Logo</Label>
                {settings.logo_url && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted">
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setSettings({ ...settings, logo_url: null })}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                    ><X className="h-3 w-3" /></button>
                  </div>
                )}
                <input ref={logoRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden" onChange={() => handleFileUpload("logo")} />
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={!!uploading}>
                  {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Nahrát logo
                </Button>
                <p className="text-xs text-muted-foreground">Max 2 MB, PNG/JPEG/SVG/WebP</p>
              </div>
              <div className="space-y-3">
                <Label>Favicon</Label>
                {settings.favicon_url && (
                  <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-muted">
                    <img src={settings.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setSettings({ ...settings, favicon_url: null })}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive text-destructive-foreground"
                    ><X className="h-3 w-3" /></button>
                  </div>
                )}
                <input ref={faviconRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden" onChange={() => handleFileUpload("favicon")} />
                <Button variant="outline" size="sm" onClick={() => faviconRef.current?.click()} disabled={!!uploading}>
                  {uploading === "favicon" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Nahrát favicon
                </Button>
                <p className="text-xs text-muted-foreground">Max 2 MB, PNG/ICO/SVG</p>
              </div>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Colors */}
        {colorGroups.map(group => (
          <PaperCard key={group}>
            <PaperCardHeader><PaperCardTitle>{group} barvy</PaperCardTitle></PaperCardHeader>
            <PaperCardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {COLOR_FIELDS.filter(f => f.group === group).map(field => {
                  const value = settings[field.key] as string | null;
                  const hexValue = value ? hslToHex(value) : "#888888";
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{field.label}</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={hexValue} onChange={(e) => handleColorChange(field.key, e.target.value)}
                          className="w-10 h-8 rounded border border-border cursor-pointer" />
                        <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{value || "výchozí"}</span>
                        {value && <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => handleClearColor(field.key)}>×</Button>}
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
          <PaperCardHeader><PaperCardTitle>Fonty</PaperCardTitle></PaperCardHeader>
          <PaperCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font nadpisů</Label>
                <Select value={settings.font_heading || ""} onValueChange={(v) => setSettings({ ...settings, font_heading: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Výchozí (systémový)" /></SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map(f => <SelectItem key={f || "__default"} value={f || "__default"}>{f || "Výchozí (systémový)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Font těla</Label>
                <Select value={settings.font_body || ""} onValueChange={(v) => setSettings({ ...settings, font_body: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Výchozí (systémový)" /></SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map(f => <SelectItem key={f || "__default"} value={f || "__default"}>{f || "Výchozí (systémový)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Typography H1-H5 */}
        <PaperCard>
          <PaperCardHeader><PaperCardTitle>Typografie nadpisů (H1–H5)</PaperCardTitle></PaperCardHeader>
          <PaperCardContent>
            <div className="space-y-6">
              {HEADING_LEVELS.map(level => {
                const typo = getTypography(settings, level);
                return (
                  <div key={level} className="space-y-2">
                    <Label className="text-sm font-semibold">H{level}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Velikost</Label>
                        <Input placeholder="např. 2rem" value={typo.font_size || ""}
                          onChange={e => setSettings(setTypography(settings, level, "font_size", e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tloušťka</Label>
                        <Select value={typo.font_weight || ""} onValueChange={v => setSettings(setTypography(settings, level, "font_weight", v || null))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="výchozí" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__default">výchozí</SelectItem>
                            {FONT_WEIGHT_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Rozpal</Label>
                        <Input placeholder="např. 0.05em" value={typo.letter_spacing || ""}
                          onChange={e => setSettings(setTypography(settings, level, "letter_spacing", e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Výška řádku</Label>
                        <Input placeholder="např. 1.4" value={typo.line_height || ""}
                          onChange={e => setSettings(setTypography(settings, level, "line_height", e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Spodní okraj</Label>
                        <Input placeholder="např. 0.5rem" value={typo.margin_bottom || ""}
                          onChange={e => setSettings(setTypography(settings, level, "margin_bottom", e.target.value))} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Button radius */}
        <PaperCard>
          <PaperCardHeader><PaperCardTitle>Zaoblení tlačítek</PaperCardTitle></PaperCardHeader>
          <PaperCardContent>
            <div className="flex items-center gap-4 max-w-xs">
              <Input type="text" placeholder="např. 0.5rem" value={settings.button_radius || ""}
                onChange={(e) => setSettings({ ...settings, button_radius: e.target.value || null })} />
              <div className="w-24 h-10 bg-primary rounded flex items-center justify-center text-primary-foreground text-sm"
                style={{ borderRadius: settings.button_radius || undefined }}>
                Ukázka
              </div>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Custom CSS */}
        <PaperCard>
          <PaperCardHeader><PaperCardTitle>Vlastní CSS (pokročilé)</PaperCardTitle></PaperCardHeader>
          <PaperCardContent>
            <Textarea placeholder="/* Vlastní CSS pravidla pro portál */" value={settings.custom_css || ""}
              onChange={(e) => setSettings({ ...settings, custom_css: e.target.value || null })} rows={6} className="font-mono text-sm" />
          </PaperCardContent>
        </PaperCard>

        {/* Live Preview */}
        <PaperCard>
          <PaperCardHeader>
            <div className="flex items-center justify-between">
              <PaperCardTitle>Náhled</PaperCardTitle>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch checked={previewDark} onCheckedChange={setPreviewDark} />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </PaperCardHeader>
          <PaperCardContent>
            <div
              className="rounded-xl border p-6 space-y-4 transition-colors"
              style={{
                backgroundColor: previewDark ? "#1a1a2e" : (pBg || "#ffffff"),
                color: previewDark ? "#e0e0e0" : (pFg || "#1a1a1a"),
                borderColor: pBorder || "#e5e5e5",
                fontFamily: settings.font_body && settings.font_body !== "__default" ? `"${settings.font_body}", sans-serif` : undefined,
              }}
            >
              {/* Logo in preview */}
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo preview" className="h-12 object-contain mb-2" />
              )}

              {/* H1-H5 preview */}
              {HEADING_LEVELS.map(level => {
                const typo = getTypography(settings, level);
                const Tag = `h${level}` as keyof JSX.IntrinsicElements;
                return (
                  <Tag
                    key={level}
                    style={{
                      fontFamily: settings.font_heading && settings.font_heading !== "__default"
                        ? `"${settings.font_heading}", serif` : undefined,
                      fontSize: typo.font_size || undefined,
                      fontWeight: (typo.font_weight && typo.font_weight !== "__default" ? Number(typo.font_weight) : undefined) as any,
                      letterSpacing: typo.letter_spacing || undefined,
                      lineHeight: typo.line_height || undefined,
                      marginBottom: typo.margin_bottom || undefined,
                      color: previewDark ? "#e0e0e0" : (pFg || "#1a1a1a"),
                    }}
                  >
                    Nadpis H{level} – {currentLarp?.name || "LARP"}
                  </Tag>
                );
              })}

              <p style={{ color: settings.muted_foreground ? `hsl(${settings.muted_foreground})` : undefined }}>
                Ukázkový text portálu pro hráče. Toto je náhled jak bude vypadat portál s vašimi barvami a typografií.
              </p>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: settings.primary_color ? `hsl(${settings.primary_color})` : undefined,
                    color: settings.primary_foreground ? `hsl(${settings.primary_foreground})` : undefined,
                    borderRadius: settings.button_radius || "0.375rem",
                  }}
                >
                  Primární
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium border transition-colors"
                  style={{
                    backgroundColor: settings.secondary_color ? `hsl(${settings.secondary_color})` : undefined,
                    color: settings.secondary_foreground ? `hsl(${settings.secondary_foreground})` : undefined,
                    borderRadius: settings.button_radius || "0.375rem",
                    borderColor: pBorder || "#e5e5e5",
                  }}
                >
                  Sekundární
                </button>
              </div>

              {/* Card */}
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: settings.card_color ? `hsl(${settings.card_color})` : undefined,
                color: settings.card_foreground ? `hsl(${settings.card_foreground})` : undefined,
                borderColor: pBorder || "#e5e5e5",
              }}>
                Ukázková karta s obsahem dokumentu.
              </div>
            </div>
          </PaperCardContent>
        </PaperCard>
      </div>
    </AdminLayout>
  );
}
