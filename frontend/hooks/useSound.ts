"use client";

import { useCallback, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   useSound — Lingona Sound System
   ══════════════════════════════════════════════════════════════════════
   Pre-loads and plays sound effects. Sounds are cached after first play.

   Usage:
     const { play } = useSound();
     play("correct");     // correct answer
     play("wrong");       // wrong answer
     play("click");       // button tap
     play("levelup");     // level up celebration
     play("ai");          // AI response
   ══════════════════════════════════════════════════════════════════════ */

export type SoundName = "correct" | "wrong" | "click" | "levelup" | "ai";

const SOUND_PATHS: Record<SoundName, string> = {
  correct: "/sounds/correct.mp3",
  wrong:   "/sounds/wrong.mp3",
  click:   "/sounds/click.mp3",
  levelup: "/sounds/levelup.mp3",
  ai:      "/sounds/ai.mp3",
};

// Shared audio cache — survives re-renders and across components
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(name: SoundName): HTMLAudioElement {
  const path = SOUND_PATHS[name];
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.preload = "auto";
    audioCache.set(path, audio);
  }
  return audio;
}

export function useSound() {
  // Track if user has interacted (browsers block autoplay before interaction)
  const hasInteracted = useRef(false);

  const play = useCallback((name: SoundName, volume = 0.5) => {
    if (typeof window === "undefined") return;

    // Mark interaction on first play attempt
    hasInteracted.current = true;

    try {
      const audio = getAudio(name);
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Silently fail — browser may block if no user gesture yet
      });
    } catch {
      // Audio not supported or file missing — fail silently
    }
  }, []);

  return { play };
}

export default useSound;
