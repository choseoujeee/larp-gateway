

# Plan: URL restructuring + per-LARP design customization

## Part 1: URL Restructuring

### Current structure
```text
/admin/*                        (admin, larp from context/localStorage)
/hrac/:slug                     (player portal login)
/hrac/:slug/view                (player portal view)
/cp/:larpSlug                   (CP portal)
/cp/:larpSlug/:slug             (CP detail)
/produkce-portal/:token         (production portal)
/harmonogram-portal/:token      (schedule portal)
```

### New structure
```text
/admin/*                        (unchanged - larp from context)
/:larpSlug/hrac/:personSlug     (player portal login)
/:larpSlug/hrac/:personSlug/view (player portal view)
/:larpSlug/cp                   (CP portal)
/:larpSlug/cp/:personSlug       (CP detail)
/:larpSlug/produkce/:token      (production portal)
/:larpSlug/harmonogram/:token   (schedule portal)
```

### Changes required

1. **App.tsx** -- Update all portal routes to new `/:larpSlug/...` pattern. Add redirects from old URLs (`/hrac/:slug` -> lookup larp slug and redirect, `/cp/:larpSlug` -> `/:larpSlug/cp`, etc.)

2. **Database RPC `verify_person_by_slug`** -- Add `p_larp_slug` parameter to disambiguate persons across LARPs. Join on `larps.slug = p_larp_slug`.

3. **Database RPC `get_portal_session_without_password`** -- Same: add `p_larp_slug` parameter.

4. **Database RPC `get_portal_session_as_organizer`** -- Same: add `p_larp_slug` parameter.

5. **`usePortalSession.tsx`** -- Update all RPC calls to pass `larpSlug`. Update `verifyAccess`, `enterAsOrganizer`, `enterWithoutPassword` signatures.

6. **`PortalAccessPage.tsx`** -- Read `larpSlug` from params, pass to session hooks. Update all `navigate()` calls to `/${larpSlug}/hrac/${slug}/view`.

7. **`PortalViewPage.tsx`** -- Read `larpSlug` from params, update all navigation URLs.

8. **`CpPortalPage.tsx`** -- Update from `/cp/:larpSlug` to `/:larpSlug/cp`, update internal links to `/:larpSlug/cp/:slug` and `/:larpSlug/hrac/:slug`.

9. **Admin link generation** (6 locations):
   - `RunsPage.tsx` line 590: `/portal/${token}` -> `/${larpSlug}/hrac/${personSlug}`
   - `CpDetailPage.tsx` lines 531, 541: update CP and person portal URLs
   - `CpPage.tsx` line 365: update CP portal URL
   - `ProductionPage.tsx` line 369: update production portal URL
   - `SchedulePage.tsx` line 1162: update schedule portal URL
   - `PersonsPage.tsx` line 723: update person portal URL

10. **Backward compatibility redirects** in App.tsx for old `/hrac/:slug`, `/cp/:larpSlug`, `/produkce-portal/:token`, `/harmonogram-portal/:token` URLs.

---

## Part 2: Per-LARP Design Customization

### Database

New table `larp_design_settings` with columns:
- `id` (uuid, PK)
- `larp_id` (uuid, unique, references larps)
- `primary_color` (text) -- HSL value
- `primary_foreground` (text)
- `secondary_color` (text)
- `accent_color` (text)
- `background_color` (text)
- `foreground_color` (text)
- `card_color` (text)
- `border_color` (text)
- `font_heading` (text) -- Google Font name
- `font_body` (text)
- `button_radius` (text) -- e.g. "0.25rem"
- `sidebar_background` (text)
- `sidebar_foreground` (text)
- `custom_css` (text, nullable) -- advanced override
- RLS: same `can_access_larp(larp_id)` pattern

### Admin UI

New page/section in LARP settings (accessible from AdminDashboard or sidebar under "Správa"):
- Color pickers for each design token (primary, secondary, accent, background, foreground, card, border, sidebar colors)
- Font selectors (dropdown with popular Google Fonts)
- Border radius slider
- Live preview panel showing how portal will look
- "Reset to defaults" button

### Runtime application

- `useLarpContext` fetches `larp_design_settings` alongside larp data
- A `LarpThemeProvider` component applies CSS custom properties (`--primary`, `--background`, etc.) as inline styles on a wrapper div
- Portal pages wrap content in `LarpThemeProvider` which overrides the global CSS variables
- Admin pages use the global theme (not per-larp customization)
- Google Fonts loaded dynamically via `<link>` tag injection

### Files to create/modify
- Migration: `larp_design_settings` table + RLS
- `src/pages/admin/LarpDesignPage.tsx` -- design settings editor
- `src/components/LarpThemeProvider.tsx` -- applies CSS vars from DB
- `src/hooks/useLarpContext.tsx` -- fetch design settings
- `AdminLayout.tsx` -- add nav item for design settings
- Portal pages -- wrap in `LarpThemeProvider`

---

## Implementation order

1. Database migration (new RPC functions + design table)
2. URL restructuring (routes, hooks, pages, links)
3. Design settings admin UI
4. LarpThemeProvider + portal integration

