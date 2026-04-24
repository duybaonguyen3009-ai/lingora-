/**
 * lib/audio-waveform.ts — PR7.3
 *
 * Decode a recorded audio Blob with Web Audio API and return a normalised
 * peaks array suitable for the voice-note bubble waveform. All work happens
 * client-side; peaks travel with the message payload so the server never
 * re-decodes.
 *
 * Contract:
 *   - `extractWaveform(blob)` → Promise<number[]> — 100 buckets, values [0,1]
 *   - Decode failure (codec unsupported, corrupt blob, AudioContext absent)
 *     → uniform fallback array, never throws.
 *   - `validatePeaks(peaks)` → sanitised array ready for the API body
 *     (strips NaN/Infinity, clamps [0,1], caps at 512 — backend's max).
 *
 * AudioContext lifecycle: the context is closed in a finally block so
 * iOS Safari doesn't leak it (Safari caps concurrent AudioContext at 6).
 */

const BUCKET_COUNT = 100;
const PEAKS_MAX_LEN = 512;

type WebkitWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

function generateFallback(): number[] {
  // Flat mid-level bars. Matches the pre-PR7.3 placeholder pattern so a
  // decode failure looks visually identical to the old behaviour.
  return new Array(BUCKET_COUNT).fill(0.5);
}

export async function extractWaveform(audioBlob: Blob): Promise<number[]> {
  if (typeof window === "undefined") return generateFallback();
  const AudioContextCtor =
    window.AudioContext || (window as WebkitWindow).webkitAudioContext;
  if (!AudioContextCtor) return generateFallback();

  let ctx: AudioContext | null = null;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    ctx = new AudioContextCtor();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const rawData = audioBuffer.getChannelData(0);

    const bucketSize = Math.max(1, Math.floor(rawData.length / BUCKET_COUNT));
    const peaks: number[] = new Array(BUCKET_COUNT);

    for (let i = 0; i < BUCKET_COUNT; i++) {
      let sum = 0;
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, rawData.length);
      for (let j = start; j < end; j++) {
        const v = rawData[j];
        sum += v < 0 ? -v : v;
      }
      const len = end - start;
      peaks[i] = len > 0 ? sum / len : 0;
    }

    // Normalise to the loudest bucket so quiet recordings still show shape.
    let max = 0;
    for (let i = 0; i < peaks.length; i++) if (peaks[i] > max) max = peaks[i];
    if (max === 0) return peaks.map(() => 0);
    return peaks.map((p) => Math.min(1, p / max));
  } catch {
    return generateFallback();
  } finally {
    if (ctx && ctx.state !== "closed") {
      ctx.close().catch(() => {});
    }
  }
}

export function validatePeaks(peaks: number[] | null | undefined): number[] {
  if (!Array.isArray(peaks)) return [];
  return peaks
    .filter((p) => Number.isFinite(p))
    .map((p) => {
      if (p < 0) return 0;
      if (p > 1) return 1;
      return p;
    })
    .slice(0, PEAKS_MAX_LEN);
}

/** Uniform fallback used by the render side when peaks are null. */
export function fallbackPeaks(count: number = BUCKET_COUNT): number[] {
  return new Array(count).fill(0.5);
}
