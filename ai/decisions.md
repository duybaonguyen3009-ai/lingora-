# decisions.md — Architectural Decisions & Constraints

Key decisions that are **locked** — do not change without explicit discussion.

---

## State Machine Location

**Decision:** IELTS state lives in the backend (`session_meta` JSONB), not the frontend.

**Why:** The frontend can be refreshed, closed, or reconnected. If state lived only in React, resuming a session would be impossible. The backend is the single source of truth.

**Constraint:** The frontend must never derive phase from turn counts. It reads `result.ieltsState` from every `submitTurn` response and sets the UI phase accordingly.

---

## No Turn-Count Logic

**Decision:** State transitions are driven by explicit `advanceIeltsState()` calls, not by counting turns.

**Why:** Turn count approaches produce heuristic bugs — if a user submits a blank response, or if a request is retried, the count drifts. Explicit state is always correct.

**Constraint:** `questionIndex` in backend state is authoritative. `userTurnCount` in the frontend is for display only, not for logic.

---

## Provider Abstraction Pattern

**Decision:** All external services (AI, TTS, Speech, Storage) are accessed through factory functions (`aiProvider.js`, `ttsProvider.js`, etc.), never imported directly.

**Why:** Switching providers (e.g., OpenAI TTS → ElevenLabs) should require changing only one file. No controller or service should `require('openai')` directly.

**Constraint:** Every provider must implement the interface documented in its factory file. Mock providers must implement the same interface.

---

## Mock-First Development

**Decision:** Every external provider has a mock implementation. Development and tests use mocks by default.

**Why:** Enables offline development, avoids API costs during iteration, makes CI deterministic.

**Constraint:** Real provider is activated by env var (`TTS_PROVIDER=openai`, `AI_PROVIDER=openai`, etc.). Default is always mock.

---

## Audio Lifecycle — Browser Side

**Decision:** TTS audio is fetched as a blob, played via `new Audio()`, never via `<audio>` HTML element in the render tree.

**Why:** Avoids React re-render on audio state changes. Audio play/pause is imperative, not declarative.

**Constraint:** `audioRef.current` always holds the active Audio object. Must be paused and nulled on unmount, on phase change, and before a new TTS call. Memory leak risk if not done.

---

## Placeholder Turns for Auto-Advance

**Decision:** Phase transitions that require no user input (e.g., entering Part 2 or Part 3) use placeholder strings submitted to `submitTurn`: `"[READY FOR PART 2]"`, `"[READY FOR PART 3]"`, `"[PREP TIME COMPLETE — I AM READY TO SPEAK]"`.

**Why:** The backend state machine needs a `submitTurn` call to advance state. There is no separate "advance phase" endpoint. Placeholder strings serve as the trigger without requiring real user speech.

**Constraint:** The backend must not persist these placeholder strings as real conversation turns visible to the scoring rubric. They are internal signals only. If this is ever broken, the AI scoring will include nonsense turns.

**Known issue:** This is currently NOT enforced — placeholders go through the normal `conversation_turns` INSERT. This could skew scoring. Future fix: filter placeholder content from scoring input.

---

## JWT Auth — Token in Memory, Not localStorage

**Decision:** Access token is stored in Zustand (memory only). Refresh token is in an httpOnly cookie.

**Why:** localStorage is readable by any script — XSS vulnerability. Memory is cleared on tab close (forces re-auth, acceptable tradeoff). httpOnly cookies are not accessible to JavaScript.

**Constraint:** Never store the access token in localStorage or sessionStorage. Never log it.

---

## Layer Order — Route → Controller → Service → Repository

**Decision:** All backend code follows strict layering. No layer may skip another.

**Why:** Controllers that call repositories directly bypass all service-layer validation and make future caching or event emission impossible to add cleanly.

**Known violations to watch for:**
- Controller importing a repository directly.
- Service calling `db.query()` directly on a table it doesn't own.
- Component calling `fetch()` directly instead of using `lib/api.ts`.

---

## Monolith Until 50K DAU

**Decision:** No microservice extraction until Lingona reaches 50K daily active users.

**Why:** Premature extraction adds deployment complexity, distributed tracing burden, and network latency with zero benefit at current scale.

**Exception:** Media (audio uploads) never proxies through the API server. Pre-signed URLs go directly from browser to R2.

---

## Retention System — Frontend-First Daily Goal

