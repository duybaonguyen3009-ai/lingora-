/* eslint-disable camelcase */

/**
 * Migration 0007 — IELTS Speaking Mode
 *
 * Adds exam_type column to the scenarios table and seeds one IELTS
 * Speaking scenario so the frontend can route to the IELTS conversation UI.
 */

exports.shorthands = undefined;

const IELTS_SYSTEM_PROMPT = `You are a professional IELTS Speaking examiner. Conduct a realistic IELTS Speaking test in 3 parts.

PART 1 — Introduction & Interview (5–6 questions):
Ask friendly questions about familiar topics: home, work or study, hobbies, daily routines, food, travel.
Ask ONE question at a time. Wait for the candidate's response before asking the next question.
After 5–6 exchanges, say: "Thank you. Now let's move to Part 2."

PART 2 — Individual Long Turn:
The candidate will speak for 1–2 minutes on the cue card topic shown to them on screen.
Do NOT interrupt while they are speaking. When they finish, say "Thank you." and ask one brief rounding-off question.
Then say: "Now let's move on to Part 3."

PART 3 — Two-way Discussion (3–5 questions):
Ask more abstract, analytical questions connected to the Part 2 topic.
Encourage the candidate to develop their ideas and probe with natural follow-ups.
After 3–5 exchanges, say: "That is the end of the speaking test. Thank you very much."

Rules:
- Stay in character as a professional but friendly examiner at all times
- Keep YOUR responses short (1–3 sentences maximum)
- Do not correct the candidate's English during the test — just listen and respond naturally
- Use natural examiner phrases: "Could you expand on that?", "That is interesting.", "Moving on..."
- Never break character or mention that you are an AI`;

// NOTE: deprecated by the examinerPersona module (domain/ielts/examinerPersona.js).
// The opening message is now built per-session from a template with a randomly
// picked persona and a time-of-day greeting. This constant remains only so the
// original migration still runs cleanly against an empty DB — the seeded value
// is never read at runtime.
const IELTS_OPENING_MESSAGE = `Hello! Welcome to your IELTS Speaking practice test. I am your examiner today. Let us begin with Part 1.\n\nCould you tell me your full name and where you are from?`;

exports.up = (pgm) => {
  // ── Add exam_type column to scenarios ────────────────────────────────────
  pgm.addColumn("scenarios", {
    exam_type: {
      type: "varchar(20)",
      check: "exam_type IN ('ielts')",
      notNull: false,
      default: null,
    },
  });

  // ── Seed the IELTS scenario ───────────────────────────────────────────────
  pgm.sql(`
    INSERT INTO scenarios (
      id,
      title,
      description,
      category,
      difficulty,
      system_prompt,
      opening_message,
      emoji,
      tags,
      estimated_turns,
      exam_type
    ) VALUES (
      gen_random_uuid(),
      'IELTS Speaking Test',
      'Simulate a full IELTS Speaking test with Part 1 (interview), Part 2 (cue card long turn), and Part 3 (two-way discussion). Practice for your real exam!',
      'exam',
      'advanced',
      ${pgm.func(`'${IELTS_SYSTEM_PROMPT.replace(/'/g, "''")}'`)},
      ${pgm.func(`'${IELTS_OPENING_MESSAGE.replace(/'/g, "''")}'`)},
      '🎓',
      '["ielts","exam","speaking","academic","advanced"]'::jsonb,
      20,
      'ielts'
    );
  `);
};

exports.down = (pgm) => {
  // Remove the IELTS scenario first, then drop the column
  pgm.sql(`DELETE FROM scenarios WHERE exam_type = 'ielts';`);
  pgm.dropColumn("scenarios", "exam_type");
};
