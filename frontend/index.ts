/**
 * types/index.ts
 *
 * Shared domain types for the Lingora frontend.
 * Mirrors the API response shapes. Expand as features are built.
 */

// ---------------------------------------------------------------------------
// User / Learner
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  exampleSentence: string;
  audioUrl?: string;
  imageUrl?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export type QuizQuestionType = "multiple-choice" | "fill-in-the-blank" | "speaking";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];         // for multiple-choice
  correctAnswer: string;
  hint?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
