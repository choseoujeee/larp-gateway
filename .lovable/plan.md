

# Comprehensive Project Review & Polish Plan

## Overview
Full audit of the LARP Portal application covering functionality bugs, design inconsistencies, UX friction points, and code quality issues. The goal is to elevate the project to a professional, polished level.

## Issues Found

### A. Functionality Bugs

1. **ErrorBoundary hardcoded redirect**: The fallback button always navigates to `/admin/cp` regardless of where the error occurred. Should navigate to `/admin` or offer a generic "reload page" action.

2. **LandingPage empty section**: Lines 110-155 of `LandingPage.tsx` contain a completely empty "How it works" section -- just whitespace. Either remove it or fill it with content.

3. **LoginPage redirect during render**: `if (user) { navigate("/admin"); return null; }` is called during render, not inside a `useEffect`. This causes React warnings and potential infinite loops.

4. **PersonsPage monolith (1333 lines)**: Single file contains list view, detail view, medailonek editor, assignment dialog, document management, and more. Difficult to maintain and debug.

5. **RunsPage monolith (1679 lines)**: Same problem, even larger.

6. **SchedulePage monolith (1029 lines)**: Significant but already partially decomposed.

7. **Missing loading states on navigation**: When clicking a LARP card in AdminDashboard, there is no immediate visual feedback that navigation is happening.

### B. Design & Visual Issues

8. **Inconsistent border-radius**: The WWII theme uses `rounded-sm` (0.25rem) but many components use default Tailwind rounding or `rounded-lg` / `rounded-xl` (schedule boxes). Needs harmonization.

9. **LandingPage feels sparse**: Only 5 feature cards and a footer. No social proof, no screenshots, no "How it works" section, no CTA to view a demo portal.

10. **Portal login page lacks branding**: PortalAccessPage uses generic styling. Should feel immersive -- the player is entering a game world, not a SaaS login.

11. **Dark mode contrast issues**: Several `text-muted-foreground` values in dark mode may have insufficient contrast ratios against dark backgrounds.

12. **Mobile sidebar**: The collapsed sidebar (w-14) pushes main content with `ml-14`, but on very narrow screens this still constrains the content area.

### C. UX Improvements

13. **No keyboard shortcuts**: Admin power users have no shortcuts for common actions (new document, save, navigate between sections).

14. **No empty state illustrations**: Empty lists show plain text ("Zatim nemáte žádný LARP"). Should have illustrations or icons to feel less bare.

15. **No breadcrumb navigation**: Deep pages (e.g., person detail) rely solely on back arrows. Breadcrumbs would improve orientation.

16. **No confirmation before leaving unsaved forms**: Editing documents, persons, or design settings has no "unsaved changes" guard.

17. **Search/filter UX**: PersonsPage and DocumentsPage have search but no debounce, and clearing the search requires clicking a small X.

18. **Portal feedback not visible to players**: The FeedbackButton exists but the feedback loop (admin seeing and responding) could be more transparent.

## Implementation Plan (Prioritized)

### Phase 1: Critical Bug Fixes (Steps 1-4)
1. Fix ErrorBoundary to use generic redirect (`window.location.reload()` or `/admin`)
2. Fix LoginPage redirect to use `useEffect` instead of render-time navigation
3. Fill or remove empty LandingPage section
4. Add loading/transition feedback on LARP selection

### Phase 2: Design Polish (Steps 5-8)
5. Harmonize border-radius across all components to match theme (`rounded-sm` for WWII, `rounded-lg` for Fantasy)
6. Improve LandingPage with "How it works" section, better hero, and demo CTA
7. Enhance PortalAccessPage with immersive game-themed login
8. Fix dark mode contrast for muted text values

### Phase 3: UX Enhancements (Steps 9-12)
9. Add empty state illustrations/icons for all list pages
10. Add breadcrumb navigation to detail pages (PersonsPage detail, GroupsPage detail, CpDetailPage)
11. Add unsaved changes guard to major edit forms (DocumentEditDialog, LarpDesignPage)
12. Add debounce to search inputs and improve clear button visibility

### Phase 4: Code Quality (Steps 13-14)
13. Extract PersonsPage into sub-components: `PersonList`, `PersonDetail`, `PersonForm`, `MedailonekDialog`
14. Extract RunsPage into sub-components: `RunList`, `RunDetail`, `RunAssignments`, `RunForm`

## Files to Create
- `src/components/admin/PersonList.tsx`
- `src/components/admin/PersonDetail.tsx`
- `src/components/admin/PersonForm.tsx`
- `src/components/admin/MedailonekDialog.tsx`
- `src/components/layout/Breadcrumbs.tsx`
- `src/components/EmptyState.tsx`
- `src/hooks/useUnsavedChangesGuard.ts`

## Files to Modify
- `src/components/ErrorBoundary.tsx` -- generic redirect
- `src/pages/auth/LoginPage.tsx` -- useEffect for redirect
- `src/pages/LandingPage.tsx` -- add content, remove empty section
- `src/pages/admin/AdminDashboard.tsx` -- loading feedback
- `src/pages/admin/PersonsPage.tsx` -- decompose, add breadcrumbs
- `src/pages/portal/PortalAccessPage.tsx` -- immersive design
- `src/index.css` -- dark mode contrast fixes
- `src/components/admin/DocumentEditDialog.tsx` -- unsaved guard
- `src/pages/admin/LarpDesignPage.tsx` -- unsaved guard

## Test Checklist
1. ErrorBoundary shows reload button, not hardcoded CP redirect
2. LoginPage does not cause React render warnings when user is logged in
3. LandingPage renders complete sections with no empty whitespace
4. Dark mode text meets WCAG AA contrast ratio (4.5:1)
5. PersonsPage detail shows breadcrumb and back navigation works
6. Empty states display illustration/icon instead of plain text
7. Unsaved changes prompt appears when navigating away from dirty forms
8. Search inputs debounce properly (no jank on fast typing)
9. Mobile sidebar does not cut off main content on 320px screens

## Database Changes
None required. All changes are frontend-only.

