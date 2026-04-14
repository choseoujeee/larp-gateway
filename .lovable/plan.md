

# Plan: Redesign Schedule Grid -- Sexy, Clean, Overlap-Aware

## Problems Identified

1. **Text overflow/overlap**: Event descriptions contain full HTML (from WYSIWYG editor) -- rendered as raw HTML text in compact boxes, causing massive visual overflow
2. **Expanded boxes overlap everything**: When expanded, `height: auto` makes boxes hundreds of pixels tall, covering other events
3. **Lane algorithm works but visual result is messy**: Events with long content bleed out of their pixel height
4. **No visual distinction by event type**: All boxes look similar, need distinct pastel colors per type
5. **Raw HTML in descriptions**: Description field contains `<p><span style="...">` etc. -- needs to be rendered as HTML or stripped for compact view
6. **Buttons and UI not polished**: Need rounded, smooth, pastel styling

## Design Vision

Think of it like a Google Calendar / Excel grid (Y=time, top-to-bottom), with:
- Clean pastel color-coded blocks per event type
- Overlapping events side-by-side in lanes (already working via `assignLanes`)
- Compact view: just name + type icon, text strictly clipped to box height
- Click to expand: show details in a **floating popover/tooltip** instead of stretching the box itself
- Smooth rounded corners, subtle shadows, no raw HTML

## Changes

### 1. `scheduleUtils.ts` -- New pastel color palette
Replace current `eventBoxStyle` with distinct, smooth pastel colors:
- **CP vstup**: warm coral/salmon pastel (`bg-rose-100 border-rose-300`)
- **Materiál**: lavender (`bg-violet-50 border-violet-200`)
- **Organizační**: soft blue (`bg-sky-50 border-sky-200`)
- **Jídlo**: mint green (`bg-emerald-50 border-emerald-200`)
- **Přesun**: warm gray (`bg-stone-100 border-stone-200`)
- **Informace**: soft amber (`bg-amber-50 border-amber-200`)
- **Programový blok**: soft indigo (`bg-indigo-50 border-indigo-200`)
- All with `rounded-xl` for smooth look
- Dark mode variants using `/20` opacity backgrounds

### 2. `ScheduleEventBox.tsx` -- Complete rewrite
**Compact view** (default):
- Strictly clipped to calculated `heightPx` -- no overflow, `overflow-hidden`
- Show: icon + title (truncated), optional 1-line subtitle
- No raw HTML -- strip HTML tags for compact display with a `stripHtml()` utility
- Smooth `rounded-xl`, subtle `shadow-sm`, pastel background

**Expanded view** -- Replace in-place expansion with a **floating popover**:
- On click, show a positioned popover/card floating above the grid (using absolute positioning or Radix Popover)
- Popover renders description as **sanitized HTML** (using `dangerouslySetInnerHTML` with the existing sanitize utility)
- Shows all details: type, CP name, scene, location, performer, description
- Action buttons (Upravit, Scéna, Odebrat) with `rounded-full` pill-style buttons
- Click outside or X to close
- This prevents the box from growing and overlapping other events

### 3. `ScheduleGrid.tsx` -- Minor polish
- Add `overflow-hidden` to the events container to prevent any bleed
- Ensure grid lines are crisp and subtle

### 4. `ReadOnlyScheduleEventBox` -- Same treatment
- Compact: clipped, no HTML, icon + title
- Click: floating popover with rendered HTML description
- Same pastel colors

### 5. HTML stripping utility
- Add `stripHtml(html: string): string` function to `scheduleUtils.ts`
- Used in compact view to show plain text preview of description

### 6. Portal page sync
- `SchedulePortalPage.tsx` already uses shared components, so changes propagate automatically

## Files to modify
- `src/components/schedule/scheduleUtils.ts` -- new colors, `stripHtml` utility
- `src/components/schedule/ScheduleEventBox.tsx` -- rewrite both admin and readonly boxes
- `src/components/schedule/ScheduleGrid.tsx` -- minor overflow fix
- `src/components/schedule/scheduleConstants.ts` -- update `SCHEDULE_BOX_MIN_PX` if needed

## No database changes needed

