-- =============================================================================
-- Lingora – Database Schema
-- PostgreSQL >= 14
--
-- Run order: this file first, then seed.sql.
-- To reset:  DROP SCHEMA public CASCADE; CREATE SCHEMA public; then re-run.
-- =============================================================================

-- Enable UUID generation (available in all modern PG installs)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. LESSONS
--    Top-level curriculum unit. Everything else hangs off a lesson.
-- =============================================================================
CREATE TABLE IF NOT EXISTS lessons (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(200)  NOT NULL,
    description   TEXT,
    level         VARCHAR(50)   NOT NULL DEFAULT 'beginner'
                                CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    order_index   SMALLINT      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lessons_order_index ON lessons (order_index);

-- =============================================================================
-- 2. VOCAB ITEMS
--    Vocabulary words that belong to a lesson.
-- =============================================================================
CREATE TABLE IF NOT EXISTS vocab_items (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id         UUID          NOT NULL
                                    REFERENCES lessons (id) ON DELETE CASCADE,
    word              VARCHAR(100)  NOT NULL,
    meaning           TEXT          NOT NULL,
    example_sentence  TEXT,
    pronunciation     VARCHAR(200),             -- IPA or phonetic guide
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_lesson ON vocab_items (lesson_id);

-- =============================================================================
-- 3. QUIZ ITEMS
--    Multiple-choice questions that belong to a lesson.
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_items (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID          NOT NULL
                                  REFERENCES lessons (id) ON DELETE CASCADE,
    question        TEXT          NOT NULL,
    option_a        TEXT          NOT NULL,
    option_b        TEXT          NOT NULL,
    option_c        TEXT          NOT NULL,
    option_d        TEXT          NOT NULL,
    correct_option  CHAR(1)       NOT NULL
                                  CHECK (correct_option IN ('a', 'b', 'c', 'd')),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_lesson ON quiz_items (lesson_id);

-- =============================================================================
-- 4. SPEAKING PROMPTS
--    Open-ended prompts that encourage spoken practice.
-- =============================================================================
CREATE TABLE IF NOT EXISTS speaking_prompts (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID          NOT NULL
                                  REFERENCES lessons (id) ON DELETE CASCADE,
    prompt_text     TEXT          NOT NULL,
    sample_answer   TEXT,
    hint            TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speaking_lesson ON speaking_prompts (lesson_id);

-- =============================================================================
-- 5. USERS
--    Learner accounts. auth_provider_id links to an external auth service
--    (e.g. Auth0, Supabase Auth) and is kept nullable until auth is wired up.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_provider_id   VARCHAR(255)  UNIQUE,           -- external identity token
    email              VARCHAR(255)  UNIQUE NOT NULL,
    name               VARCHAR(150)  NOT NULL,
    avatar_url         TEXT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- =============================================================================
-- 6. USER PROGRESS
--    Tracks one learner's result for one lesson.
--    A (user_id, lesson_id) pair is unique — progress is upserted, not appended.
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_progress (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID          NOT NULL
                                REFERENCES users   (id) ON DELETE CASCADE,
    lesson_id     UUID          NOT NULL
                                REFERENCES lessons (id) ON DELETE CASCADE,
    score         SMALLINT      CHECK (score BETWEEN 0 AND 100),
    completed     BOOLEAN       NOT NULL DEFAULT FALSE,
    completed_at  TIMESTAMPTZ,                         -- NULL until completed = true
    CONSTRAINT uq_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user   ON user_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON user_progress (lesson_id);

-- =============================================================================
-- Helpful view: lesson summary with content counts
-- =============================================================================
CREATE OR REPLACE VIEW lesson_summary AS
SELECT
    l.id,
    l.title,
    l.level,
    l.order_index,
    COUNT(DISTINCT v.id)  AS vocab_count,
    COUNT(DISTINCT q.id)  AS quiz_count,
    COUNT(DISTINCT s.id)  AS speaking_count
FROM lessons           l
LEFT JOIN vocab_items      v ON v.lesson_id = l.id
LEFT JOIN quiz_items        q ON q.lesson_id = l.id
LEFT JOIN speaking_prompts  s ON s.lesson_id = l.id
GROUP BY l.id, l.title, l.level, l.order_index
ORDER BY l.order_index;
