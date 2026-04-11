/* eslint-disable camelcase */

/**
 * Migration 0016 — Social Features
 *
 * Adds username/QR token to users, friend requests, friendships,
 * notifications, and accountability pings.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add username, qr_token, friend_count to users
  pgm.addColumns("users", {
    username: {
      type: "text",
      unique: true,
      // nullable — existing users don't have username yet
    },
    qr_token: {
      type: "text",
      unique: true,
      // nullable — generated on first use
    },
    friend_count: {
      type: "int",
      notNull: true,
      default: 0,
    },
  });

  // 2. Friend requests
  pgm.createTable("friend_requests", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    sender_user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    receiver_user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    status: {
      type: "text",
      notNull: true,
      default: "'pending'",
      check: "status IN ('pending', 'accepted', 'rejected', 'cancelled')",
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
    responded_at: {
      type: "timestamptz",
    },
  });
  pgm.addConstraint("friend_requests", "unique_active_request", {
    unique: ["sender_user_id", "receiver_user_id"],
  });
  pgm.createIndex("friend_requests", "receiver_user_id", {
    name: "idx_friend_requests_receiver",
  });
  pgm.createIndex("friend_requests", "sender_user_id", {
    name: "idx_friend_requests_sender",
  });

  // 3. Friendships (canonical ordered pair — low_id < high_id)
  pgm.createTable("friendships", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_low_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    user_high_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });
  pgm.addConstraint("friendships", "unique_friendship", {
    unique: ["user_low_id", "user_high_id"],
  });

  // 4. Notifications
  pgm.createTable("notifications", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    type: {
      type: "text",
      notNull: true,
    },
    data: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    read_at: {
      type: "timestamptz",
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });
  pgm.createIndex("notifications", ["user_id", "read_at"], {
    name: "idx_notifications_user_unread",
  });

  // 5. Accountability pings
  pgm.createTable("accountability_pings", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    sender_user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    receiver_user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    message_template_key: {
      type: "text",
      notNull: true,
    },
    ping_date: {
      type: "date",
      notNull: true,
      default: pgm.func("CURRENT_DATE"),
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("now()"),
    },
  });
  pgm.addConstraint("accountability_pings", "unique_ping_per_day", {
    unique: ["sender_user_id", "receiver_user_id", "ping_date"],
  });
};

exports.down = (pgm) => {
  pgm.dropTable("accountability_pings");
  pgm.dropTable("notifications");
  pgm.dropTable("friendships");
  pgm.dropTable("friend_requests");
  pgm.dropColumns("users", ["username", "qr_token", "friend_count"]);
};
