import { useState, useEffect, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { V2Shell } from "../components/V2Shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Palette, Upload, X, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

interface DesignSettings {
  id?: string;
  larp_id: string;
  primary_color: string | null; primary_foreground: string | null;
  secondary_color: string | null; secondary_foreground: string | null;
  accent_color: string | null; accent_foreground: string | null;
  background_color: string | null; foreground_color: string | null;
  card_color: string | null; card_foreground: string | null;
  border_color: string | null;
  muted_color: string | null; muted_foreground: string | null;
  destructive_color: string | null; destructive_foreground: string | null;
  font_heading: string | null; font_body: string | null;
  button_radius: string | null;
  sidebar_background: string | null; sidebar_foreground: string | null;
  custom_css: string | null;
  logo_url: string | null; favicon_url: string | null;
  h1_font_size: string | null; h1_font_weight: string | null; h1_letter_spacing: string | null; h1_line_height: string | null; h1_margin_bottom: string | null;
  h2_font_size: string | null; h2_font_weight: string | null; h2_letter_spacing: string | null; h2_line_height: string | null; h2_margin_bottom: string | null;
  h3_font_size: string | null; h3_font_weight: string | null; h3_letter_spacing: string | null; h3_line_height: string | null; h3_margin_bottom: string | null;
  h4_font_size: string | null; h4_font_weight: string | null; h4_letter_spacing: string | null; h4_line_height: string | null; h4_margin_bottom: string | null;
  h5_font_size: string | null; h5_font_weight: string | null; h5_letter_spacing: string | null; h5_line_height: string | null; h5_margin_bottom: string | null;
}

interface TypographyLevel {
  font_size: string | null; font_weight: string | null; letter_spacing: string | null; line_height: string | null; margin_bottom: string | null;
}

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
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/svg+xml,image/x-icon,image/webp";

function hslToHex(hsl: string): string {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%?\s+(\d+(?:\.\d+)?)%?/);
  if (!m) return "#888888";
  const h = parseFloat(m[1]), s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
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
  const p = `h${level}_`;
  return {
    font_size: (s as any)[`${p}font_size`] ?? null,
    font_weight: (s as any)[`${p}font_weight`] ?? null,
    letter_spacing: (s as any)[`${p}letter_spacing`] ?? null,
    line_height: (s as any)[`${p}line_height`] ?? null,
    margin_bottom: (s as any)[`${p}margin_bottom`] ?? null,
  };
}

function setTypography(s: DesignSettings, level: number, field: keyof TypographyLevel, value: string | null): DesignSettings {
  return { ...s, [`h${level}_${field}`]: value || null };
}