**Decision:** Daily XP goal progress is computed entirely on the frontend from existing progress data. No new backend endpoints, no localStorage, no new database tables.

**Why:** The backend already returns everything needed:
- `completeLesson` API returns `ApiCompleteResult` with `xpEarned`, `streak`, `level`, `newBadges`
- `useProgress` hook provides all completion records with `completedAt` timestamps and `score`
- Filtering progress by today's date + summing XP per lesson gives accurate daily totals

Adding a backend daily-goal endpoint would duplicate data already available client-side and add unnecessary API calls on every page load.

**Implementation:**
- `useDailyGoal(progress)` — pure `useMemo` computation, recomputes when progress changes
- `DailyGoalBar` — renders in PracticeTab between ContinueLearningCard and LessonsPage
- `CompletionScreen` — receives pre-completion `dailyXp` + `completionResult.xpEarned` from LessonModal to show post-completion daily progress immediately (before progress refresh completes)
- XP constants: `XP_PER_LESSON = 10`, `PERFECT_BONUS = 5`, `DAILY_XP_GOAL = 20`

**Constraint:** These XP constants are frontend estimates for display purposes only. The authoritative XP value comes from the backend `xp_ledger`. If backend XP rules change, update the frontend constants to match.

**Known limitation:** Daily reset uses `new Date()` local timezone via `dateKey()`. Users crossing timezones mid-day may see inconsistent daily totals. Acceptable tradeoff — no user has reported this.

---

## User Identity Hook Rule

**Decision:** All frontend data-fetching hooks that need the effective user ID must use `useCurrentUserId()`, never `useGuestUser()` directly.

**Why:** `useGuestUser()` always returns the guest UUID from localStorage — even when the user is authenticated. After guest migration, progress rows belong to the real user ID, not the guest UUID. Using `useGuestUser()` for an authenticated user returns empty/wrong data.

**Constraint:** `useGuestUser()` may only be used inside `useCurrentUserId()` or in contexts that explicitly need the guest UUID (e.g., the migration call itself). For `useProgress`, `useCourses`, `completeLesson`, and any other user-specific data, always use `useCurrentUserId()`.

**Known violations:** None remaining. `PracticeTab.tsx` and `LessonsPage.tsx` were fixed to use `useCurrentUserId()`.

---

## Known Limitations

| Limitation | Impact | Planned Fix |
|---|---|---|
| ~~Placeholder turns included in scoring~~ | ~~AI scoring noise from `[READY FOR PART 2]` etc.~~ | **FIXED** — `filterPlaceholders()` removes internal signals before scoring |
| No retry on stuck `part2_intro` / `transition_to_part3` | User stuck if auto-advance call fails | Add retry with exponential backoff |
| TTS has no timeout on frontend | `examinerSpeaking = true` forever if API hangs | Add 10s AbortController timeout to `synthesizeSpeech` |
| Web Speech API is Chrome/Edge only | Safari users must use text input | No fix planned — text fallback is acceptable |
| R2 storage not wired | Audio files use mock storage in all envs | Wire when user provides R2 credentials |
| ~~`PracticeTab` + `LessonsPage` use `useGuestUser()`~~ | ~~Authenticated users see wrong progress~~ | **FIXED** — changed to `useCurrentUserId()` |
| ~~`LessonsPage` has hardcoded `SKILL_XP` data~~ | ~~Fake per-skill XP shown to all users~~ | **FIXED** — `SkillXpCard` removed |
| ~~`DailyMission` + `DailyGoalBar` both render in Practice~~ | ~~Confusing duplicate daily display~~ | **FIXED** — `DailyMission` removed from LessonsPage |
| ~~`LessonsSection.tsx` is dead code~~ | ~~Unused file adds noise~~ | **FIXED** — file deleted |
| `dateKey()` duplicated in `useDailyGoal` and `useUserStats` | Maintenance risk — could diverge | Import from single location |
| Grammar progress is localStorage-only | Clearing browser data loses all grammar progress; XP not in backend `xp_ledger` | Add backend grammar progress API when grammar is validated |
| Grammar XP separate from Profile XP | Profile tab shows backend XP, Grammar shows its own XP counter | Unify when backend grammar tracking is added |
| `PracticeTab` still exists but is no longer rendered | Dead component — still importable but not wired | Remove or re-purpose when grammar direction is confirmed |
| Acknowledgment tracking is post-hoc regex | AI might not start with expected pattern | Acceptable — regex is lenient, covers common variations |
| ~~Part 2 silence detection not implemented~~ | ~~No awareness of pauses during long turn~~ | **DONE** — 4s silence timer + auto-restart mic + nudge messages |
| Pronunciation score is text-analysis only | Cannot assess actual speech quality | Requires real audio pipeline (Azure Speech + scored audio) |
| Discussion ladder de-escalation uses word count only | A short but sophisticated answer might trigger unnecessary de-escalation | Acceptable at current scale — revisit with user feedback |

