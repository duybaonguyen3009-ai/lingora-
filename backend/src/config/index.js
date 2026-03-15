require("dotenv").config();

const env = process.env.NODE_ENV || "development";

// ─── JWT secret validation ────────────────────────────────────────────────────
// Fail loud in production if secrets are not set.
// In development we fall back to insecure placeholders so new engineers can
// run the app without any setup, but log a warning.
if (env === "production") {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET environment variable is required in production.");
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

  cookie: {
    // httpOnly cookies are never accessible via JavaScript — safest for a kids app.
    // In production they also require HTTPS (secure: true).
    secure:   env === "production",
    sameSite: "strict",
    path:     "/api/v1/auth",   // Only sent to auth endpoints, not every request
  },
};
