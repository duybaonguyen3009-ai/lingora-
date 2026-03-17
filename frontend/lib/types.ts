export type LessonStatus = "completed" | "in-progress" | "locked" | "recommended";
export type LessonType = "vocabulary" | "grammar" | "listening" | "speaking" | "reading";

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  status: LessonStatus;
  duration: number; // minutes
  level: string;
  progress: number; // 0-100
  detail: string;
}

export interface Skill {
  name: string;
  value: number; // 0-100
  color: string;
}

export interface StatCard {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  trend: string;
  color: "cyan" | "blue" | "amber" | "purple";
  barPercent: number;
}

export interface GoalTask {
  label: string;
  done: boolean;
}

export interface HeatmapDay {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  isToday?: boolean;
}

// ---------------------------------------------------------------------------
// Gamification types
// ---------------------------------------------------------------------------

export interface Badge {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  icon_url:    string | null;
  xp_reward:   number;
  awarded_at?: string;
}

export interface XpSummary {
  totalXp:       number;
  level:         number;
  xpInLevel:     number;
  xpToNextLevel: number;
}

export interface StreakSummary {
  currentStreak:  number;
  longestStreak:  number;
  lastActivityAt: string | null;
}

export interface GamificationData {
  xp:     XpSummary;
  streak: StreakSummary;
  badges: Badge[];
}

// Speaking metrics (pronunciation trend over 30 days)
export interface MetricDay {
  date:     string;   // "YYYY-MM-DD"
  avgScore: number;   // 0-100
  attempts: number;
}

export interface SpeakingMetricsData {
  trend:         MetricDay[];
  totalAttempts: number;
  averageScore:  number;
  bestScore:     number;
  recentScore:   number | null;
}

export interface LeaderboardEntry {
  userId: string;
  name:   string;
  xp:     number;
  rank:   number;
}

export interface LeaderboardData {
  scope:   "weekly" | "all-time";
  entries: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
}

// ---------------------------------------------------------------------------
// Pronunciation types
// ---------------------------------------------------------------------------

export interface PhonemeDetail {
  phoneme:  string;
  score:    number; // 0-100
  offset:   number; // ms
  duration: number; // ms
}

export interface WordDetail {
  word:     string;
  score:    number; // 0-100
  phonemes: PhonemeDetail[];
}

// ---------------------------------------------------------------------------
// Scenario types
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  emoji: string;
  tags: string[];
  expected_turns: number;
  exam_type?: "ielts" | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// IELTS types
// ---------------------------------------------------------------------------

export type IeltsPhase =
  | "loading"
  | "part1"
  | "part2_prep"
  | "part2_speaking"
  | "part3"
  | "ending"
  | "summary"
  | "error";

export interface IeltsCueCard {
  topic: string;
  prompts: string[]; // 3–4 bullet points
}

export interface ScenarioDetail extends Scenario {
  system_prompt: string;
  opening_message: string;
}

export interface ConversationTurn {
  id: string;
  turnIndex: number;
  role: "user" | "assistant";
  content: string;
  audioStorageKey: string | null;
  scores: Record<string, number> | null;
  feedback: string | null;
  createdAt: string;
}

export interface StartSessionResult {
  sessionId: string;
  title: string;
  emoji: string;
  category: string;
  turns: ConversationTurn[];
}

export interface SubmitTurnResult {
  userTurn: ConversationTurn;
  aiTurn: ConversationTurn;
}

export interface TurnFeedback {
  turnIndex: number;
  tip: string;
}

export interface EndSessionResult {
  overallScore: number;
  fluency: number;
  vocabulary: number;
  grammar: number;
  coachFeedback: string;
  turnFeedback: TurnFeedback[];
  turnCount: number;
  wordCount: number;
  durationMs: number;
}

export interface SessionDetail {
  sessionId: string;
  scenarioId: string;
  title: string;
  emoji: string;
  category: string;
  status: string;
  overallScore: number | null;
  fluencyScore: number | null;
  vocabularyScore: number | null;
  grammarScore: number | null;
  coachFeedback: string | null;
  turnCount: number | null;
  wordCount: number | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
  turns: ConversationTurn[];
}

// ---------------------------------------------------------------------------
// AI Study Coach types
// ---------------------------------------------------------------------------

/**
 * The category of a focus recommendation — used by the frontend to pick
 * the right label colour and icon without relying on string matching.
 */
export type FocusType = 'first_lesson' | 'pronunciation' | 'scenario' | 'ielts';

/**
 * A single coaching recommendation from GET /api/v1/users/:userId/coach/focus.
 *
 * actionTarget is a tab name ('practice' | 'speak') that the homepage uses
 * to navigate when the user taps the action button.
 */
export interface FocusRecommendation {
  type:         FocusType;
  label:        string;   // e.g. "Pronunciation" | "Speaking" | "Get Started"
  title:        string;   // specific, action-oriented headline
  description:  string;   // 1-sentence supporting detail
  actionLabel:  string;   // button text, e.g. "Practice" | "Explore"
  actionTarget: string;   // navigation target, e.g. "practice" | "speak"
  scenarioId?:  string;   // deep-link: open this scenario directly
  lessonId?:    string;   // deep-link: (future) auto-open this lesson
}

export interface TodayFocusData {
  recommendations: FocusRecommendation[];
}

// ---------------------------------------------------------------------------
// Pronunciation types (continued)
// ---------------------------------------------------------------------------

export interface PronunciationResult {
  attemptId:          string;
  overallScore:       number;
  accuracyScore:      number;
  fluencyScore:       number;
  completenessScore:  number;
  pronunciationScore: number;
  words:              WordDetail[];
}
