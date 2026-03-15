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

export interface PronunciationResult {
  attemptId:          string;
  overallScore:       number;
  accuracyScore:      number;
  fluencyScore:       number;
  completenessScore:  number;
  pronunciationScore: number;
  words:              WordDetail[];
}
