# Lingona Migrations

Source of truth for the production schema. Every change goes through a
numbered `node-pg-migrate` file in this directory; raw SQL files in
`backend/sql/` are seed/fixture data, not schema migrations.

This README exists to prevent recurrences of the **Wave 2 silent
migration drift incident** (April 2026, postmortem at the end of this
file). Read it before authoring a migration that touches columns,
constraints, or indexes.

---

## Authoring rules

### 1. String defaults — NO inner quotes

`node-pg-migrate` dollar-quotes column defaults verbatim. If you wrap
the value in single quotes yourself, those quotes become PART of the
stored value.

```js
// ❌ WRONG — stored value is the 8-char string `'friends'`
pgm.addColumns("users", {
  profile_visibility: { type: "varchar(10)", default: "'friends'" },
});

// ✅ RIGHT — stored value is the 7-char string `friends`
pgm.addColumns("users", {
  profile_visibility: { type: "varchar(10)", default: "friends" },
});
```

If you also add a `CHECK` constraint that references the literal
(`profile_visibility IN ('public', 'friends', 'private')`), the wrong
form silently violates the check on every existing row → migration
fails → entire deploy chain rolls back (see rule 3).

For SQL function defaults (e.g. `now()`, `gen_random_uuid()`) use
`pgm.func()`:

```js
created_at: { type: "timestamptz", default: pgm.func("now()") }
```

### 2. CHECK constraints — add separately, not inline

The pattern above (`{ default, check }` together inside `addColumns`)
hides ordering ambiguity around when DEFAULT propagation runs vs when
the CHECK is validated. Split them:

```js
pgm.addColumns("users", {
  profile_visibility: { type: "varchar(10)", notNull: true, default: "friends" },
});
pgm.addConstraint("users", "users_profile_visibility_check", {
  check: "profile_visibility IN ('public', 'friends', 'private')",
});
```

This matches the Wave 2.3 (0045) writing-source migration which works.

### 3. ALL pending migrations run in ONE transaction by default

`npx node-pg-migrate up` wraps every pending migration in a single
transaction. **A failure in migration N rolls back N-1, N-2, …** all
the way back to the last successful run.

Implication: if you ship a buggy migration on top of one or more
pending ones from earlier waves, ALL of them disappear from the next
deploy attempt. The Wave 2 incident chain (0044→0045→0046→0047 with
0047 broken) demonstrated this in production.

### 4. Test locally BEFORE pushing

```bash
cd backend
npm run migrate:up                      # apply against local Postgres
npm run migrate:down && npm run migrate:up   # round-trip test
```

If you don't have a local Postgres, you can preview the SQL without
applying it:

```bash
cd backend
npx node-pg-migrate up --dry-run --migrations-dir migrations
```

`--dry-run` doesn't catch CHECK violations against existing rows
(needs a real DB), but does catch syntax errors and unused options.

### 5. Verify pgmigrations reflects the apply

After `migrate:up` succeeds locally:

```sql
SELECT name FROM pgmigrations ORDER BY id DESC LIMIT 5;
```

Your new migration should be the first row. If it isn't, the apply
silently no-op'd — investigate before pushing.

### 6. Numbering

- Use 4-digit zero-padded prefix: `0048_short_description.js`.
- Don't reuse a number. Don't reorder. Don't rebase a migration into
  a sequence position that's already deployed.
- The schema-aware healthcheck (`/health/schema`) compares the
  highest-numbered file in this directory to the latest row in
  `pgmigrations`. Skipping numbers won't break it (it sorts strings),
  but it will confuse humans.

---

## Production safety gate (THREE layers — defense in depth)

1. **`scripts/release.sh`** — Railway's `releaseCommand`. Sets
   `set -euo pipefail` so a non-zero exit from `node-pg-migrate up`
   propagates to Railway, which should refuse to cut traffic to the
   new container. **Railway-specific.**

