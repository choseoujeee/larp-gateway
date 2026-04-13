

# Plan: Fix and polish the Schedule (Harmonogram)

## Identified Issues

1. **Console error**: `GridSlotDroppable` is a function component receiving refs from dnd-kit but lacks `forwardRef` -- causes React warnings and potentially broken drag-drop behavior
2. **ScheduleEventBox** also lacks `forwardRef` -- same issue with `useDraggable` passing refs
3. **2000-line monolithic file** -- extremely hard to maintain, slow to render due to everything re-rendering together
4. **Grid DnD conflicts with click-to-expand** -- dragging and clicking share the same handler, causing accidental drags or missed clicks
5. **Expanded event boxes use `height: auto`** which can overflow and overlap other events without proper z-index management
6. **No visual feedback** during drag (ghost/overlay missing)
7. **Portal page duplicates** all grid logic (~200 lines of identical code) instead of sharing components

## Plan

### Step 1: Extract shared schedule components
Create `src/components/schedule/` directory with:
- `ScheduleGrid.tsx` -- shared grid rendering (time labels, grid lines, event positioning) used by both admin and portal
- `ScheduleEventBox.tsx` -- event box component with forwardRef, used by admin (with edit/delete actions) and portal (read-only)
- `GridSlotDroppable.tsx` -- fix forwardRef issue, extract from SchedulePage
- `scheduleConstants.ts` -- shared constants (PX_PER_MINUTE, SLOT_HEIGHT_PX, EVENT_TYPE_LABELS, colors)
- `scheduleTypes.ts` -- shared TypeScript interfaces

### Step 2: Fix DnD issues
- Add `forwardRef` to `GridSlotDroppable` and `ScheduleEventBox`
- Add `DragOverlay` from dnd-kit for visual drag feedback (ghost preview)
- Increase PointerSensor activation distance to 12px to prevent accidental drags when clicking to expand
- Add proper z-index layering: base events z-1, expanded z-20, dragging z-30, overlay z-40

### Step 3: Improve grid UX
- Add smooth CSS transitions for expand/collapse
- Make expanded boxes render in a portal/overlay so they don't push other elements
- Add "current time" indicator with a pulsing dot on the red line
- Better color contrast for event type differentiation
- Add subtle hover effects (scale + shadow) before click

### Step 4: Refactor SchedulePage.tsx
- Extract dialog forms into `ScheduleEventDialog.tsx`
- Extract portal access section into `SchedulePortalSection.tsx`
- Keep main page as orchestrator (~500 lines instead of 2000)

### Step 5: Update tests
- Add tests for the new shared components
- Test `assignLanes` edge cases (already covered in scheduleGridUtils.test.ts)
- Test event box expand/collapse behavior
- Test forwardRef works without console warnings

### Step 6: Sync portal page
- Update `SchedulePortalPage.tsx` to use shared `ScheduleGrid` and `ScheduleEventBox` components
- Remove ~200 lines of duplicated code

## Technical Details

**forwardRef fix** (critical bug):
```tsx
const GridSlotDroppable = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  // merge refs
});
```

**DragOverlay** for visual feedback:
```tsx
<DndContext>
  {/* ... */}
  <DragOverlay>
    {activeEvent && <ScheduleEventBoxPreview event={activeEvent} />}
  </DragOverlay>
</DndContext>
```

**File changes summary**:
- Create: `src/components/schedule/ScheduleGrid.tsx`, `ScheduleEventBox.tsx`, `GridSlotDroppable.tsx`, `scheduleConstants.ts`, `scheduleTypes.ts`, `ScheduleEventDialog.tsx`, `SchedulePortalSection.tsx`
- Modify: `src/pages/admin/SchedulePage.tsx` (major refactor, ~500 lines)
- Modify: `src/pages/portal/SchedulePortalPage.tsx` (use shared components, ~300 lines)
- Update: `src/pages/admin/SchedulePage.test.tsx` (adapt to new structure)
- Create: `src/components/schedule/ScheduleEventBox.test.tsx`

