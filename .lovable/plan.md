

# Plan: Feedback System for LARP Portal

## Overview

This plan adds a feedback collection system with two main components:
1. **Admin section "Portal"** - A new page under "Sprava" in the sidebar to view and manage feedback notes
2. **Global feedback button** - A sticky button in the bottom-right corner of every page that opens a small modal to submit feedback

## Architecture

### 1. Database Changes

Create a new `portal_feedback` table to store feedback notes:

```text
portal_feedback
├── id (uuid, primary key)
├── larp_id (uuid, nullable, references larps.id)
├── user_id (uuid, nullable, references auth.users)
├── source_page (text) - e.g., "harmonogram", "dokumenty", "portal-view"
├── content (text, required) - the feedback message
├── status (text) - "new", "read", "resolved"
├── created_at (timestamp)
└── resolved_at (timestamp, nullable)
```

**RLS Policies:**
- Owners can view feedback for their LARPs
- Anyone can INSERT feedback (for portal users without auth)
- Owners can UPDATE/DELETE their LARP's feedback

### 2. New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/admin/PortalFeedbackPage.tsx` | Admin page listing all feedback with filters |
| `src/components/FeedbackButton.tsx` | Global sticky button + modal component |

### 3. File Modifications

| File | Changes |
|------|---------|
| `src/components/layout/AdminLayout.tsx` | Add "Portal" link under "Sprava" section |
| `src/App.tsx` | Add route `/admin/portal` and wrap all routes with FeedbackButton |

---

## Implementation Details

### Phase 1: Database Setup

Create `portal_feedback` table with columns:
- `id` - UUID primary key
- `larp_id` - Optional FK to larps (null for general feedback)
- `user_id` - Optional FK to auth.users (null for anonymous portal users)
- `source_page` - String identifying the page (e.g., "harmonogram", "cp", "portal-view")
- `content` - The feedback text (max 2000 chars)
- `status` - Enum: 'new' | 'read' | 'resolved'
- `created_at`, `resolved_at` - Timestamps

RLS policies will allow:
- Authenticated users to insert feedback linked to their LARP
- Portal users (unauthenticated) to insert feedback without larp_id
- LARP owners to view/manage feedback for their LARPs

### Phase 2: FeedbackButton Component

A global component that:
- Renders a small floating button (bottom-right, `fixed`, `z-50`)
- Shows only a simple icon/text ("Zpetna vazba")
- On click, opens a compact Dialog/Popover with:
  - Textarea for feedback (max 2000 chars)
  - Submit button
  - Auto-detects current page from `useLocation().pathname`
- Formats submitted feedback as: `site: {page} - note: {content}`
- Uses toast to confirm submission
- Works on all pages (admin, portal, landing)

### Phase 3: Admin Feedback Page

New page at `/admin/portal` showing:
- List of all feedback for current LARP
- Columns: Date, Source Page, Content preview, Status
- Filter by status (new/read/resolved)
- Click to expand full content
- Mark as read/resolved actions
- Delete action

### Phase 4: Navigation Update

Add to AdminLayout under "Sprava" section:
```typescript
const larpManagement = [
  { name: "LARPy", href: "/admin/larpy", icon: Gamepad2 },
  { name: "Portal", href: "/admin/portal", icon: MessageSquare },
];
```

### Phase 5: Global Integration

In `App.tsx`, wrap the content with FeedbackButton so it appears on every page:
- The button will be inside the BrowserRouter but outside Routes
- Uses `useLocation()` to detect current page
- Uses `useLarpContext()` for LARP context in admin pages
- Uses `usePortalSession()` for portal context

---

## Technical Notes

### Page Detection Logic

The FeedbackButton will extract page name from pathname:
- `/admin/harmonogram` -> "harmonogram"
- `/admin/dokumenty` -> "dokumenty"
- `/portal/:token/view` -> "portal-view"
- `/` -> "landing"

### RLS for Mixed Authentication

Since portal users are not authenticated via Supabase Auth, the INSERT policy will use `true` (public insert) but with validation:
- Content length limit enforced
- Rate limiting via database trigger (optional future enhancement)

### Visual Design

The button will follow the existing design system:
- Uses `Button` component with `variant="outline"`
- Small size, icon + short text
- Modal uses existing `Dialog` components
- Matches "paper-card" aesthetic used elsewhere

