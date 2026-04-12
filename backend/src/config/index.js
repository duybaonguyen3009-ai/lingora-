require("dotenv").config();

const env = process.env.NODE_ENV || "development";

// ─── JWT secret validation ────────────────────────────────────────────────────
// Fail loud in production if secrets are not set.
// In development we fall back to insecure placeholders so new engineers can
// run the app without any setup, but log a warning.
if (env === "production") {
  const required = {
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    DATABASE_URL:      process.env.DATABASE_URL,
    CORS_ORIGIN:       process.env.CORS_ORIGIN,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s) in production: ${missing.join(", ")}`
    );
  }
}

if (!process.env.JWT_ACCESS_SECRET && env !== "test") {
  console.warn(
    "[config] WARNING: JWT_ACCESS_SECRET is not set. Using insecure dev fallback. " +
    "Set JWT_ACCESS_SECRET in .env before deploying."
  );
}

module.exports = {
  env,
  port: parseInt(process.env.PORT, 10) || 4000,

  db: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/lingora_dev",
  },

  jwt: {
    accessSecret:    process.env.JWT_ACCESS_SECRET  || "dev-access-secret-CHANGE-ME",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN  || "15m",
    // Refresh tokens are random values stored in the DB (not JWTs),
    // so no refresh secret is needed.
    refreshTtlDays:  parseInt(process.env.JWT_REFRESH_TTL_DAYS, 10) || 30,
  },

  // Free period: all users get unlimited access for launch period.
  // Flip to false after 88 days to enforce daily limits.
  freePeriod: process.env.FREE_PERIOD === "false" ? false : true,
  speakingDailyLimit: parseInt(process.env.SPEAKING_DAILY_LIMIT, 10) || 3,
  writingDailyLimit: parseInt(process.env.WRITING_DAILY_LIMIT, 10) || 1,

  cookie: {
    // httpOnly cookies are never accessible via JavaScript — safest for a kids app.
    // In production they also require HTTPS (secure: true).
    secure:   env === "production",
    sameSite: "strict",
    path:     "/api/v1/auth",   // Only sent to auth endpoints, not every request
  },
};
