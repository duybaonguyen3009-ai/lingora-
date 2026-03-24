# flow.md — IELTS Speaking Flow (CRITICAL — Read Before Any IELTS Change)

This document is the authoritative reference for the IELTS speaking simulation flow.
**Do not modify IELTS code without having read and understood this document.**

---

## Overview

The IELTS exam has 3 parts and 8 UI phases. The backend state machine is authoritative.
The frontend mirrors backend state from every `submitTurn` response (`result.ieltsState`).

```
entering → part1 → part2_intro → part2_prep → part2_speak → part3 → ending → summary
                                                    ↕ (follow_up phase reuses part1 layout)
```

---

## Backend State Machine (`scenarioService.js`)

### State Shape (persisted in `session_meta` JSONB)
```json
{
  "part": 1,
  "phase": "question",
  "questionIndex": 0,
  "cueCardIndex": 3,
  "transitionHistory": ["init → part1:question:0"]
}
```

### All Valid States

| part | phase | description |
|---|---|---|
| 1 | `opening` | Examiner greets + asks candidate's name |
| 1 | `id_check` | Examiner confirms ID + transitions to Part 1 questions |
| 1 | `question` | Asking Part 1 interview questions (index 0–5, 2 topic blocks × 3) |
| 2 | `transition_to_part2` | Examiner announces "Now let's move to Part 2" |
| 2 | `cue_card` | Showing cue card, user has 60s prep time |
| 2 | `long_turn` | User speaks for up to 2 minutes |
| 2 | `follow_up` | Examiner asks one context-aware follow-up question |
| 3 | `transition_to_part3` | Examiner announces "Now let's move to Part 3" |
| 3 | `question_p3` | Discussion questions with ladder tiers (index 0–3) |
| 3 | `complete` | Exam done — trigger scoring |

### State Transitions (from `advanceIeltsState()`)

```
part1:opening:0 → part1:id_check:0 → part1:question:0
  → part1:question:1 → ... → part1:question:5
  → part2:transition_to_part2:0
  → part2:cue_card:0          (triggered by "[READY FOR PART 2]" placeholder)
  → part2:long_turn:0         (triggered by user submitting their prep response)
  → part2:follow_up:0         (triggered by user finishing long turn)
  → part3:transition_to_part3:0
  → part3:question_p3:0       (triggered by "[READY FOR PART 3]" placeholder)
  → part3:question_p3:1 → ... → part3:question_p3:3  (4 questions with discussion ladder)
  → part3:complete
```

---

## Frontend Phase Machine (`IeltsConversation.tsx`)

### Phase Type
```typescript
type ExamPhase =
  | "entering"      // 2s dramatic fade-in before session starts
  | "part1"         // Q&A layout — interview questions
  | "part2_intro"   // TTS announcement plays, then auto-advances
  | "part2_prep"    // Cue card shown + 60s countdown timer
  | "part2_speak"   // User speaks + 120s countdown timer
  | "part3"         // Q&A layout — discussion questions (+ follow_up reuses this)
  | "ending"        // Score analysis screen (min 3s display)
  | "summary"       // ScenarioSummary component with scores
  | "error";        // Error state
```

### Phase → UI Mapping

| Phase | What user sees |
|---|---|
| `entering` | "Entering exam room..." with fade animation |
| `part1` | Chat thread + text/voice input + Part 1 label |
| `part2_intro` | Examiner message + transition overlay |
| `part2_prep` | Cue card + 60s countdown timer |
| `part2_speak` | Recording interface + 120s countdown timer |
| `part3` | Chat thread + text/voice input + Part 3 label |
| `ending` | Animated analysis bars (min 3s) |
| `summary` | `ScenarioSummary` with scores + feedback |
| `error` | Error message + retry/exit buttons |

---

## Full Flow Step by Step

### Step 0: Mount → `entering`
- `useEffect` fires on mount.
- Checks `accessToken` from Zustand. If missing → `phase = "error"`.
- Waits 2000ms (exam room atmosphere).
- Calls `startScenarioSession(scenario.id)`.
- Receives `{ sessionId, turns, cueCard }` from backend.
- Sets `sessionId`, `turns`, `cueCard`, `phase = "part1"`.
- Plays TTS for first examiner question (`playTTS(firstAi.content, true)`).

### Step 0b: Opening Sequence (Examiner Brain)
- Backend starts at `part1:opening` (not `part1:question`).
- Examiner greets + asks name. User responds.
- Backend advances to `part1:id_check`.
- Examiner confirms ID + transitions to Part 1 + asks first topic question.
- User responds → backend advances to `part1:question:0`.
- Total: 2 exchanges before Part 1 questions begin.

