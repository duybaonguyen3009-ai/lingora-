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
  cueCard?: IeltsCueCard;
  cueCardIndex?: number;
  turns: ConversationTurn[];
}

export interface IeltsState {
  part: number;
  phase: string;
  questionIndex: number;
  totalQuestions: number;
  cueCard?: IeltsCueCard;
}

export interface SubmitTurnResult {
  userTurn: ConversationTurn;
  aiTurn: ConversationTurn;
  ieltsState?: IeltsState;
}

export interface TurnFeedback {
  turnIndex: number;
  tip: string;
}

export interface CriteriaFeedback {
  fluency: string;
  vocabulary: string;
  grammar: string;
  pronunciation: string;
}

export interface SpeechInsights {
  hesitationLevel: "low" | "medium" | "high" | "unknown";
  fluencyEstimate: number;
  fillerSummary: string[];
  totalFillerCount: number;
  totalSelfCorrections: number;
  avgWordsPerMinute: number | null;
  avgSpeakingRatio: number | null;
}

export interface EndSessionResult {
  overallScore: number;
  fluency: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  bandScore?: number | null;
  criteriaFeedback?: CriteriaFeedback | null;
  coachFeedback: string;
  turnFeedback: TurnFeedback[];
  notableVocabulary?: string[];
  improvementVocabulary?: string[];
  speechInsights?: SpeechInsights | null;
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

// ---------------------------------------------------------------------------
// Experimental IELTS V2 types
// ---------------------------------------------------------------------------

/** Band range for a single IELTS criterion (e.g., "5.5–6.0") */
export interface BandRange {
  low:  number;  // e.g., 5.5
  high: number;  // e.g., 6.0
}

/** Per-criterion diagnostic with justification + action */
export interface CriterionDiagnostic {
  label:         string;     // "Fluency & Coherence"
  bandRange:     BandRange;
  score100:      number;     // raw 0-100 for animated bar
  justification: string;     // evidence-based, cites user's words
  action:        string;     // one specific thing to improve
  l1Tag?:        string;     // Vietnamese L1 pattern tag (pronunciation only)
}

/** Vietnamese L1 pronunciation pattern detected */
export interface VietnameseL1Pattern {
  pattern:    string;   // "final_consonant_deletion" | "cluster_simplification" | "flat_intonation"
  label:      string;   // human-readable label
  words:      string[]; // affected words from the session
  suggestion: string;   // practice suggestion
}

/** Full diagnostic report for experimental IELTS V2 */
export interface IeltsDiagnosticData {
  overallBandRange:    BandRange;
  overallScore100:     number;
  criteria:            CriterionDiagnostic[];
  topPriority:         string;     // single highest-impact action
  vietnameseL1:        VietnameseL1Pattern[];
  speechInsights:      SpeechInsights | null;
  coachFeedback:       string;
  turnFeedback:        TurnFeedback[];
  notableVocabulary:   string[];
  improvementVocabulary: string[];
  turnCount:           number;
  wordCount:           number;
  durationMs:          number;
  // Retry comparison data (populated on 2nd attempt of same topic)
  previousAttempt?:    {
    overallBandRange: BandRange;
    criteria: Array<{ label: string; bandRange: BandRange; score100: number }>;
  } | null;
}

/** Accuracy check response */
export type FeedbackAccuracy = 'too_generous' | 'about_right' | 'too_harsh';

// ---------------------------------------------------------------------------
// IELTS Writing types
// ---------------------------------------------------------------------------

export type WritingTaskType = 'task1' | 'task2';
export type WritingStatus = 'pending' | 'completed' | 'failed';

export interface WritingCriteria {
  score: number;
  feedback: string;
}

export interface SentenceCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface WritingFeedback {
  overall_band: number;
  language_detected: string;
  criteria: {
    task: WritingCriteria;
    coherence: WritingCriteria;
    lexical: WritingCriteria;
    grammar: WritingCriteria;
  };
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  sentence_corrections: SentenceCorrection[];
  sample_essay: string;
}

export interface WritingSubmission {
  id: string;
  user_id: string;
  task_type: WritingTaskType;
  question_text: string;
  essay_text: string;
  word_count: number;
  language_detected: string | null;
  overall_band: number | null;
  task_score: number | null;
  coherence_score: number | null;
  lexical_score: number | null;
  grammar_score: number | null;
  feedback_json: WritingFeedback | null;
  status: WritingStatus;
  created_at: string;
  updated_at: string;
}

export interface WritingSubmissionSummary {
  id: string;
  task_type: WritingTaskType;
  question_text: string;
  word_count: number;
  overall_band: number | null;
  status: WritingStatus;
  created_at: string;
}

/** Extended EndSessionResult with V2 diagnostic data */
export interface EndSessionResultV2 extends EndSessionResult {
  diagnostic?: IeltsDiagnosticData | null;
}

// ---------------------------------------------------------------------------
// User Feedback types
// ---------------------------------------------------------------------------

export type FeedbackActivityType = 'speaking' | 'writing' | 'lesson';
export type FeedbackRating = 1 | 2 | 3;

export interface UserFeedback {
  id: string;
  activity_type: FeedbackActivityType;
  activity_id: string | null;
  rating: FeedbackRating;
  comment: string | null;
  tags: string[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Social types
// ---------------------------------------------------------------------------

export interface FriendRequest {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  sender_name?: string;
  receiver_name?: string;
  sender_username?: string;
  receiver_username?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
}

export interface Friend {
  id: string;
  name: string;
  username: string | null;
  practiced_today: boolean;
}

export interface SocialNotification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface SocialProfile {
  username: string | null;
  qrToken: string | null;
  friendCount: number;
}