2. **`GET /health/schema`** — schema-aware readiness check. Reads the
   latest filename from this directory (in the deployed image) and
   compares to the latest row in `pgmigrations`. Returns 500 with a
   `{drift, expected, applied}` payload when they diverge. Railway's
   `healthcheckPath` is wired to this endpoint, so cutover blocks
   even if Layer 1 doesn't. **Railway-specific.**

3. **`package.json` `prestart` hook** — runs `node-pg-migrate up`
   immediately before `node src/server.js`. npm's prestart MUST
   succeed before start; non-zero exit kills the start cycle. Works
   on any platform that runs `npm start`. **Platform-neutral.**
   Added Wave 2.10 hotfix 2/2 after L1 was discovered to be silently
   skipped because `railway.toml` was at the wrong path.

The plain `/health` endpoint stays as a hardcoded liveness probe for
external uptime monitoring.

### Railway config-as-code resolution (Wave 2.10 hotfix 2/2 lesson)

`railway.toml` MUST live at the **service's Root Directory**, not the
repo root. The Lingona backend service has `Root Directory = backend`
in its Railway dashboard, so the live config is at
`backend/railway.toml`. A file at `./railway.toml` is silently
ignored. Verify with:

```bash
ls backend/railway.toml      # MUST exist
ls railway.toml              # MUST NOT exist
```

When changing Railway service settings (especially Root Directory),
re-verify by deploying a no-op commit and reading deploy logs for the
`[release] ...` lines from `scripts/release.sh`. Absence of those
lines means Layer 1 is dark again — Layer 3 (`prestart`) will keep
the schema safe but the system is degraded.

See `backend/docs/POSTMORTEM-INFRA-001.md` for the full incident.

---

## Postmortem — Wave 2 silent migration drift

**Window:** 2026-04-28 14:26 UTC (Wave 2.2 deploy, commit `3f1afbe`)
through 2026-04-28 ~16:30 UTC (Wave 2.8 incident discovery and
recovery, commits `5beb62f` → `2d83c23`).

**Trigger:** Migration `0047_profile_visibility` had `default: "'friends'"`
(inner quotes). The ADD COLUMN compiled into

```sql
ALTER TABLE "users"
  ADD "profile_visibility" varchar(10)
    DEFAULT $pga$'friends'$pga$
    NOT NULL
    CHECK (profile_visibility IN ('public', 'friends', 'private'));
```

Existing rows received the literal 8-char string `'friends'` (with
quotes). The CHECK rejected this immediately. Postgres rolled the
ALTER back, and because `node-pg-migrate up` runs all pending
migrations in a single transaction, 0044, 0045, and 0046 rolled back
too.

**Why nobody noticed:** Railway's healthcheck targeted `/health`,
which always returns 200 regardless of schema state. New container
booted, healthcheck passed, traffic cut over. The new code ran
against the schema as of `0043` for four days (the only reason we
saw it that fast was Wave 2.8 happening to hit a code path that
SELECTed the missing column).

**What was masked:**
- 2.2 per-skill EMA: `UPDATE users SET band_estimate_reading = $4`
  failed on every Reading/Writing/Speaking submit. Caught by an
  outer `try { ... } catch { /* silent */ }` in the service, so the
  legacy `band_history` field kept working.
- 2.3 writing-source theft fix: `findTodaySubmission` SELECT
  referenced a missing `source` column. Would have 500'd on any
  writing submit. Nobody submitted writing in the window.
- 2.7 account delete: `UPDATE users SET email = NULL` would have hit
  the still-present NOT NULL constraint. Nobody deleted an account.

**Recovery:** Patched 0047 to split DEFAULT from CHECK and use the
unquoted value, ran `npx node-pg-migrate up` via `railway ssh` to
heal the schema, pushed the fix as commit `2d83c23` so future fresh
DBs apply correctly.

**Preventions added in INFRA-001:**
- This README (rule 1, 2 specifically prevent re-occurrence)
- `scripts/release.sh` (Layer 1)
- `/health/schema` endpoint (Layer 2)
- `railway.toml` updated to use both