### Step 1: Part 1 Q&A (6 questions, 2 topic blocks)
- User speaks or types answer.
- `handleSend()` called.
- Backend returns `result` with `result.ieltsState`.
- If `state.phase === "question"` or `"opening"` or `"id_check"`: play TTS, `autoMic = true`.
- At question index 3: backend crosses topic block boundary → prompt includes topic transition instruction.
- After 6th user answer: backend returns `state.phase = "transition_to_part2"`.

### Step 2: Transition to Part 2
- Frontend detects `state.phase === "transition_to_part2"`.
- Sets `phase = "part2_intro"`.
- Plays TTS announcement (`autoMic = false` — not a question).
- Waits 2500ms.
- Auto-sends `"[READY FOR PART 2]"` placeholder to backend.
- Backend advances to `cue_card` state, returns cue card data.
- Frontend sets `phase = "part2_prep"`, starts 60s timer.
- Plays TTS cue card instruction.

### Step 3: Part 2 Prep (60 seconds)
- Cue card displayed with topic + bullet prompts.
- Timer counting down from 60s.
- User can skip with "I'm ready" button → calls `handlePrepSkip()`.
- On timer expiry: `handlePrepSkip()` auto-fires.
- `prepSkipFiredRef` prevents double-fire (timer + button race).
- `handlePrepSkip()` submits `"[PREP TIME COMPLETE — I AM READY TO SPEAK]"` placeholder.
- Backend advances to `long_turn` state, returns announcement: "Your preparation time is over. Please begin speaking now."
- **NEW:** Frontend plays TTS announcement and WAITS for it to finish.
- Only THEN: sets `phase = "part2_speak"`, starts 120s timer, activates mic.

### Step 4: Part 2 Long Turn (up to 120 seconds)
- User speaks freely (mic recording).
- Any text submission redirects to `handlePart2End()` (not normal `handleSend`).
- On timer expiry: `handlePart2End()` auto-fires.
- `handlePart2End()` submits whatever user has typed/spoken + ends the turn.
- Backend advances to `follow_up` state.
- Frontend sets `phase = "part1"` (reuses Part 1 Q&A layout for follow-up).

### Step 5: Part 2 Follow-Up
- Examiner asks one follow-up question about the long turn topic.
- User answers normally.
- Backend advances to `transition_to_part3`.

### Step 6: Transition to Part 3
- Frontend detects `state.phase === "transition_to_part3"`.
- Sets `phase = "part3"`.
- Plays TTS announcement.
- Waits 2000ms.
- Auto-sends `"[READY FOR PART 3]"` placeholder.
- Backend returns first Part 3 question.
- Plays TTS, `autoMic = true`.

### Step 7: Part 3 Q&A (4 questions with Discussion Ladder)
- 4 questions with escalating tiers: concrete → comparative → analytical → evaluative.
- `part3Tier` advances with each question. De-escalation if previous answer < 15 words.
- Adaptive difficulty modulates phrasing WITHIN each tier based on `analyzeResponseQuality()`.
- After 4th answer: backend returns `state.phase = "complete"`.

### Step 8: Ending → Summary
- Frontend detects `state.phase === "complete"`.
- Plays TTS farewell message.
- Waits 1000ms.
- Calls `handleEndSession(sessionId)`.
- Sets `phase = "ending"`.
- Calls `endScenarioSession(sid, durationMs)` — waits minimum 3s (parallel promise).
- Sets `scores` from result.
- Sets `phase = "summary"`.
- `ScenarioSummary` renders with scores.

---

## TTS + Mic Lifecycle

```
playTTS(text, autoMic=true)
  │
  ├─ setExaminerSpeaking(true)
  ├─ micEnabledRef.current = false
  ├─ micStarted = false           ← double-fire guard (local to each call)
  ├─ tryStartMic():               ← shared helper for all exit paths
  │    if micStarted → return     ← prevents double recording
  │    micStarted = true
  │    setExaminerSpeaking(false)
  │    micEnabledRef.current = true
  │    if autoMic && voice.isSupported && !voice.isRecording:
  │         setTimeout(() => voice.startRecording(), 300ms)
  │
  ├─ fetch audio blob from /tts endpoint
  ├─ new Audio(blobUrl).play()
  │
  ├─ audio.onended:   → tryStartMic()   (success — normal path)
  ├─ audio.onerror:   → tryStartMic()   (corrupt audio / decode error)
  ├─ .play().catch(): → tryStartMic()   (autoplay blocked by browser)
  │
  ├─ blob.size === 0: → setTimeout 600ms → tryStartMic()  (no TTS available)
  └─ catch (outer):   → tryStartMic()   (network error / synthesizeSpeech throws)
```

**autoMic = false** situations:
- `transition_to_part2` announcement (not a question)
- `transition_to_part3` announcement (not a question)
- `part2_prep` cue card instruction (user is reading, not speaking)
- Final farewell before `ending` phase

