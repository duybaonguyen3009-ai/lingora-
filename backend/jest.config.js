/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 15000,
  // Suppress Morgan logging during tests
  // (app.js already checks NODE_ENV !== "test")
};

// Force test environment
process.env.NODE_ENV = "test";