export default function V2LarpDesignPage() {
  const { larpSlug } = useParams<{ larpSlug: string }>();
  const [larpId, setLarpId] = useState<string | null>(null);
  const [larpName, setLarpName] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  const [settings, setSettings] = useState<DesignSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewDark, setPreviewDark] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!larpSlug) return;
    (async () => {
      setLoading(true);
      const { data: larp } = await supabase.from("larps").select("id, name").eq("slug", larpSlug).maybeSingle();
      if (!larp) { setNotFound(true); setLoading(false); return; }
      setLarpId(larp.id);
      setLarpName(larp.name);
      const { data } = await supabase
        .from("larp_design_settings" as any)
        .select("*")
        .eq("larp_id", larp.id)
        .maybeSingle();
      setSettings(data ? (data as any as DesignSettings) : emptySettings(larp.id));
      setLoading(false);
    })();
  }, [larpSlug]);

  if (notFound) return <Navigate to="/" replace />;

  const handleColorChange = (k: keyof DesignSettings, hex: string) => settings && setSettings({ ...settings, [k]: hexToHsl(hex) });
  const handleClearColor = (k: keyof DesignSettings) => settings && setSettings({ ...settings, [k]: null });

  const handleFileUpload = async (type: "logo" | "favicon") => {
    if (!larpId || !settings) return;
    const input = type === "logo" ? logoRef.current : faviconRef.current;
    if (!input?.files?.[0]) return;
    const file = input.files[0];
    if (file.size > MAX_FILE_SIZE) { toast.error("Soubor je příliš velký (max 2 MB)"); return; }
    setUploading(type);
    const ext = file.name.split(".").pop() || "png";
    const path = `${larpId}/${type}.${ext}`;
    const { error } = await supabase.storage.from("larp-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Chyba při nahrávání: " + error.message); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("larp-assets").getPublicUrl(path);
    setSettings({ ...settings, [type === "logo" ? "logo_url" : "favicon_url"]: urlData.publicUrl });
    toast.success(`${type === "logo" ? "Logo" : "Favicon"} nahráno`);
    setUploading(null);
    input.value = "";
  };

  const handleSave = async () => {
    if (!settings || !larpId) return;
    setSaving(true);
    try {
      const payload: any = { ...settings };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (settings.id) {
        const { error } = await (supabase.from("larp_design_settings" as any) as any).update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from("larp_design_settings" as any) as any).insert(payload).select().single();
        if (error) throw error;
        setSettings(data as any as DesignSettings);
      }
      toast.success("Vzhled uložen");
    } catch (err: any) {
      toast.error("Chyba při ukládání: " + (err.message || "Neznámá chyba"));
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    if (!larpId) return;
    const reset = emptySettings(larpId);
    if (settings?.id) (reset as any).id = settings.id;
    setSettings(reset);
  };

  if (loading || !settings) {
    return (
      <V2Shell larpName={larpName}>
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </V2Shell>
    );
  }

  const colorGroups = [...new Set(COLOR_FIELDS.map(f => f.group))];
  const pBg = settings.background_color ? `hsl(${settings.background_color})` : undefined;
  const pFg = settings.foreground_color ? `hsl(${settings.foreground_color})` : undefined;
  const pBorder = settings.border_color ? `hsl(${settings.border_color})` : undefined;

  return (
    <V2Shell larpName={larpName}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-typewriter text-2xl tracking-wide md:text-3xl flex items-center gap-2">
              <Palette className="h-6 w-6" /> Design – {larpName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Barvy, fonty, logo a typografie portálu pro hráče.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset} disabled={saving}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Uložit
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader><CardTitle>Logo & Favicon</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Logo</Label>
                {settings.logo_url && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted">
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    <button onClick={() => setSettings({ ...settings, logo_url: null })} className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground"><X className="h-3 w-3" /></button>
                  </div>
                )}
                <input ref={logoRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden" onChange={() => handleFileUpload("logo")} />
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={!!uploading}>
                  {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}Nahrát logo
                </Button>
                <p className="text-xs text-muted-foreground">Max 2 MB, PNG/JPEG/SVG/WebP</p>
              </div>
              <div className="space-y-3">
                <Label>Favicon</Label>
                {settings.favicon_url && (
                  <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-muted">
                    <img src={settings.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                    <button onClick={() => setSettings({ ...settings, favicon_url: null })} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive text-destructive-foreground"><X className="h-3 w-3" /></button>
                  </div>
                )}
                <input ref={faviconRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden" onChange={() => handleFileUpload("favicon")} />
                <Button variant="outline" size="sm" onClick={() => faviconRef.current?.click()} disabled={!!uploading}>
                  {uploading === "favicon" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}Nahrát favicon
                </Button>
                <p className="text-xs text-muted-foreground">Max 2 MB, PNG/ICO/SVG</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {colorGroups.map(group => (
          <Card key={group}>
            <CardHeader><CardTitle>{group} barvy</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {COLOR_FIELDS.filter(f => f.group === group).map(field => {
                  const value = settings[field.key] as string | null;
                  const hex = value ? hslToHex(value) : "#888888";
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{field.label}</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={hex} onChange={(e) => handleColorChange(field.key, e.target.value)} className="w-10 h-8 rounded border border-border cursor-pointer" />
                        <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{value || "výchozí"}</span>
                        {value && <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => handleClearColor(field.key)}>×</Button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader><CardTitle>Fonty</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font nadpisů</Label>
                <Select value={settings.font_heading || "__default"} onValueChange={(v) => setSettings({ ...settings, font_heading: v === "__default" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map(f => <SelectItem key={f || "__default"} value={f || "__default"}>{f || "Výchozí (systémový)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Font těla</Label>
                <Select value={settings.font_body || "__default"} onValueChange={(v) => setSettings({ ...settings, font_body: v === "__default" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOOGLE_FONTS.map(f => <SelectItem key={f || "__default"} value={f || "__default"}>{f || "Výchozí (systémový)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Typografie nadpisů (H1–H5)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-6">
              {HEADING_LEVELS.map(level => {
                const typo = getTypography(settings, level);
                return (
                  <div key={level} className="space-y-2">
                    <Label className="text-sm font-semibold">H{level}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Velikost</Label>
                        <Input placeholder="2rem" value={typo.font_size || ""} onChange={e => setSettings(setTypography(settings, level, "font_size", e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tloušťka</Label>
                        <Select value={typo.font_weight || "__default"} onValueChange={v => setSettings(setTypography(settings, level, "font_weight", v === "__default" ? null : v))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__default">výchozí</SelectItem>
                            {FONT_WEIGHT_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Rozpal</Label>
                        <Input placeholder="0.05em" value={typo.letter_spacing || ""} onChange={e => setSettings(setTypography(settings, level, "letter_spacing", e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Výška řádku</Label>
                        <Input placeholder="1.4" value={typo.line_height || ""} onChange={e => setSettings(setTypography(settings, level, "line_height", e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Spodní okraj</Label>
                        <Input placeholder="0.5rem" value={typo.margin_bottom || ""} onChange={e => setSettings(setTypography(settings, level, "margin_bottom", e.target.value))} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Zaoblení tlačítek</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 max-w-xs">
              <Input type="text" placeholder="0.5rem" value={settings.button_radius || ""} onChange={(e) => setSettings({ ...settings, button_radius: e.target.value || null })} />
              <div className="w-24 h-10 bg-primary rounded flex items-center justify-center text-primary-foreground text-sm" style={{ borderRadius: settings.button_radius || undefined }}>Ukázka</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vlastní CSS (pokročilé)</CardTitle></CardHeader>
          <CardContent>
            <Textarea placeholder="/* Vlastní CSS pro portál */" value={settings.custom_css || ""} onChange={(e) => setSettings({ ...settings, custom_css: e.target.value || null })} rows={6} className="font-mono text-sm" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Náhled</CardTitle>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch checked={previewDark} onCheckedChange={setPreviewDark} />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border p-6 space-y-4 transition-colors" style={{
              backgroundColor: previewDark ? "#1a1a2e" : (pBg || "#ffffff"),
              color: previewDark ? "#e0e0e0" : (pFg || "#1a1a1a"),
              borderColor: pBorder || "#e5e5e5",
              fontFamily: settings.font_body && settings.font_body !== "__default" ? `"${settings.font_body}", sans-serif` : undefined,
            }}>
              {settings.logo_url && <img src={settings.logo_url} alt="Logo náhled" className="h-12 object-contain mb-2" />}
              {HEADING_LEVELS.map(level => {
                const typo = getTypography(settings, level);
                const Tag = `h${level}` as keyof JSX.IntrinsicElements;
                return (
                  <Tag key={level} style={{
                    fontFamily: settings.font_heading && settings.font_heading !== "__default" ? `"${settings.font_heading}", serif` : undefined,
                    fontSize: typo.font_size || undefined,
                    fontWeight: (typo.font_weight && typo.font_weight !== "__default" ? Number(typo.font_weight) : undefined) as any,
                    letterSpacing: typo.letter_spacing || undefined,
                    lineHeight: typo.line_height || undefined,
                    marginBottom: typo.margin_bottom || undefined,
                    color: previewDark ? "#e0e0e0" : (pFg || "#1a1a1a"),
                  }}>Nadpis H{level} – {larpName}</Tag>
                );
              })}
              <p style={{ color: settings.muted_foreground ? `hsl(${settings.muted_foreground})` : undefined }}>
                Ukázkový text portálu pro hráče. Náhled s vašimi barvami a typografií.
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium" style={{
                  backgroundColor: settings.primary_color ? `hsl(${settings.primary_color})` : undefined,
                  color: settings.primary_foreground ? `hsl(${settings.primary_foreground})` : undefined,
                  borderRadius: settings.button_radius || "0.375rem",
                }}>Primární</button>
                <button className="px-4 py-2 text-sm font-medium border" style={{
                  backgroundColor: settings.secondary_color ? `hsl(${settings.secondary_color})` : undefined,
                  color: settings.secondary_foreground ? `hsl(${settings.secondary_foreground})` : undefined,
                  borderRadius: settings.button_radius || "0.375rem",
                  borderColor: pBorder || "#e5e5e5",
                }}>Sekundární</button>
              </div>
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: settings.card_color ? `hsl(${settings.card_color})` : undefined,
                color: settings.card_foreground ? `hsl(${settings.card_foreground})` : undefined,
                borderColor: pBorder || "#e5e5e5",
              }}>Ukázková karta s obsahem dokumentu.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </V2Shell>
  );
}
