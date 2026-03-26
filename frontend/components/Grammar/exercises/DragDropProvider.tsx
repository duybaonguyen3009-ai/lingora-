/**
 * DragDropProvider.tsx
 *
 * Shared DnD context wrapper for grammar exercises.
 * Provides sensors (pointer + touch + keyboard), collision detection,
 * and a DragOverlay for smooth visual feedback during drag.
 *
 * Reusable across all grammar exercise types.
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DragDropProviderProps {
  children: React.ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  /** Render function for the drag overlay content. Receives the active item's id. */
  renderOverlay?: (activeId: UniqueIdentifier) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DragDropProvider({
  children,
  onDragEnd,
  renderOverlay,
}: DragDropProviderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Sensors: pointer (mouse) + touch + keyboard accessibility
  // activationConstraint prevents accidental drags on tap
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 100, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      onDragEnd(event);
    },
    [onDragEnd]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeId && renderOverlay ? renderOverlay(activeId) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Re-export for convenience
export { type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
