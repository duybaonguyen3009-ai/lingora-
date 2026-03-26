/**
 * parseMultiBlank.ts
 *
 * Shared utility for splitting combined grammar answer strings into
 * individual per-blank parts. Used by GrammarLesson and GrammarExam
 * to render multi-blank questions with independent drag targets.
 *
 * Supports separators: "/" and "..." (with flexible whitespace).
 * Examples:
 *   "is doing / does"         → ["is doing", "does"]
 *   "have ... eaten"          → ["have", "eaten"]
 *   "were studying / were watching TV / had ... gone"
 *                             → ["were studying", "were watching TV", "had", "gone"]
 */

const SEP_SLASH = /\s*\/\s*/;
const SEP_DOTS = /\s*\.{2,}\s*/;

/**
 * Split a combined answer string into individual parts.
 * Returns the original string in a single-element array if no separators found.
 */
export function splitAnswerParts(answer: string): string[] {
  const parts = answer
    .split(SEP_SLASH)
    .flatMap((p) => (SEP_DOTS.test(p) ? p.split(SEP_DOTS) : [p]))
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [answer];
}

/**
 * For a multi-blank question, extract all unique individual tokens
 * from all options, suitable for independent drag targets.
 *
 * @param options - The 4 combined option strings
 * @param blankCount - Number of blanks in the sentence
 * @returns Array of unique token strings (deduplicated)
 */
export function extractDragTokens(options: string[], blankCount: number): string[] {
  if (blankCount <= 1) return options; // single-blank: options are already individual

  const tokenSet = new Set<string>();
  for (const opt of options) {
    const parts = splitAnswerParts(opt);
    for (const part of parts) {
      tokenSet.add(part);
    }
  }
  return Array.from(tokenSet);
}

/**
 * Get the correct answer parts for a multi-blank question.
 */
export function getCorrectParts(options: string[], correctIndex: number, blankCount: number): string[] {
  const correct = options[correctIndex];
  if (blankCount <= 1) return [correct];
  return splitAnswerParts(correct);
}

/**
 * Check if user's per-blank answers match the correct answer.
 */
export function validateMultiBlankAnswer(
  userAnswers: (string | null)[],
  correctParts: string[]
): boolean {
  if (userAnswers.length !== correctParts.length) return false;
  return userAnswers.every((ans, i) => {
    if (!ans) return false;
    return ans.toLowerCase().trim() === correctParts[i].toLowerCase().trim();
  });
}
