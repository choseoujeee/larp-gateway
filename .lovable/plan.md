

# Plan: Visual Mode Decision (`vizual_fix` / `vizual_variabil`)

## Current State
- `larp_design_settings` table already exists with colors, fonts, border radius, custom CSS
- `LarpDesignPage.tsx` admin page already exists with color pickers, font selectors, preview
- `LarpThemeProvider.tsx` applies CSS vars on portal pages
- Missing: visual mode flag, logo/favicon uploads, H1-H5 typography, light/dark preview toggle

## Implementation Plan (10 steps)

1. **DB migration**: Add `visual_mode` column (`text`, default `'vizual_fix'`) to `larps` table. Add typography columns to `larp_design_settings`: `h1_font_size`, `h1_font_weight`, `h1_letter_spacing`, `h1_line_height`, `h1_margin_bottom` (repeat for h2-h5). Add `logo_url` and `favicon_url` columns to `larp_design_settings`.

2. **Storage bucket**: Create `larp-assets` public bucket for logo/favicon uploads with RLS policies allowing authenticated users to upload to their LARP's folder.

3. **LarpDesignPage.tsx -- gate by visual_mode**: Read `currentLarp.visual_mode`. If `vizual_fix`, show a read-only info page ("Tento LARP používá pevný vizuální styl"). If `vizual_variabil`, show the full editor.

4. **LarpDesignPage.tsx -- add logo/favicon upload**: Add file upload sections with validation (max 2MB, image/* only, hex color validation for existing fields). Upload to `larp-assets/{larpId}/logo.png` and `favicon.png`. Store public URL in `larp_design_settings`.

5. **LarpDesignPage.tsx -- add H1-H5 typography section**: For each heading level, add controls for fontSize (text input, e.g. "2rem"), fontWeight (select: 400-900), letterSpacing (text), lineHeight (text), marginBottom (text). Store as JSON-compatible columns in DB.

6. **LarpDesignPage.tsx -- improve preview panel**: Add light/dark toggle switch in preview. Render live H1-H5 headings with applied typography tokens. Show primary + secondary buttons with current colors/radius. Preview updates in real-time from form state.

7. **LarpThemeProvider.tsx -- extend**: Apply H1-H5 typography via injected `<style>` tag. Apply favicon via `document.querySelector('link[rel="icon"]')` override. Apply logo URL via CSS custom property `--larp-logo-url`.

8. **AdminLayout.tsx -- conditional nav**: Hide "Vzhled portálu" nav item when `currentLarp.visual_mode === 'vizual_fix'`.

9. **useLarpContext.tsx -- extend**: Fetch `visual_mode` from larps table alongside existing fields so it's available app-wide.

10. **LARPs admin (AdminDashboard or LarpsPage)**: Add `visual_mode` selector when creating/editing a LARP (radio: Pevný vzhled / Konfigurovatelný vzhled).

## Files to Create/Modify

### Create
- `supabase/migrations/XXXX_visual_mode_and_typography.sql` -- migration

### Modify
- `src/pages/admin/LarpDesignPage.tsx` -- major: gate, logo/favicon upload, typography, improved preview
- `src/components/LarpThemeProvider.tsx` -- extend with typography + favicon
- `src/hooks/useLarpContext.tsx` -- add `visual_mode` to `LarpOption`
- `src/components/layout/AdminLayout.tsx` -- conditional nav item
- `src/pages/admin/AdminDashboard.tsx` -- visual_mode selector in LARP settings (or wherever LARP edit form lives)

## Input Validation / Guardrails
- Hex color regex: `/^#[0-9a-fA-F]{6}$/` before HSL conversion
- File upload: max 2MB, accept `image/png,image/jpeg,image/svg+xml,image/x-icon`
- Typography values: sanitize to allowed patterns (e.g. `\d+(\.\d+)?(rem|px|em|%)`)
- Custom CSS: already exists, no change needed

## Test Checklist
1. LARP with `vizual_fix` -- design page shows info message, nav item hidden
2. LARP with `vizual_variabil` -- full editor visible, save/load works
3. Logo/favicon upload stores file and URL persists across page reload
4. Typography H1-H5 changes reflect in preview panel immediately
5. Light/dark toggle in preview shows correct color scheme
6. Portal pages (player, CP, production, schedule) apply saved design tokens
7. Existing LARPs default to `vizual_fix` (no breaking change)

## Data Migration Notes
- All existing LARPs get `visual_mode = 'vizual_fix'` by default (ALTER TABLE DEFAULT)
- Existing `larp_design_settings` rows remain valid; new columns are nullable
- No data loss or breaking changes to existing API contracts

