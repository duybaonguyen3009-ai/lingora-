# Wave 2 Retroactive Verification

**Date:** 2026-04-28 (run after the migration safety gate landed in
`e488a53`).

**Method:** A read-only verification harness
(`backend/verify-wave2.tmp.js`, run in the Railway container via
`railway ssh -- node ...`) inspects production Postgres for every
schema object each Wave 2 migration was supposed to create. Output is
JSONL, redacted of PII, reproduced verbatim below.

This is **schema-state verification** — proof that the columns,
constraints, FK actions, and indexes the application code SELECTs and
INSERTs against actually exist on prod with the intended shapes.
End-to-end behavioral verification (signup → submit → delete) for
each task is documented separately in the §"Behavioral verification
follow-up" section.

The verification was prompted by the Wave 2 silent migration drift
incident (postmortem in `backend/docs/MIGRATIONS.md`) — we could no
longer trust the original "task done verified" claims because
post-cutover smoke at the time only checked `/health` 200 and route
mount, not schema apply.

---

## Result summary — 11/11 PASS

| Task | Check | Result |
|------|-------|--------|
| 2.2  | 4 per-skill band columns exist (`band_estimate_{reading,writing,speaking,listening}`) | ✅ all present, `numeric` / nullable |
| 2.3  | `writing_submissions.source` column | ✅ `varchar` NOT NULL DEFAULT `'practice'` |
| 2.3  | `idx_writing_submissions_user_type_day_source` partial UNIQUE | ✅ `(user_id, task_type, submission_date, source) WHERE status <> 'failed'` |
| 2.7  | `users.email` is now nullable | ✅ `is_nullable: YES` |
| 2.7  | `ux_users_email_active` partial UNIQUE | ✅ `WHERE deleted_at IS NULL AND email IS NOT NULL` |
| 2.7  | `battle_matches.winner_user_id` FK now SET NULL | ✅ `confdeltype = 'n'` |
| 2.7  | `study_room_goals.created_by_user_id` FK now CASCADE | ✅ `confdeltype = 'c'` |
| 2.8  | `users.profile_visibility` column | ✅ `varchar` NOT NULL DEFAULT `'friends'` |
| 2.8  | `users_profile_visibility_check` CHECK | ✅ `IN ('public','friends','private')` |
| 2.8  | Backfill — 7 active prod users pinned to `'public'` | ✅ distribution `[{public: 7}]` |
| meta | `pgmigrations` top row | ✅ `0047_profile_visibility` (then 0046, 0045, 0044, 0043) |

---

## Raw evidence (verbatim JSONL)

```jsonl
{"task":"2.2","name":"per_skill_band_columns_exist","ok":true,"evidence":{"columns":["band_estimate_listening:numeric/YES","band_estimate_reading:numeric/YES","band_estimate_speaking:numeric/YES","band_estimate_writing:numeric/YES"]}}
{"task":"2.3","name":"writing_submissions_source_column","ok":true,"evidence":{"column_name":"source","data_type":"character varying","is_nullable":"NO","column_default":"'practice'::character varying"}}
{"task":"2.3","name":"writing_submissions_source_unique_index","ok":true,"evidence":"CREATE UNIQUE INDEX idx_writing_submissions_user_type_day_source ON public.writing_submissions USING btree (user_id, task_type, submission_date, source) WHERE ((status)::text <> 'failed'::text)"}
{"task":"2.7","name":"users_email_now_nullable","ok":true,"evidence":{"is_nullable":"YES"}}
{"task":"2.7","name":"users_email_partial_unique","ok":true,"evidence":"CREATE UNIQUE INDEX ux_users_email_active ON public.users USING btree (email) WHERE ((deleted_at IS NULL) AND (email IS NOT NULL))"}
{"task":"2.7","name":"battle_matches_winner_set_null","ok":true,"evidence":{"confdeltype":"n"}}
{"task":"2.7","name":"study_room_goals_creator_cascade","ok":true,"evidence":{"confdeltype":"c"}}
{"task":"2.8","name":"profile_visibility_column","ok":true,"evidence":{"column_name":"profile_visibility","data_type":"character varying","is_nullable":"NO","column_default":"'friends'::character varying"}}
{"task":"2.8","name":"profile_visibility_check_constraint","ok":true,"evidence":"CHECK (((profile_visibility)::text = ANY ((ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying])::text[])))"}
{"task":"2.8","name":"profile_visibility_backfill","ok":true,"evidence":{"distribution":[{"profile_visibility":"public","n":7}]}}
{"task":"meta","name":"recent_migrations_applied","ok":true,"evidence":{"recent":["0047_profile_visibility","0046_account_deletion_readiness","0045_writing_submission_source","0044_per_skill_band_estimate","0043_admin_audit_log"]}}
```

---

## Tasks without migrations — already covered

These Wave 2 tasks shipped no schema change; their original Wave smoke
already verified the runtime contract:

| Task | What was verified |
|------|-------------------|
| 2.1  | Streak TZ → VN. Pure JS Date + SQL `AT TIME ZONE`. Verified by 9 unit tests + Wave 2.1 smoke. |
| 2.4  | Daily limits single source. `GET /api/v1/public/limits` returns the locked `{free:{speaking:1,writing:1,...},pro:{...:null}}` shape. Verified live in Wave 2.4. |
| 2.5  | Battle 5-practice gate. Counts `xp_ledger` (already existed). Endpoint `GET /api/v1/battle/eligibility` mounted (verified Wave 2.5 smoke + hotfix). |
| 2.6  | Onboarding self-report. Reuses existing `users.estimated_band` column (added back in 0020). 13 unit tests + Wave 2.6 smoke. |

---

## Behavioral verification follow-up

The schema checks above prove the migrations applied correctly. The
prior session (Wave 2 reports) demonstrated the runtime endpoints
mount and gate correctly. The remaining gap is **end-to-end
behavioral assertions** that exercise each schema column through real
authenticated traffic. Those require:

1. Creating a throwaway test account via the signup flow.
2. Running through each Wave 2 user-facing flow with that account's
   JWT.
3. Querying the DB for the expected post-state.
4. Deleting the test account at the end.

This was deferred during the original task runs because Louis + the
agent had no isolated test-account harness (the 7 prod users are real
and the rate limiters apply to JWT-keyed quotas).

**Recommendation:** ship Wave 2 as verified at the schema level for
now. Add a one-time `e2e-verify-wave2.sh` script that drives the full
flow against a freshly-signed-up `verify+<timestamp>@lingona.app`
account when convenient — out of scope for INFRA-001 because it's
about confidence, not safety. The Wave 2 features are guarded by the
schema gate from this commit forward; any drift is now caught by
`/health/schema` returning 500 before traffic moves.

---

## Postmortem cross-reference

The drift that prompted this verification, plus the safety gate
that prevents recurrence, is documented in
`backend/docs/MIGRATIONS.md` (§Postmortem and §"Production safety
gate").