---

## Grammar Curriculum — Context-Based Questions Only

**Decision:** Every grammar question MUST include a time clue or scenario context. Naked "She ___ to school" without context is never allowed.

**Why:** Context-free grammar questions are academic and boring — they test rote memorization, not real understanding. Time clues ("every morning", "right now", "yesterday") and scenario framing ("You're on a video call showing your room") force the learner to think about WHY a tense is correct, not just WHAT form to use. This dramatically improves retention and engagement.

**Constraint:** When adding new questions to `grammarData.ts`, every `sentence` field must contain either:
- A time clue (every day, right now, yesterday, last week, tomorrow, next year, etc.)
- A scenario context ("You're describing...", "Your teacher asks about...", "You call your friend...")
- Both

**Review rule:** If a question can be answered correctly without reading the context words, it's a bad question. Rewrite it.

---

## Grammar Progression — Game-Like Unlock, Not Menu

**Decision:** Grammar lessons unlock sequentially within each unit. Units unlock after passing the previous unit's exam. Final exam unlocks after all unit exams pass.

**Why:** Menu-based learning (pick any lesson) gives no sense of progression. Sequential unlocking creates a game-like flow: challenge → mastery → unlock → next challenge. Users feel achievement at each step.

**Implementation:**
- `useGrammarProgress.ts` — localStorage-backed state, tracks per-lesson scores, per-unit exam results
- First lesson in Unit 1 is always unlocked. Each subsequent lesson requires the previous one completed.
- Unit exam requires all lessons in that unit completed. Next unit requires previous unit's exam passed.
- Final exam requires all 3 unit exams passed.
- XP: 10/lesson (+5 perfect bonus), 20/exam, 50/final exam.

**Constraint:** Never add a "skip" or "unlock all" button. The progression IS the product. If users find it too slow, add more content variety — don't remove the gate.

---

## IELTS Examiner Prompt — Natural, Not Robotic

**Decision:** The IELTS examiner must never say "My name is the examiner" or use generic robotic greetings. The system prompt instructs the AI to use a real first name (Sarah, David, James, Emily) and follow authentic IELTS protocol: greeting → full name request → ID check → Part 1 questions.

**Why:** Real IELTS examiners introduce themselves by name and follow a formal but natural script. "My name is the examiner" breaks immersion immediately.

**Constraint:** Part 1 question 0 prompt must always include the natural greeting template. The AI picks a name itself — this adds variety across sessions.

---

## IELTS Scoring — 4 Criteria + Band Score

**Decision:** IELTS sessions score on 4 criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. A band score (1.0–9.0) is derived from the 0-100 average using `toBandScore()`.

**Why:** IELTS has exactly 4 scoring criteria. The previous 3-criteria system (fluency, vocabulary, grammar) was missing pronunciation and didn't provide band score equivalents.

**Implementation:**
- Backend `endSession` returns `pronunciation` (0-100) and `bandScore` (1.0-9.0)
- `ScenarioSummary` displays all 4 criteria bars + band score badge for IELTS sessions
- Non-IELTS scenarios still get 4 scores but no band score

**Constraint:** Band score is an estimate based on text analysis — it cannot assess real pronunciation. The UI labels it "Estimated Band Score".

---

## IELTS Part 2 — Preparation End Announcement

**Decision:** When Part 2 preparation time ends (timer expiry or "I'm Ready" click), the examiner MUST explicitly announce "Your preparation time is over. Please begin speaking now." via TTS before the mic activates.

**Why:** Real IELTS examiners verbally announce the end of preparation. Silently switching to recording is jarring and unrealistic.

**Implementation:** `handlePrepSkip` in `IeltsConversation.tsx` now awaits the backend response (which returns the announcement text), plays it via TTS, then transitions to `part2_speak` phase. `prepSkipFiredRef` prevents double-fire from timer + button click race.

**Constraint:** The TTS must complete before mic starts. This adds 1-3 seconds of delay but is correct for realism.

