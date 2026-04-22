"use client";

/**
 * MatchingFeaturesQuestion — drag-drop. Items are draggable; features are
 * lettered drop zones (A, B, C ...). One item per feature by default; if
 * payload.allow_reuse === true, multiple items can land in the same feature.
 *
 * Click an item chip in a feature bucket to send it back to the unplaced
 * tray.
 *
 * Answer format: JSON.stringify({ [item_id]: feature_letter, ... }).
 */

import { DragEvent, useMemo } from "react";
import { useTapToDrop } from "@/lib/useTapToDrop";

interface Item { id: string; text: string }
interface Feature { letter: string; text: string }

interface Payload {
  features: Feature[];
  items: Item[];
  allow_reuse?: boolean;
  // correct_mapping not used by the UI
}

interface Props {
  options: unknown;
  answer: string;
  onAnswer: (a: string) => void;
}

function parseMapping(answer: string): Record<string, string> {
  try {
    const v = JSON.parse(answer);
    return v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export default function MatchingFeaturesQuestion({ options, answer, onAnswer }: Props) {
  const payload = options as Payload | null;
  const items = payload?.items ?? [];
  const features = payload?.features ?? [];
  const allowReuse = !!payload?.allow_reuse;
  const mapping = useMemo(() => parseMapping(answer), [answer]);
  const { isTouch, selected, selectItem, dropOnZone } = useTapToDrop<string>();

  if (!items.length || !features.length) return null;

  const placedIn = (letter: string) => items.filter((i) => mapping[i.id] === letter);
  const unplaced = items.filter((i) => !mapping[i.id]);

  const place = (id: string, letter: string | null) => {
    const next = { ...mapping };
    if (!letter) {
      delete next[id];
    } else {
      // If reuse is disallowed and this letter already has an item, swap them
      // to the tray so we never produce a 1:many mapping silently.
      if (!allowReuse) {
        const occupant = Object.entries(next).find(([k, v]) => v === letter && k !== id);
        if (occupant) delete next[occupant[0]];
      }
      next[id] = letter;
    }
    onAnswer(JSON.stringify(next));
  };

  const onDragStart = (ev: DragEvent<HTMLDivElement>, id: string) => {
    ev.dataTransfer.setData("text/plain", id);
    ev.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  };
  const onDropToFeature = (ev: DragEvent<HTMLDivElement>, letter: string) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    if (id) place(id, letter);
  };
  const onDropToTray = (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    if (id) place(id, null);
  };

  const ItemChip = ({ it, onClickRemove }: { it: Item; onClickRemove?: () => void }) => {
    const isSel = selected === it.id;
    return (
      <div
        draggable={!isTouch}
        onDragStart={!isTouch ? (e) => onDragStart(e, it.id) : undefined}
        onClick={isTouch ? () => selectItem(it.id) : onClickRemove}
        role={isTouch || onClickRemove ? "button" : undefined}
        aria-pressed={isTouch ? isSel : undefined}
        className={`rounded-lg px-3 py-2 text-sm select-none ${
          isTouch ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{
          background: "var(--color-bg-card)",
          border: `1px solid ${isSel ? "#00A896" : "var(--color-border)"}`,
          boxShadow: isSel ? "0 0 0 2px rgba(0,168,150,0.35)" : "none",
          color: "var(--color-text)",
        }}
      >
        {it.text}
      </div>
    );
  };

  const isDropTarget = isTouch && selected != null;

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={!isTouch ? onDragOver : undefined}
        onDrop={!isTouch ? onDropToTray : undefined}
        onClick={isDropTarget ? () => dropOnZone((id) => place(id, null)) : undefined}
        className={`rounded-lg p-3 min-h-[3rem] ${isDropTarget ? "cursor-pointer" : ""}`}
        style={{
          background: "var(--color-bg-secondary)",
          border: `1px dashed ${isDropTarget ? "#00A896" : "var(--color-border)"}`,
        }}
      >
        <div className="text-xs font-semibold mb-2 uppercase" style={{ color: "var(--color-text-tertiary)" }}>
          Items {allowReuse && "(có thể dùng feature nhiều lần)"} {isTouch && "— chạm để chọn"}
        </div>
        {unplaced.length === 0 ? (
          <div className="text-xs italic" style={{ color: "var(--color-text-tertiary)" }}>Đã sắp xếp hết.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {unplaced.map((it) => <ItemChip key={it.id} it={it} />)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {features.map((f) => {
          const inBucket = placedIn(f.letter);
          return (
            <div
              key={f.letter}
              onDragOver={!isTouch ? onDragOver : undefined}
              onDrop={!isTouch ? (e) => onDropToFeature(e, f.letter) : undefined}
              onClick={isDropTarget ? () => dropOnZone((id) => place(id, f.letter)) : undefined}
              className={`rounded-lg p-2 ${isDropTarget ? "cursor-pointer" : ""}`}
              style={{
                background: "var(--color-bg-secondary)",
                border: `1px dashed ${
                  isDropTarget ? "#00A896" : inBucket.length ? "rgba(0,168,150,0.4)" : "var(--color-border)"
                }`,
              }}
            >
              <div className="flex items-start gap-2 mb-1.5">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold shrink-0"
                  style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}
                >
                  {f.letter}
                </div>
                <span className="text-sm" style={{ color: "var(--color-text)" }}>{f.text}</span>
              </div>
              {inBucket.length > 0 && (
                <div className="ml-9 flex flex-col gap-1.5">
                  {inBucket.map((it) => (
                    <ItemChip key={it.id} it={it} onClickRemove={() => place(it.id, null)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
