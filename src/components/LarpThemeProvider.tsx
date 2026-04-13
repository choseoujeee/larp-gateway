import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LarpDesignSettings {
  primary_color?: string | null;
  primary_foreground?: string | null;
  secondary_color?: string | null;
  secondary_foreground?: string | null;
  accent_color?: string | null;
  accent_foreground?: string | null;
  background_color?: string | null;
  foreground_color?: string | null;
  card_color?: string | null;
  card_foreground?: string | null;
  border_color?: string | null;
  muted_color?: string | null;
  muted_foreground?: string | null;
  destructive_color?: string | null;
  destructive_foreground?: string | null;
  font_heading?: string | null;
  font_body?: string | null;
  button_radius?: string | null;
  custom_css?: string | null;
}

interface LarpThemeProviderProps {
  larpId: string | null;
  children: ReactNode;
}

const CSS_VAR_MAP: Record<string, string> = {
  primary_color: "--primary",
  primary_foreground: "--primary-foreground",
  secondary_color: "--secondary",
  secondary_foreground: "--secondary-foreground",
  accent_color: "--accent",
  accent_foreground: "--accent-foreground",
  background_color: "--background",
  foreground_color: "--foreground",
  card_color: "--card",
  card_foreground: "--card-foreground",
  border_color: "--border",
  muted_color: "--muted",
  muted_foreground: "--muted-foreground",
  destructive_color: "--destructive",
  destructive_foreground: "--destructive-foreground",
};

/**
 * LarpThemeProvider loads design settings for a given larpId
 * and injects CSS custom properties to override the global theme.
 * Used on portal pages to apply per-LARP branding.
 */
export function LarpThemeProvider({ larpId, children }: LarpThemeProviderProps) {
  const [settings, setSettings] = useState<LarpDesignSettings | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!larpId) {
      setSettings(null);
      return;
    }
    supabase
      .from("larp_design_settings" as any)
      .select("*")
      .eq("larp_id", larpId)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data as any as LarpDesignSettings | null);
      });
  }, [larpId]);

  // Load Google Fonts dynamically
  useEffect(() => {
    if (!settings) return;
    const fonts = [settings.font_heading, settings.font_body].filter(
      (f): f is string => !!f && f !== "__default" && !fontsLoaded.has(f)
    );
    if (fonts.length === 0) return;

    const uniqueFonts = [...new Set(fonts)];
    const families = uniqueFonts.map(f => f.replace(/ /g, "+") + ":wght@400;600;700").join("&family=");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
    setFontsLoaded(prev => new Set([...prev, ...uniqueFonts]));
  }, [settings?.font_heading, settings?.font_body]);

  if (!settings) {
    return <>{children}</>;
  }

  // Build inline CSS variables
  const cssVars: Record<string, string> = {};
  for (const [key, varName] of Object.entries(CSS_VAR_MAP)) {
    const value = (settings as any)[key];
    if (value && typeof value === "string") {
      cssVars[varName] = value;
    }
  }

  // Font overrides
  const fontStyle: Record<string, string> = {};
  if (settings.font_body && settings.font_body !== "__default") {
    fontStyle["fontFamily"] = `"${settings.font_body}", sans-serif`;
  }

  // Button radius
  if (settings.button_radius) {
    cssVars["--radius"] = settings.button_radius;
  }

  const hasOverrides = Object.keys(cssVars).length > 0 || Object.keys(fontStyle).length > 0;

  if (!hasOverrides && !settings.custom_css) {
    return <>{children}</>;
  }

  return (
    <div style={{ ...cssVars as any, ...fontStyle }}>
      {settings.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: settings.custom_css }} />
      )}
      {/* Heading font override */}
      {settings.font_heading && settings.font_heading !== "__default" && (
        <style dangerouslySetInnerHTML={{
          __html: `
            .font-typewriter, h1, h2, h3 {
              font-family: "${settings.font_heading}", serif !important;
            }
          `
        }} />
      )}
      {children}
    </div>
  );
}
