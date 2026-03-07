/**
 * config/index.js
 *
 * Single source of truth for environment-derived configuration.
 * Import this wherever you need env values — never read process.env directly
 * outside this file. This makes config auditable and testable.
 */

require("dotenv").config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 4000,

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  // Placeholder – populate when a database is introduced
  db: {
    url: process.env.DATABASE_URL || "",
  },

  // Placeholder – populate when auth is introduced
  jwt: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
};

module.exports = config;
