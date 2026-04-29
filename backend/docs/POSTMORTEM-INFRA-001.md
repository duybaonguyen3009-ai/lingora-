# Postmortem — INFRA-001 silent-skip + Wave 2.10 hotfix 2/2

## TL;DR

The migration safety gate added in INFRA-001 (commit `e488a53`) was
itself silently bypassed because `railway.toml` was placed at the
**repo root**, while the Railway service's "Root Directory" is set
to `backend/`. Railway resolves config-as-code from the service root,
so the file we wrote was invisible to Railway. Migrations 0044–0047
that we believed were being applied by the new gate were in fact
applied manually via `railway ssh` during the Wave 2.8 recovery —
not by `release.sh`. Wave 2.10's migration 0048 surfaced the silent
skip when its endpoints came back 404 in production despite a
green build pipeline.

The hotfix moves `railway.toml` to `backend/railway.toml` (Layer 1
restored) and adds a `prestart` hook in `package.json` (Layer 3, new)
so npm itself refuses to start the server until migrations succeed —
platform-neutral and immune to any future Railway config-resolution
quirk.

## Timeline

| Date | Event |
|---|---|
| 2026-04-28 | Wave 2 ships migrations 0044–0047. Migration 0047 has the inner-quotes default bug; node-pg-migrate single-transaction wraps all four. 0047 fails ⇒ all four roll back. Railway healthcheck (`/health`, schema-blind) returns 200 ⇒ cutover proceeds. New code runs against schema as-of 0043 for ~4 days. |
| 2026-04-28 (later) | Wave 2.8 smoke detects the drift on `/profile/:username`. Migration 0047 is patched. All four migrations applied via `railway ssh -- npx node-pg-migrate up`. Schema healed. |
| 2026-04-28 (INFRA-001) | Migration safety gate added: `scripts/release.sh` (Layer 1, fail-closed bash wrapper), `/health/schema` endpoint (Layer 2, drift detector), `railway.toml` updated to wire both. `railway.toml` is created at the **repo root** because the existing comment claimed that's where it lives. |
| 2026-04-28 → 2026-04-28 | Wave 2.9 deploys with no migration. Two more deploys (`e488a53`, `39e5a31`, `131c9b3`) succeed without anyone noticing the release-phase output is missing from logs — there's no migration to apply, so silence is indistinguishable from success. |
| 2026-04-28 (Wave 2.10, commit `42dce70`) | Migration 0048 ships. Build passes, healthcheck "succeeded" (the start container's `/health/schema` returned 200 because filesystem ⇒ pgmigrations both still ended at 0047 — neither side had 0048). Container boots without ever running `release.sh`. New endpoints are 404, schema gate STILL says ok=true (because the start container's filesystem is from an OLDER deploy that didn't include 0048; Railway promoted the wrong image OR this is the same container that's been running since 131c9b3). |
| 2026-04-28 (Wave 2.10 hotfix 2/2) | Diagnosis: `railway.toml` location is wrong. Move to `backend/`. Add `prestart` hook. |

## Root cause

Two compounding facts:

1. **Railway's config-as-code path discovery is relative to the
   service's Root Directory.** When Root Directory = `backend/`,
   Railway looks for `backend/railway.toml`. A file at the repo root
   is NOT searched.

2. **The original repo-root `railway.toml` had a comment that said
   "Lives at repo root"** which led INFRA-001 to leave the file
   there. The comment was wrong. The file most likely worked in some
   earlier configuration where Root Directory wasn't yet set, then
   stopped working when Root Directory was changed — but because
   nobody added a migration in the window between that change and
   INFRA-001, the silence was undetectable.

## Why none of the existing safety mechanisms caught it

- **Layer 1 (`release.sh`)** never ran. Its "would have caught this"
  property is conditional on Railway invoking it.
- **Layer 2 (`/health/schema`)** caught the drift on the **right
  side** of the cutover — the moment a request arrived at the new
  container, schema was correctly reported. But Railway's
  healthcheck succeeds AGAINST THE BUILD'S new container; if Railway
  promoted the OLD container (or never promoted at all), the new
  drift detector responded only to manual smoke probes.
- **Layer 4 (build pipeline log inspection)** is the gap that let
  this past. Build logs do not show `release.sh` output if
  `releaseCommand` isn't read. Absence of evidence was treated as
  evidence of absence.

## Fix

Atomic commit: file move + prestart hook + this postmortem +
docs/MIGRATIONS.md update.

```
A. git mv railway.toml backend/railway.toml
B. backend/package.json: add "prestart" hook running node-pg-migrate up
   before "start"
```

After A: Layer 1 (release.sh) and Layer 2 (`/health/schema` as
healthcheck path) work as designed.

After B: even if Railway breaks A again (config schema change,
dashboard override, anything), npm's prestart-must-succeed-before-
start semantic guarantees migrations run before the server boots.
Migration failure ⇒ npm exit non-zero ⇒ container crash ⇒
restartPolicyType=ON_FAILURE retries up to 3 times ⇒ deploy fails
honestly.

## Verification required at deploy time

- Deploy logs MUST show one of:
  - `[release] Lingona migration gate starting...` (Layer 1 fired) OR
  - `> backend@... prestart` followed by `> node-pg-migrate up ...`
    (Layer 3 fired)
- `/health/schema` MUST return `{ok:true, latest:"0048_email_changes"}`
- `POST /api/v1/auth/email-change` unauth MUST return `401` (route
  mounted, controller wired)

If only Layer 3 shows in logs but not Layer 1, file a follow-up to
investigate why Layer 1 still skipped — the railway.toml relocation
should have fixed it. Layer 3 is the safety net, not the design.

## Lessons

1. **Comments lie.** The repo-root `railway.toml`'s "Lives at repo
   root" header was ground truth for INFRA-001's design. It wasn't
   ground truth — it was someone's snapshot of an earlier config
   that drifted. Verify config-resolution behavior empirically, not
   from comments.

2. **Absence in logs is information.** When INFRA-001 added a
   `release.sh` that prints `[release] ...` and then `[release]
   Migration gate passed`, the FIRST deploy after INFRA-001 should
   have been verified to contain those lines in deploy logs. It
   wasn't. Verify-before-completion applies to platform-level
   instrumentation as much as application-level.

3. **Defense in depth means platform-independent layers.** Layer 1
   (Railway releaseCommand) and Layer 2 (Railway healthcheck) are
   both Railway-specific. A platform-quirk that breaks Railway's
   config-read breaks both. Layer 3 (npm prestart) is Node-native
   and works anywhere npm runs.

## Follow-ups (separate tickets)

- **Env leak**: Railway prod logs show `Env: development`. Backend
  config falls back to `development` when `NODE_ENV` isn't set in
  Railway service vars. Fix: set `NODE_ENV=production` in the Railway
  Variables tab. Out of scope for this hotfix.
- **`file-type` package**: present in `package.json` deps but
  `node_modules/file-type` missing locally on Louis's machine. 7
  pre-existing test suite failures. Has been the case since Wave 1
  R2 work. Should `rm -rf node_modules && npm ci` once.
- **Wave 5 cleanup**: migrate Speaking history button from `/profile`
  to `/speaking/history` (Wave 1.5b legacy).
