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

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'streak' | 'xp' | 'speaking' | 'writing' | 'reading' | 'battle' | 'social' | 'learning' | 'realworld';

export interface Badge {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  icon_url:    string | null;
  emoji?:      string;
  category?:   BadgeCategory;
  rarity?:     BadgeRarity;
  xp_reward:   number;
  achievement_points?: number;
  awarded_at?: string;
}

export interface BadgeProgress {
  current: number;
  target: number;
  percent: number;
}

export interface AchievementsData {
  earned: Badge[];
  all_badges: Array<{ slug: string; name: string; description: string; emoji: string; category: string; rarity: string; xp_reward: number; achievement_points: number }>;
  progress: Record<string, BadgeProgress>;
  achievement_score: number;
  recent: Badge[];
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

export interface ExaminerPersona {
  name: string;
  voice: string;
}

export interface StartSessionResult {
  sessionId: string;
  title: string;
  emoji: string;
  category: string;
  cueCard?: IeltsCueCard;
  cueCardIndex?: number;
  examinerPersona?: ExaminerPersona;
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
  /** Part 1 only: ms the candidate has to answer before the examiner cuts in.
   *  Populated only when the returned aiTurn IS a Part 1 question. */
  part1AnswerTimeoutMs?: number;
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

export interface FeedbackCard {
  type: 'grammar_error' | 'vocab_repetition' | 'fluency_pause' | 'strength' | 'pronunciation';
  title: string;
  impact: string;
  fix: string[];
  example: string;
}

export interface SpeakingBandRanges {
  fluency:       BandRange;
  vocabulary:    BandRange;
  grammar:       BandRange;
  pronunciation: BandRange;
  overall:       BandRange;
}

export interface EndSessionResult {
  overallScore: number;
  fluency: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  bandScore?: number | null;
  /** Per-criterion + overall band ranges for the diagnostic report. Backend
   *  is the single source of truth — never derive these on the client. */
  bandRanges?: SpeakingBandRanges | null;
  /** Avg-of-4 criteria (0–100) used as the input for `bandRanges.overall`. */
  diagnosticOverall100?: number | null;
  criteriaFeedback?: CriteriaFeedback | null;
  coachFeedback: string;
  turnFeedback: TurnFeedback[];
  notableVocabulary?: string[];
  improvementVocabulary?: string[];
  speechInsights?: SpeechInsights | null;
  feedbackCards?: FeedbackCard[];
  sampleBand8Answer?: string | null;
  sessionStrengths?: string[];
  top3Priorities?: string[];
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
export type WritingChartType = 'line' | 'bar' | 'pie' | 'table';
export type WritingEssayType =
  | 'opinion'
  | 'discussion'
  | 'problem_solution'
  | 'advantages_disadvantages'
  | 'two_part_question';
export type WritingDifficulty = 'band_5_6' | 'band_6_7' | 'band_7_8';

export interface WritingQuestionListItem {
  id: string;
  task_type: WritingTaskType;
  chart_type: WritingChartType | null;
  essay_type: WritingEssayType | null;
  topic: string;
  difficulty: WritingDifficulty;
  title: string | null;
  question_text: string;
  attempted: boolean;
  created_at: string;
}

export interface WritingQuestionDetail extends WritingQuestionListItem {
  chart_data: unknown | null;
  sample_band_7_answer: string;
  supplementary: Record<string, unknown>;
}

export interface WritingCriteria {
  score: number;
  feedback: string;
}

export type WritingErrorType = 'grammar' | 'vocabulary' | 'coherence';

export interface SentenceCorrection {
  original: string;
  corrected: string;
  explanation: string;
  error_type?: WritingErrorType;
  sentence_index?: number;
  band_context?: string;
  pro_version?: string;
}

export interface ParaphraseSuggestion {
  phrase: string;
  alternatives: string[];
  context: string;
}

export interface WritingProgressPattern {
  pattern_type: 'error_type' | 'issue';
  error_type?: WritingErrorType;
  stem?: string;
  occurrences: number;
  first_seen_date: string;
  last_seen_date: string;
  example_issue: string | null;
}

export interface WritingProgressContext {
  insufficient_data: boolean;
  patterns: WritingProgressPattern[];
  sample_size: number;
}

// ---------------------------------------------------------------------------
// Full Test lifecycle + analytics (migration 0036)
// ---------------------------------------------------------------------------

export type WritingFullTestStatus = 'in_progress' | 'submitted' | 'expired';

export interface WritingFullTestRun {
  id: string;
  user_id: string;
  task1_submission_id: string | null;
  task2_submission_id: string | null;
  task1_question_id: string | null;
  task2_question_id: string | null;
  total_time_used_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
  status: WritingFullTestStatus;
  overall_band: number | null;
}

export interface WritingFullTestSummary {
  id: string;
  status: WritingFullTestStatus;
  started_at: string;
  submitted_at: string | null;
  total_time_used_seconds: number | null;
  overall_band: number | null;
  task1_submission_id: string | null;
  task2_submission_id: string | null;
  task1_band: number | null;
  task2_band: number | null;
}

export interface WritingFullTestDetail {
  full_test: WritingFullTestRun;
  task1_submission: WritingSubmission | null;
  task2_submission: WritingSubmission | null;
  overall_band: number | null;
  per_criteria_avg: {
    task: number;
    coherence: number;
    lexical: number;
    grammar: number;
  } | null;
}

export type WritingTrendRange = '7d' | '30d' | '90d';
export type WritingTrendBreakdown = 'overall' | 'criteria' | 'by_task';

export interface WritingTrendPoint {
  date: string;
  overall_band?: number | null;
  task_achievement?: number | null;
  coherence?: number | null;
  lexical?: number | null;
  grammar?: number | null;
  task1_band?: number | null;
  task2_band?: number | null;
}

export interface WritingTrendResponse {
  range: WritingTrendRange;
  breakdown: WritingTrendBreakdown;
  days: number;
  points: WritingTrendPoint[];
}

export interface WritingSelfCompare {
  current_month_avg: number | null;
  previous_month_avg: number | null;
  delta: number | null;
  submission_count_current: number;
  submission_count_previous: number;
}

export type ParagraphIconType =
  | 'coherence'
  | 'band_upgrade'
  | 'good_structure'
  | 'task_response'
  | 'lexical_highlight';

export interface ParagraphIcon {
  type: ParagraphIconType;
  note: string;
}

export interface WritingFeedbackCard {
  type: 'grammar_error' | 'vocab_repetition' | 'coherence' | 'task_achievement' | 'strength';
  title: string;
  impact: string;
  fix: string[];
  example: string;
}

export interface ParagraphAnalysis {
  paragraph_number: number;
  type: 'introduction' | 'body' | 'conclusion';
  score: 'strong' | 'adequate' | 'weak';
  feedback: string;
  highlight_phrase?: string;
  icons?: ParagraphIcon[];
}

export interface WordCountFeedback {
  actual: number;
  target: number;
  status: 'good' | 'too_short' | 'too_long';
  comment: string;
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
  feedback_cards?: WritingFeedbackCard[];
  top_3_priorities?: string[];
  word_count_feedback?: WordCountFeedback;
  paragraph_analysis?: ParagraphAnalysis[];
  essay_type?: WritingEssayType | null;
  paraphrase_suggestions?: ParaphraseSuggestion[];
  cache_version?: number;
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

// ---------------------------------------------------------------------------
// Chat types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: 'text' | 'voice';
  content: string | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  seen_at: string | null;
  created_at: string;
}

export interface Conversation {
  friend_id: string;
  friend_name: string;
  friend_username: string | null;
  friend_avatar: string | null;
  last_message_id: string | null;
  last_sender_id: string | null;
  last_type: string | null;
  last_content: string | null;
  last_audio_duration: number | null;
  last_message_at: string | null;
  last_seen_at: string | null;
  unread_count: number;
}

export interface SocialProfile {
  username: string | null;
  qrToken: string | null;
  friendCount: number;
}

// ---------------------------------------------------------------------------
// Study Room types
// ---------------------------------------------------------------------------

export interface StudyRoom {
  id: string;
  name: string;
  status: 'active' | 'archived';
  room_streak: number;
  max_members: number;
  created_at: string;
  activeGoal?: StudyRoomGoal | null;
  memberCount?: number;
  members?: StudyRoomMember[];
}

export interface StudyRoomMember {
  user_id: string;
  name: string;
  username: string | null;
  role: 'owner' | 'member';
  practiced_today: boolean;
  xp_today: number;
  speaking_sessions_today: number;
  writing_sessions_today: number;
}

export interface StudyRoomGoal {
  id: string;
  goal_type: 'speaking_sessions' | 'writing_tasks' | 'xp' | 'consistency_days' | 'lessons';
  target_value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'failed';
  total_progress?: number;
  contributions?: Array<{ user_id: string; name: string; value: number }>;
}

export interface StudyRoomNote {
  id: string;
  user_id: string;
  author_name: string;
  note_type: 'tip' | 'reminder' | 'motivation' | 'question';
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export interface StudyRoomDashboard {
  room: StudyRoom;
  members: StudyRoomMember[];
  activeGoal: StudyRoomGoal | null;
  recentFeed: Array<{
    user_id: string;
    name: string;
    activity_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  pinnedNotes: StudyRoomNote[];
  allNotes: StudyRoomNote[];
}

// ---------------------------------------------------------------------------
// Share Card types
// ---------------------------------------------------------------------------

export interface ShareCardStats {
  displayName: string;
  streak: number;
  weeklyXp: number;
  totalXp: number;
  weeklyRank: number | null;
  speakingSessionsThisWeek: number;
  writingTasksThisWeek: number;
  predictedBand: number | null;
  level: number;
}

// ---------------------------------------------------------------------------
// Band Progress types
// ---------------------------------------------------------------------------

export interface BandHistoryEntry {
  band: number;
  skill: 'speaking' | 'writing';
  session_id: string;
  scored_at: string;
}

export interface BandProgressData {
  estimated_band: number | null;
  target_band: number;
  band_history: BandHistoryEntry[];
  week_delta: number;
  speaking_avg: number | null;
  writing_avg: number | null;
}

// ---------------------------------------------------------------------------
// Profile types
// ---------------------------------------------------------------------------

export interface ProfileStats {
  user: {
    name: string;
    username: string | null;
    bio: string | null;
    location: string | null;
    avatar_url: string | null;
    target_band: number | null;
    estimated_band: number | null;
    band_history: BandHistoryEntry[];
    is_pro: boolean;
    joined_at: string;
  };
  gamification: {
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    badges: Array<{ slug: string; name: string }>;
  };
  battle: {
    rank_tier: string;
    rank_points: number;
    wins: number;
    losses: number;
  };
  speaking: { totalSessions: number; avgScore: number };
  writing: { totalSubmissions: number; avgBand: number | null };
  social: { friendCount: number };
  leaderboard: { percentile: number };
}

export interface PublicProfile {
  name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  target_band: number | null;
  estimated_band: number | null;
  is_pro: boolean;
  joined_at: string;
  totalXp: number;
  level: number;
  streak: number;
  badges: Array<{ slug: string; name: string }>;
  battle: { rank_tier: string; rank_points: number; wins: number };
}

export interface ProfileUpdateData {
  name?: string;
  bio?: string;
  location?: string;
  target_band?: number;
  avatar_url?: string;
}

// ---------------------------------------------------------------------------
// Pro / Subscription types
// ---------------------------------------------------------------------------

export interface DailyLimits {
  speaking_used: number;
  speaking_limit: number | null;
  writing_used: number;
  writing_limit: number | null;
}

export interface ProStatus {
  is_pro: boolean;
  is_trial: boolean;
  trial_expires_at: string | null;
  daily_limits: DailyLimits;
}

export interface DailyLimitsStatus {
  free_period: boolean;
  is_pro: boolean;
  speaking: { used: number; limit: number | null; allowed: boolean };
  writing: { used: number; limit: number | null; allowed: boolean };
}

// ---------------------------------------------------------------------------
// Onboarding types
// ---------------------------------------------------------------------------

export interface OnboardingStatus {
  has_completed_onboarding: boolean;
  target_band: number | null;
  onboarding_skipped: boolean;
}

// ---------------------------------------------------------------------------
// Reading types
// ---------------------------------------------------------------------------

export interface ReadingPassageSummary {
  id: string;
  topic: string;
  difficulty: string;
  estimated_minutes: number;
  passage_title: string;
}

export type ReadingQuestionType =
  | 'mcq'
  | 'tfng'
  | 'matching'
  | 'ynng'
  | 'matching_headings'
  | 'sentence_completion'
  | 'summary_completion'
  | 'matching_information'
  | 'matching_features'
  | 'matching_sentence_endings'
  | 'note_table_diagram_completion'
  | 'short_answer';

export interface ReadingQuestion {
  id: string;
  order_index: number;
  type: ReadingQuestionType;
  question_text: string;
  // Type-specific payload. Documented per-type in backend migration 0029 header.
  // Frontend renderers type-narrow this per type branch.
  options: Record<string, unknown> | null;
  correct_answer: string;
}

export interface ReadingPassageFull {
  passage: {
    id: string;
    topic: string;
    difficulty: string;
    estimated_minutes: number;
    passage_title: string;
    passage_text: string;
  };
  questions: ReadingQuestion[];
}

export interface ReadingSubResult {
  /**
   * Sub-key identifier — exact field varies per type:
   *   matching_*  → `key` (paragraph label / start id / item id)
   *   completion / short_answer → `blank` (blank id)
   * Renderers should fall back across the alternates.
   */
  key?: string;
  blank?: string;
  user: unknown;
  correct?: unknown;
  accepted?: unknown[];
  is_correct: boolean;
  /** Why the sub-result was rejected when applicable (e.g. exceeds_max_words). */
  reason?: string;
}

export interface ReadingQuestionResult {
  question_id: string;
  order_index: number;
  type: string;
  user_answer: unknown;
  correct_answer: unknown;
  is_correct: boolean;
  explanation: string | null;
  /** Total possible points for this question (1 for simple types, N for complex). */
  max?: number;
  /** Earned points, 0..max. */
  points?: number;
  /** Per-sub-question detail rows for complex types. */
  sub_results?: ReadingSubResult[];
  unsupported_type?: boolean;
}

export interface ReadingPracticeResult {
  score: number;
  total: number;
  band_estimate: number;
  time_seconds: number;
  per_question_results: ReadingQuestionResult[];
}

export type ReadingTestDifficulty = 'foundation' | 'standard' | 'challenge';

export interface ReadingTestSummary {
  id: string;
  title: string;
  difficulty_tier: ReadingTestDifficulty;
  passage_1_id: string;
  passage_2_id: string;
  passage_3_id: string;
  created_at: string;
}

export interface ReadingFullTestData {
  test_id: string | null;
  test_title: string | null;
  difficulty_tier: ReadingTestDifficulty | null;
  passages: ReadingPassageFull[];
  time_limit: number;
  started_at: string;
}

export interface ReadingFullTestResult {
  total_score: number;
  total_questions: number;
  band_estimate: number;
  time_seconds: number;
  /** True when server-trusted elapsed > 60 min + 10 sec grace. */
  late?: boolean;
  passage_breakdowns: Array<{
    passage_id: string;
    score: number;
    total: number;
    /** Per-section band, computed by backend via canonical readingScoreToBand. */
    band: number;
    per_question_results: ReadingQuestionResult[];
  }>;
}

// ---------------------------------------------------------------------------
// Battle types
// ---------------------------------------------------------------------------

export type BattleRankTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'challenger';

export interface BattleProfile {
  user_id: string;
  name?: string;
  username?: string;
  current_rank_points: number;
  current_rank_tier: BattleRankTier;
  wins: number;
  losses: number;
  no_submit_losses: number;
  placement_matches_completed: number;
}

export interface BattlePassage {
  id: string;
  topic: string;
  difficulty: string;
  estimated_minutes: number;
  passage_title: string;
  passage_text: string;
}

export interface BattleQuestion {
  id: string;
  passage_id: string;
  order_index: number;
  type: 'mcq' | 'tfng' | 'matching';
  question_text: string;
  options: Record<string, string> | null;
  correct_answer: string;
}

export interface BattleMatch {
  id: string;
  mode: 'ranked' | 'unranked';
  status: 'queued' | 'matched' | 'active' | 'awaiting_opponent' | 'completed' | 'expired' | 'cancelled';
  skill_type: string;
  winner_user_id: string | null;
  submission_deadline_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BattleMatchStatus {
  match: BattleMatch;
  participant: {
    id: string;
    user_id: string;
    status: string;
    individual_score: number;
    rank_points_before: number | null;
  };
  content: {
    passage: BattlePassage;
    questions: BattleQuestion[];
  } | null;
}

export interface BattleResult {
  match: BattleMatch;
  myResult: {
    name: string;
    individual_score: number;
    rank_delta: number | null;
    xp_reward: number;
    rank_points_after: number | null;
  };
  opponentResult: {
    name: string;
    username: string | null;
    score: number;
    rankDelta: number | null;
  } | null;
  isWinner: boolean;
  isDraw: boolean;
}

export interface BattleLeaderboardEntry {
  user_id: string;
  name: string;
  username: string | null;
  current_rank_points: number;
  current_rank_tier: BattleRankTier;
  wins: number;
  losses: number;
  rank: number;
}

export interface BattleRecentMatch {
  id: string;
  mode: string;
  status: string;
  winner_user_id: string | null;
  completed_at: string | null;
  individual_score: number;
  rank_delta: number | null;
  xp_reward: number;
  passage_title: string | null;
}

export interface BattleHome {
  profile: BattleProfile;
  rank: number | null;
  leaderboardPreview: BattleLeaderboardEntry[];
  recentMatches: BattleRecentMatch[];
}
