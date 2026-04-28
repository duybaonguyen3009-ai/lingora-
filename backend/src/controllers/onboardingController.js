/**
 * controllers/onboardingController.js
 *
 * Onboarding flow: status check, complete, skip.
 */

const { query } = require("../config/db");
const { sendSuccess, sendError } = require("../response");
const { isValidBand } = require("../domain/ielts");

// Self-report floor: a learner who genuinely has no IELTS exposure should
// pick "Chưa biết" (null) rather than 0.0–2.5. Anchoring the floor at 3.0
// keeps the dropdown short and aligned with band descriptors that exist
// for the level (band 3 = "extremely limited user").
const SELF_REPORT_MIN_BAND = 3.0;
const SELF_REPORT_MAX_BAND = 9.0;

/**
 * Accepts the self-reported IELTS band from the onboarding dropdown.
 * Returns:
 *   - undefined when the field is absent (older client, ignore)
 *   - null when the user picked "Chưa biết"
 *   - a half-band number in [3.0, 9.0]
 * Throws a 400 on any other shape.
 */
function parseSelfReportedBand(raw) {
  if (raw === undefined) return undefined;        // legacy client — leave column untouched
  if (raw === null)      return null;             // explicit "Chưa biết" — set NULL
  const num = Number(raw);
  if (!isValidBand(num) || num < SELF_REPORT_MIN_BAND || num > SELF_REPORT_MAX_BAND) {
    const err = new Error(
      `self_reported_band must be null or a half-band between ${SELF_REPORT_MIN_BAND} and ${SELF_REPORT_MAX_BAND}.`,
    );
    err.status = 400;
    throw err;
  }
  return num;
}

async function getStatus(req, res, next) {
  try {
    const result = await query(
      `SELECT has_completed_onboarding, target_band, onboarding_skipped FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    return sendSuccess(res, {
      data: {
        has_completed_onboarding: user?.has_completed_onboarding ?? false,
        target_band: user?.target_band ? Number(user.target_band) : null,
        onboarding_skipped: user?.onboarding_skipped ?? false,
      },
      message: "Onboarding status",
    });
  } catch (err) { next(err); }
}

async function complete(req, res, next) {
  try {
    const { target_band } = req.body;
    let selfBand;
    try {
      selfBand = parseSelfReportedBand(req.body.self_reported_band);
    } catch (e) {
      return sendError(res, { status: 400, message: e.message });
    }

    // estimated_band is updated only when the client sent the key. This
    // protects the 7 prod users who completed onboarding before this
    // field existed: their stored band is left alone. New clients always
    // send the field (null = "Chưa biết", else the chosen half-band).
    if (selfBand === undefined) {
      await query(
        `UPDATE users
            SET has_completed_onboarding = true,
                target_band              = $2,
                onboarding_skipped       = false,
                updated_at               = now()
          WHERE id = $1`,
        [req.user.id, target_band ?? null],
      );
    } else {
      await query(
        `UPDATE users
            SET has_completed_onboarding = true,
                target_band              = $2,
                estimated_band           = $3,
                onboarding_skipped       = false,
                updated_at               = now()
          WHERE id = $1`,
        [req.user.id, target_band ?? null, selfBand],
      );
    }
    return sendSuccess(res, { message: "Onboarding completed" });
  } catch (err) { next(err); }
}

async function skip(req, res, next) {
  try {
    await query(
      `UPDATE users SET has_completed_onboarding = true, onboarding_skipped = true, updated_at = now() WHERE id = $1`,
      [req.user.id]
    );
    return sendSuccess(res, { message: "Onboarding skipped" });
  } catch (err) { next(err); }
}

module.exports = { getStatus, complete, skip };