---

## IELTS Part 3 — Adaptive Difficulty

**Decision:** Part 3 question difficulty adapts based on candidate response quality measured during the session.

**Why:** Real IELTS examiners adjust difficulty. Strong candidates get deeper abstract questions. Weaker candidates get more accessible questions. This makes the test fair and realistic.

**Implementation:** `userWordCounts` array tracked in session state. `getResponseQuality()` computes "strong" (avg 40+ words), "moderate" (20+), or "limited" (<20). Part 3 prompt includes quality level with appropriate question style suggestions.

**Constraint:** Adaptation is by prompt instruction only — no model switching or scoring changes. The AI decides how to calibrate.

---

## Notable Vocabulary Extraction — Two Tiers

**Decision:** The scoring prompt requests both `notableVocabulary: string[]` (strong usage) and `improvementVocabulary: string[]` (needs improvement). These are displayed as separate sections in the summary UI.

**Why:** Highlighting good language reinforces learning. Showing weak/overused words gives actionable direction. Real IELTS feedback always identifies both strengths and areas for improvement.

**Constraint:** Both arrays may be empty. The UI handles this gracefully (sections hidden when empty). "Needs improvement" vocabulary includes overused words, misused collocations, and basic words that could be upgraded.

---

## IELTS Examiner Must Acknowledge Before Questioning

**Decision:** After the candidate answers any question, the examiner MUST begin with a brief neutral acknowledgment ("Thank you.", "Okay.", "Right.", "Alright.", "I see.") before asking the next question. No two consecutive acknowledgments may be the same.

**Why:** Real IELTS examiners always acknowledge. Jumping directly to the next question with no acknowledgment is the single biggest signal that it's a chatbot. This one behaviour change transforms perceived realism.

**Constraint:** The examiner must NEVER praise ("Good answer!", "Interesting!"). Only neutral acknowledgments. This is controlled via the system prompt personality layer.

---

## Part 2 Speaking Minimum Enforcement

**Decision:** If the user manually clicks "Finish Speaking" with fewer than 30 words, the system shows a nudge ("You still have time...") and does NOT end the long turn. Timer expiry always ends the turn regardless of word count.

**Why:** In real IELTS, candidates who speak for less than 30 seconds on Part 2 receive severe penalties. The nudge teaches proper exam behavior without being blocking — they can ignore it and click again.

**Constraint:** The nudge only fires on manual end, never on timer expiry. The `part2EndByTimerRef` flag distinguishes the two paths.

---

## Adaptive Difficulty — Multi-Signal Analysis

**Decision:** Part 3 difficulty adapts based on three signals: average word count, vocabulary complexity (ratio of words > 6 chars), and sentence complexity (commas + conjunctions). These combine into a composite score that determines "strong", "moderate", or "limited" level.

**Why:** Word count alone is a poor proxy. A user who writes many short simple sentences gets "strong" on word count but is actually "moderate". Adding vocabulary and grammar complexity signals produces more accurate difficulty calibration.

**Implementation:** `analyzeResponseQuality(state)` reads `userResponses[]` stored in session meta. Composite score: word count (0-3 points) + vocab ratio (0-2 points) + complexity avg (0-2 points). Score >= 5 = strong, >= 3 = moderate, else limited.

---

## IELTS Examiner Brain — Decision Layer (Not Prompt Layer)

**Decision:** Examiner behavior is controlled by backend decision logic, not by prompt instructions alone. The state machine provides structured context to each AI call.

**Why:** Prompt-only control means the AI decides everything: when to acknowledge, when to transition topics, when to follow up. This makes the examiner feel random. The backend must decide WHAT to do, and the AI decides HOW to phrase it.

**Implementation — Six modules:**

### A. Opening Orchestrator
- State phases `opening` → `id_check` → `question` (separate exchanges)
- Greeting and name request are one exchange; ID check + Part 1 transition are another
- The candidate has a real back-and-forth before questions start

### B. Part 1 Topic Engine
- 2 topic blocks selected at session start (`topicSetIndices: [idx1, idx2]`)
- 3 questions per block, 6 total Part 1 questions
- Backend detects topic block boundary (`isTopicTransition()`) and instructs examiner to transition
- Topic transition phrasing is mandatory when crossing block boundary

### C. Part 2 Context-Aware Follow-up
- Follow-up prompt includes actual candidate speech summary (not just cue card topic)
- Examiner references specific things the candidate said

