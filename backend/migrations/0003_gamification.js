/**
 * Migration 0003 – Gamification tables
 *
 * Adds the persistence layer for Phase 2 gamification and analytics:
 *
 *   xp_ledger       – Append-only XP event log.  NEVER UPDATE or DELETE rows.
 *                     The user's total XP is always SUM(delta) for their id.
 *   user_streaks    – One row per user: current streak, longest streak, last
 *                     activity date.  Upserted on each lesson completion.
 *   badges          – Static badge definitions (slugs, names, XP rewards).
 *                     Seeded here; new badge types require a migration.
 *   user_badges     – Join table: which users have earned which badges.
 *                     PRIMARY KEY (user_id, badge_id) prevents duplicate awards.
 *   learning_events – Append-only event log for analytics, streak computation,
 *                     and the skills heatmap.  NEVER UPDATE or DELETE rows.
 *                     Partition by month at > 10 M rows (Phase 8).
 *
 * Design decisions:
 *   • users.xp is intentionally NOT added as a mutable column — the
 *     xp_ledger aggregate IS the source of truth (audit trail, retroactive
 *     awards, time-window leaderboards).  See architecture decision D2.
 *   • learning_events uses JSONB payload so different event types can carry
 *     type-specific data (e.g. { correct: true, time_spent_ms: 1200 } for
 *     quiz_answered) without schema changes.
 *   • Both append-only tables get (user_id, created_at DESC) indexes so
 *     per-user time-ordered queries are fast from day one.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {

  // ─── 1. xp_ledger ─────────────────────────────────────────────────────────
  // Append-only.  Each row is one XP event (lesson complete, badge awarded,
  // streak bonus, etc.).  delta can be negative for future XP penalties.
  // ref_id points to the source object (lesson_id, badge_id, …).
  pgm.createTable('xp_ledger', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    delta: {
      type: 'smallint',
      notNull: true,
      // Positive = XP gained. Negative = future XP penalty (not yet used).
    },
    reason: {
      type: 'text',
      notNull: true,
      // Discriminator: 'lesson_complete' | 'badge_award' | 'streak_bonus'
    },
    ref_id: {
      type: 'uuid',
      // The source entity: lesson_id on lesson_complete, badge_id on badge_award.
      // Nullable — some reasons have no associated entity.
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Per-user chronological queries (total XP, XP history, leaderboard window)
  pgm.createIndex('xp_ledger', ['user_id', 'created_at'], {
    name: 'idx_xp_ledger_user_time',
  });

  // ─── 2. user_streaks ──────────────────────────────────────────────────────
  // One row per user.  Upserted (INSERT … ON CONFLICT DO UPDATE) on every
  // lesson completion by the streak service.
  pgm.createTable('user_streaks', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    current_streak: {
      type: 'smallint',
      notNull: true,
      default: 0,
    },
    longest_streak: {
      type: 'smallint',
      notNull: true,
      default: 0,
    },
    last_activity_at: {
      type: 'date',
      // NULL = user has never completed a lesson.
      // Stored as DATE (not TIMESTAMPTZ) because streaks are calendar-day based.
    },
  });

  // ─── 3. badges ────────────────────────────────────────────────────────────
  // Static definitions.  Closed-world: new badge types require a migration.
  // icon_url points to a CDN asset; NULL = use a default icon in the frontend.
  pgm.createTable('badges', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    slug: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
      // Machine identifier used by the badge service to look up a badge.
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    icon_url: {
      type: 'text',
    },
    xp_reward: {
      type: 'smallint',
      notNull: true,
      default: 0,
      // XP awarded alongside the badge (inserted into xp_ledger with reason='badge_award').
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // ─── 4. user_badges ───────────────────────────────────────────────────────
  // Composite PK prevents awarding the same badge twice to the same user.
  pgm.createTable('user_badges', {
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    badge_id: {
      type: 'uuid',
      notNull: true,
      references: '"badges"',
      onDelete: 'CASCADE',
    },
    awarded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addConstraint('user_badges', 'pk_user_badges', 'PRIMARY KEY (user_id, badge_id)');

  // Fast lookup: "which badges does this user have?"
  pgm.createIndex('user_badges', 'user_id', { name: 'idx_user_badges_user' });

  // ─── 5. learning_events ───────────────────────────────────────────────────
  // Append-only event log.  Used for:
  //   a) Streak computation  (lesson_completed events, grouped by calendar day)
  //   b) Skills heatmap      (events per lesson per day)
  //   c) Future analytics    (quiz accuracy, time-on-task, etc.)
  //
  // event_type discriminator values (extend as new event types are added):
  //   'lesson_started'     | 'lesson_completed' | 'lesson_abandoned'
  //   'vocab_viewed'       | 'quiz_answered'    | 'speaking_submitted'
  pgm.createTable('learning_events', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    lesson_id: {
      type: 'uuid',
      notNull: true,
      references: '"lessons"',
      onDelete: 'CASCADE',
    },
    event_type: {
      type: 'text',
      notNull: true,
    },
    payload: {
      type: 'jsonb',
      // Type-specific data, e.g.:
      //   quiz_answered      → { question_id, answer, correct, time_spent_ms }
      //   lesson_completed   → { score, xp_earned }
      //   speaking_submitted → { prompt_id, media_id }
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Per-user chronological queries (streak calc, heatmap, history)
  pgm.createIndex('learning_events', ['user_id', 'created_at'], {
    name: 'idx_learning_events_user_time',
  });

  // Per-lesson queries (lesson-level analytics, content performance)
  pgm.createIndex('learning_events', ['lesson_id', 'created_at'], {
    name: 'idx_learning_events_lesson_time',
  });

  // ─── 6. Seed initial badge definitions ────────────────────────────────────
  // These are the Phase 2 launch badges.  The badge service checks for these
  // slugs by name — DO NOT rename slugs without a corresponding code change.
  pgm.sql(`
    INSERT INTO badges (slug, name, description, xp_reward) VALUES
      ('first_lesson',  'First Step',      'Completed your very first lesson',          50),
      ('streak_3',      '3-Day Streak',    'Learned 3 days in a row',                  75),
      ('streak_7',      'Week Warrior',    'Learned 7 days in a row',                 150),
      ('streak_30',     'Monthly Master',  'Learned 30 days in a row',                500),
      ('perfect_score', 'Perfect Score',   'Scored 100% on a lesson quiz',             100),
      ('speed_demon',   'Speed Demon',     'Completed a lesson in under 2 minutes',     50);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  // Drop in reverse dependency order
  pgm.dropIndex('learning_events', ['lesson_id', 'created_at'], { name: 'idx_learning_events_lesson_time' });
  pgm.dropIndex('learning_events', ['user_id',   'created_at'], { name: 'idx_learning_events_user_time' });
  pgm.dropTable('learning_events');

  pgm.dropIndex('user_badges', 'user_id', { name: 'idx_user_badges_user' });
  pgm.dropTable('user_badges');

  pgm.dropTable('badges');

  pgm.dropTable('user_streaks');

  pgm.dropIndex('xp_ledger', ['user_id', 'created_at'], { name: 'idx_xp_ledger_user_time' });
  pgm.dropTable('xp_ledger');
};
