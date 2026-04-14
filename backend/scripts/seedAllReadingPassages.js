#!/usr/bin/env node
/**
 * seedAllReadingPassages.js — Run all reading passage seed scripts in order.
 *
 * Usage:
 *   node scripts/seedAllReadingPassages.js                    # uses .env DATABASE_URL
 *   DATABASE_URL=postgres://... node scripts/seedAllReadingPassages.js  # explicit DB
 *
 * Safe to re-run — all seed scripts are idempotent (check before insert).
 */

const path = require("path");
const { execSync } = require("child_process");

const SCRIPTS = [
  "seedReadingBand50_55_batch1.js",
  "seedReadingBand50_55_batch2.js",
  "seedReadingBand50_55_batch3.js",
  "seedReadingBand50_55_batch4.js",
  "seedReadingBand60_65_batch1.js",
  "seedReadingBand60_65_batch2.js",
  "seedReadingBand60_65_batch3.js",
  "seedReadingBand70_80_batch1.js",
  "seedReadingBand70_80_batch2.js",
  "seedReadingBand80Plus.js",
];

const scriptsDir = __dirname;

console.log(`[seed] Seeding reading passages into: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, "//***@") || "(from .env)"}`);
console.log(`[seed] Running ${SCRIPTS.length} seed scripts...\n`);

let success = 0;
let failed = 0;

for (const script of SCRIPTS) {
  const fullPath = path.join(scriptsDir, script);
  try {
    console.log(`  → ${script}`);
    execSync(`node "${fullPath}"`, {
      stdio: "pipe",
      env: process.env,
      cwd: path.join(scriptsDir, ".."),
    });
    success++;
  } catch (err) {
    console.error(`  ✗ ${script} failed: ${err.message?.split("\n")[0]}`);
    failed++;
  }
}

console.log(`\n[seed] Done: ${success} succeeded, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
