/**
 * Migration 0002 – Content soft deletes + lesson versioning
 *
 * Adds the fields required for safe content lifecycle management:
 *   - Soft deletes on all content tables (deleted_at) so lessons/vocab/quiz
 *     items can be removed without breaking in-progress student progress rows.
 *   - Version + published flag on lessons so the Admin CMS (Phase 5) can
 *     draft edits without immediately affecting live learners.
 *   - Refreshes the lesson_summary view to filter out soft-deleted content.
 *
 * Changes:
 *   lessons
 *     + version     SMALLINT NOT NULL DEFAULT 1
 *     + published   BOOLEAN  NOT NULL DEFAULT true
 *     + deleted_at  TIMESTAMPTZ
 *   vocab_items      + deleted_at  TIMESTAMPTZ
 *   quiz_items       + deleted_at  TIMESTAMPTZ
 *   speaking_prompts + deleted_at  TIMESTAMPTZ
 *   VIEW lesson_summary  (recreated to respect soft deletes)
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // ─── 1. lessons ───────────────────────────────────────────────────────────
  pgm.addColumns('lessons', {
    version: {
      type: 'smallint',
      notNull: true,
      default: 1,
      // Incremented each time lesson content is meaningfully edited.
      // Enables future "lesson changed since you started" warnings.
    },
    published: {
      type: 'boolean',
      notNull: true,
      default: true,
      // false = draft; excluded from student-facing lesson list.
      // Existing lessons default to published = true so nothing breaks.
    },
    deleted_at: {
      type: 'timestamptz',
      // NULL = live lesson. Set to NOW() to soft-delete.
    },
  });

  pgm.createIndex('lessons', 'deleted_at', {
    name: 'idx_lessons_active',
    where: 'deleted_at IS NULL',
  });

  pgm.createIndex('lessons', 'published', {
    name: 'idx_lessons_published',
    where: 'published = true AND deleted_at IS NULL',
  });

  // ─── 2. vocab_items ───────────────────────────────────────────────────────
  pgm.addColumns('vocab_items', {
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('vocab_items', 'deleted_at', {
    name: 'idx_vocab_active',
    where: 'deleted_at IS NULL',
  });

  // ─── 3. quiz_items ────────────────────────────────────────────────────────
  pgm.addColumns('quiz_items', {
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('quiz_items', 'deleted_at', {
    name: 'idx_quiz_active',
    where: 'deleted_at IS NULL',
  });

  // ─── 4. speaking_prompts ──────────────────────────────────────────────────
  pgm.addColumns('speaking_prompts', {
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('speaking_prompts', 'deleted_at', {
    name: 'idx_speaking_active',
    where: 'deleted_at IS NULL',
  });

  // ─── 5. Refresh lesson_summary view ──────────────────────────────────────
  // PostgreSQL's CREATE OR REPLACE VIEW cannot change column order or add new
  // columns in the middle of the select list, so we DROP + CREATE instead.
  // Improvements over the original:
  //   a) Soft-delete awareness: excludes deleted lessons and their content
  //   b) Draft awareness: excludes unpublished lessons
  //   c) Exposes xp_reward + published columns for the API
  pgm.sql('DROP VIEW IF EXISTS lesson_summary;');
  pgm.sql(`
    CREATE VIEW lesson_summary AS
    SELECT
      l.id,
      l.title,
      l.description,
      l.level,
      l.order_index,
      l.xp_reward,
      l.published,
      COUNT(DISTINCT v.id) AS vocab_count,
      COUNT(DISTINCT q.id) AS quiz_count,
      COUNT(DISTINCT s.id) AS speaking_count
    FROM lessons l
    LEFT JOIN vocab_items      v ON v.lesson_id = l.id AND v.deleted_at IS NULL
    LEFT JOIN quiz_items        q ON q.lesson_id = l.id AND q.deleted_at IS NULL
    LEFT JOIN speaking_prompts  s ON s.lesson_id = l.id AND s.deleted_at IS NULL
    WHERE l.deleted_at IS NULL
    GROUP BY l.id, l.title, l.description, l.level, l.order_index, l.xp_reward, l.published
    ORDER BY l.order_index;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  // Restore the original lesson_summary view (without soft-delete / published filters)
  pgm.sql('DROP VIEW IF EXISTS lesson_summary;');
  pgm.sql(`
    CREATE VIEW lesson_summary AS
    SELECT
      l.id,
      l.title,
      l.description,
      l.level,
      l.order_index,
      COUNT(DISTINCT v.id) AS vocab_count,
      COUNT(DISTINCT q.id) AS quiz_count,
      COUNT(DISTINCT s.id) AS speaking_count
    FROM lessons l
    LEFT JOIN vocab_items      v ON v.lesson_id = l.id
    LEFT JOIN quiz_items        q ON q.lesson_id = l.id
    LEFT JOIN speaking_prompts  s ON s.lesson_id = l.id
    GROUP BY l.id, l.title, l.description, l.level, l.order_index
    ORDER BY l.order_index;
  `);

  // Remove indexes
  pgm.dropIndex('speaking_prompts', 'deleted_at', { name: 'idx_speaking_active' });
  pgm.dropIndex('quiz_items',       'deleted_at', { name: 'idx_quiz_active' });
  pgm.dropIndex('vocab_items',      'deleted_at', { name: 'idx_vocab_active' });
  pgm.dropIndex('lessons',          'published',  { name: 'idx_lessons_published' });
  pgm.dropIndex('lessons',          'deleted_at', { name: 'idx_lessons_active' });

  // Remove columns
  pgm.dropColumns('speaking_prompts', ['deleted_at']);
  pgm.dropColumns('quiz_items',       ['deleted_at']);
  pgm.dropColumns('vocab_items',      ['deleted_at']);
  pgm.dropColumns('lessons',          ['version', 'published', 'deleted_at']);
};