### D. Part 3 Discussion Ladder
- 4 tiers: concrete → comparative → analytical → evaluative
- `part3Tier` advances with `questionIndex` (Q1=concrete, Q2=comparative, etc.)
- De-escalation: if previous Part 3 answer < 15 words, tier drops by 1
- Adaptive difficulty modulates phrasing WITHIN each tier (simple vs sophisticated)

### E. Anti-Repetition Policy
- `lastAcknowledgment` tracked in state; prompt says "your last was X, use different"
- `questionsAskedSummary` tracks covered angles; injected into prompt

### F. Part-Tagged Scoring
- `tagConversationParts()` labels each user turn: `[Part 1, Q2]`, `[Part 2 — Long Turn]`, etc.
- Scoring prompt weights Part 2/3 more heavily than Part 1

**Constraint:** The state machine (`advanceIeltsState`) is the authority. The examiner brain metadata rides alongside it but never overrides transitions.

---

## IELTS Scoring Must Cite Evidence

**Decision:** The scoring prompt requires `criteriaFeedback` — per-criterion explanations that cite specific words/phrases from the candidate's actual responses. Generic feedback like "You spoke well" is not acceptable.

**Why:** Evidence-based feedback is what separates a useful IELTS simulator from a toy. Users need to know exactly which of THEIR words/phrases contributed to their score. This makes the feedback actionable.

---

## Audio Intelligence Layer — Speech-Aware Scoring

**Decision:** Add real signal-based speech flow analysis to IELTS scoring. NOT fake audio intelligence — operates on measurable signals: transcript text analysis + frontend timing metadata from Web Speech API.

**Why:** Text-only evaluation ignores HOW the user speaks. Filler words ("um", "you know"), self-corrections, fragmented speech, and pause patterns are critical IELTS fluency signals. Without detecting these, the system scores a hesitant speaker the same as a fluent one if they use the same words.

**Architecture — 7 modules:**

### 1. Speech Flow Analyzer (`speechAnalyzer.js`)
- Text-based: filler word detection (um, uh, you know, basically, like-as-filler), self-correction patterns ("I mean", "no wait"), repetition ratio, sentence fragmentation
- Timing-based (when frontend provides data): words per minute, pause count, speaking ratio
- Outputs: `hesitationLevel` (low/medium/high), `fluencyEstimate` (0-100), `fillerSummary`

### 2. Speech Timing Hook (`useSpeechTiming.ts`)
- Frontend hook tracking recording start/end timestamps per voice input segment
- Calculates: WPM, gaps between segments, segment count, speaking ratio
- `finalizeTurn()` returns `SpeechMetrics` or null (text-only input)

### 3. Silence/Pause Detection (Part 2)
- 4-second silence timer during Part 2 long turn
- Gentle nudge: "You can continue speaking." after first silence
- Stronger nudge after 3+ consecutive short segments: "Try to keep speaking."
- Auto-restart mic after nudge (2s delay)

### 4. Part 2 Duration Control
- Now checks BOTH word count (≥ 30) AND speaking duration (≥ 30s)
- Either failing triggers nudge on manual end
- Timer expiry bypasses all checks (unchanged)

### 5. Speech-Aware Scoring Modifier
- High hesitation → 15% fluency penalty
- Medium hesitation → 7% fluency penalty
- Applied as multiplier alongside existing word-count penalty

### 6. Scorer Context Injection
- `speechFlow` data passed to OpenAI scoring prompt
- Prompt includes: filler count, speaking rate, hesitation level, speaking ratio
- Scorer instructed to reference speech flow in fluency feedback

### 7. Speech Insights Display
- New `SpeechInsights` section in ScenarioSummary
- Shows: hesitation level, WPM, filler word breakdown, self-correction count

**Data pipeline:** Frontend sends optional `speechMetrics` with each `submitTurn` call. Backend stores in `turnSpeechMetrics[]` array in session metadata. On `endSession`, `aggregateSpeechFlow()` combines all turns. Backward compatible — old sessions without metrics still score correctly.

**What this does NOT do (honest limitations):**
- Does NOT analyze actual audio waveforms (would need AudioRecorder + Azure Speech in IELTS flow)
- Does NOT detect pronunciation errors at phoneme level
- Does NOT measure intonation or stress patterns
- Silence detection relies on Web Speech API auto-stop behavior, which varies by browser
