/**
 * useTapToDrop / useTouchDevice — touch-friendly drag-drop fallback.
 *
 * HTML5 drag-and-drop is broken on iOS Safari (no pointerdown→drag
 * sequence on touch devices without a polyfill). We sidestep the
 * polyfill and offer a tap-source-then-tap-destination interaction
 * instead:
 *
 *   - On touch devices: tap a draggable item to "select" it (visual
 *     ring), then tap a drop zone to commit. Tapping the selected
 *     item again deselects.
 *   - On non-touch devices: native HTML5 drag-drop is preserved.
 *
 * Components opt in by branching on `isTouch` and using `selectItem` /
 * `dropOnZone` for the tap path while keeping their existing dragstart /
 * dragover / drop wiring for desktop.
 */

import { useEffect, useState } from "react";

export function useTouchDevice(): boolean {
  // Server / first-render returns false so the SSR markup matches the
  // desktop default; hydration upgrades on client mount.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const touchy =
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
      window.matchMedia("(pointer: coarse)").matches;
    setIsTouch(touchy);
  }, []);
  return isTouch;
}

export interface TapToDrop<T> {
  isTouch: boolean;
  selected: T | null;
  /** Toggle the given id as selected (re-tapping the same id clears). */
  selectItem: (id: T) => void;
  clearSelection: () => void;
  /**
   * Commit the currently selected item to a zone via the caller's
   * placement function. No-op when nothing is selected.
   */
  dropOnZone: (place: (id: T) => void) => void;
}

export function useTapToDrop<T = string>(): TapToDrop<T> {
  const isTouch = useTouchDevice();
  const [selected, setSelected] = useState<T | null>(null);

  return {
    isTouch,
    selected,
    selectItem: (id: T) =>
      setSelected((cur) => (cur === id ? null : id)),
    clearSelection: () => setSelected(null),
    dropOnZone: (place: (id: T) => void) => {
      setSelected((cur) => {
        if (cur != null) place(cur);
        return null;
      });
    },
  };
}
