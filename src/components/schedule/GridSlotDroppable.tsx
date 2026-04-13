import { forwardRef, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";

interface GridSlotDroppableProps {
  dayNum: number;
  slotIndex: number;
  heightPx: number;
}

const GridSlotDroppable = forwardRef<HTMLDivElement, GridSlotDroppableProps>(
  ({ dayNum, slotIndex, heightPx }, _ref) => {
    const id = `grid-slot-${dayNum}-${slotIndex}`;
    const { setNodeRef, isOver } = useDroppable({ id, data: { dayNum, slotIndex } });

    // Merge forwarded ref with dnd-kit ref
    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        setNodeRef(node);
        if (typeof _ref === "function") _ref(node);
        else if (_ref) (_ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [setNodeRef, _ref]
    );

    return (
      <div
        ref={mergedRef}
        style={{ height: heightPx, minHeight: heightPx }}
        className={`border-b border-border/50 transition-colors ${isOver ? "bg-primary/20" : ""}`}
      />
    );
  }
);

GridSlotDroppable.displayName = "GridSlotDroppable";

export default GridSlotDroppable;