**autoMic = true** situations:
- Every Part 1 and Part 3 question
- `follow_up` question
- First question after `[READY FOR PART 3]` placeholder

---

## Potential Failure Points

### Race Conditions
- **Double TTS play:** If `playTTS` is called before previous audio has ended, two Audio objects exist. The `audioRef.current` only holds the latest — the previous continues playing silently.
  - Guard: Stop `audioRef.current` before calling `playTTS` again.
- **Concurrent `handleSend` calls:** User submits before previous response arrives. `isProcessing` guard prevents this.
- **Timer expiry during processing:** Timer fires `handlePart2End` while `isProcessing = true`. The early-return guard handles this.

### Stuck States
- **`part2_intro` → never advances:** If `[READY FOR PART 2]` placeholder call fails, phase stays `part2_intro`. No retry logic exists. User is stuck.
- **`transition_to_part3` → never advances:** Same pattern as above.
- **TTS fetch hangs:** `synthesizeSpeech` has no explicit timeout in the frontend. If it hangs, `examinerSpeaking = true` forever and mic never auto-starts.

### Incorrect State Updates
- **`userTurnCount` drifts from backend `questionIndex`:** `userTurnCount` is a local React counter, not derived from `ieltsState.questionIndex`. If a turn fails and is retried, they can diverge. Consequence: minor (only used for UI display, not for state transitions).
- **`cueCard` not set:** If `startScenarioSession` response doesn't include `cueCard`, the prep screen shows no topic. This happens if the scenario isn't an IELTS type.

### Timing Bugs
- **Timer `useEffect` dependency on `[timerActive, timerSeconds]`:** Changing `timerSeconds` while `timerActive = true` restarts the interval. This is correct for Part 2 transitions but could cause double-counting if both change in the same render.

### Auth Failures
- **Session expired mid-exam:** Access token expires during a long exam. The `api.ts` 401 retry logic will attempt a silent refresh. If refresh fails, the next `submitTurn` throws, caught by the `catch` block in `handleSend`, which removes the optimistic turn. Phase does not change — user sees the input again.

---

## Constants

| Constant | Value | Location |
|---|---|---|
| `PART1_QUESTIONS` | 6 (2 blocks × 3) | `IeltsConversation.tsx` + `scenarioService.js` |
| `PART3_QUESTIONS` | 4 | `IeltsConversation.tsx` + `scenarioService.js` |
| `PREP_SECONDS` | 60 | `IeltsConversation.tsx` |
| `SPEAK_SECONDS` | 120 | `IeltsConversation.tsx` |
| Entering pause | 2000ms | `IeltsConversation.tsx` init |
| Part 2 intro wait | 2500ms | `IeltsConversation.tsx` |
| Part 3 transition wait | 2000ms | `IeltsConversation.tsx` |
| Min ending display | 3000ms | `handleEndSession` parallel promise |
| TTS → mic delay | 300ms | `playTTS` onended |
| Part 2 silence timer | 4000ms | `IeltsConversation.tsx` silence detection |
| Silence nudge display | 2000ms | Before auto-restart mic |
| Part 2 min speaking duration | 30000ms (30s) | `handlePart2End` duration check |
| Part 2 min word count | 30 | `handlePart2End` word check |
| Examiner natural delay | 600–800ms | Various `await new Promise` calls |

---

## Audio Intelligence Layer

### Speech Timing (Frontend → Backend)
- `useSpeechTiming.ts` hook tracks recording start/end per voice segment
- Each `submitScenarioTurn` call includes optional `speechMetrics`:
  `{ totalDurationMs, wordsPerMinute, pauseCount, longestPauseMs, segmentCount, speakingRatio }`
- Backend stores in `session_meta.turnSpeechMetrics[]`
- Text-only input sends `null` — backward compatible

### Part 2 Silence Detection
- When voice auto-stops during `part2_speak` phase:
  1. 4-second silence timer starts
  2. If user doesn't restart: show nudge "You can continue speaking."
  3. Auto-restart mic after 2s
  4. If 3+ consecutive short segments: stronger nudge "Try to keep speaking."
- All nudges are non-blocking — user can still click "Finish Speaking"
- Timer expiry bypasses all nudges (unchanged)

### Speech Flow Analysis (Backend)
- `speechAnalyzer.js` runs on all real user turns at `endSession`
- Text signals: filler words, self-corrections, repetition ratio, fragmentation
- Timing signals (when available): WPM, pause count, speaking ratio
- Outputs `hesitationLevel` and `fluencyEstimate`
- High hesitation → 15% fluency score penalty; medium → 7%

### Scoring Integration
- `speechFlow` data injected into OpenAI scoring prompt as context
- Scorer references filler count, speaking ratio, hesitation level
- Speech insights returned to frontend in `EndSessionResult.speechInsights`
- ScenarioSummary displays: hesitation level, WPM, filler breakdown, self-corrections
