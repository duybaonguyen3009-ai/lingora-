/**
 * Pure-function tests for the band-estimate domain (Wave 2.2).
 *
 * No mocks needed — calculateEma is deterministic and side-effect free.
 */

"use strict";

const {
  calculateEma,
  isValidSkill,
  VALID_SKILLS,
  DEFAULT_ALPHA,
} = require("../../src/domain/bandEstimate");

describe("calculateEma", () => {
  it("cold start (oldBand = null) returns the new score rounded to 0.5", () => {
    expect(calculateEma(null, 6.0)).toBe(6.0);
    expect(calculateEma(undefined, 7.5)).toBe(7.5);
    expect(calculateEma(null, 6.3)).toBe(6.5); // rounds up to nearest 0.5
    expect(calculateEma(null, 6.2)).toBe(6.0); // rounds down
  });

  it("blends old and new with alpha=0.3 (default)", () => {
    // 0.3*6.0 + 0.7*7.0 = 6.7 → rounds to 6.5
    expect(calculateEma(7.0, 6.0)).toBe(6.5);
    // 0.3*8.0 + 0.7*7.0 = 7.3 → rounds to 7.5
    expect(calculateEma(7.0, 8.0)).toBe(7.5);
    // No movement when score equals previous estimate.
    expect(calculateEma(6.5, 6.5)).toBe(6.5);
  });

  it("respects an explicit alpha", () => {
    // alpha=1 → fully replace.
    expect(calculateEma(7.0, 5.0, 1)).toBe(5.0);
    // alpha=0.5 → equal blend: 0.5*9 + 0.5*5 = 7
    expect(calculateEma(5.0, 9.0, 0.5)).toBe(7.0);
  });

  it("clamps inputs and outputs to the IELTS [0, 9] scale", () => {
    expect(calculateEma(null, 12)).toBe(9);   // input over-cap
    expect(calculateEma(null, -3)).toBe(0);   // input under-cap
    expect(calculateEma(20, 8)).toBe(8.5);    // 0.3*8 + 0.7*9 = 8.7 → 8.5
    expect(calculateEma(8, -5)).toBe(5.5);    // 0.3*0 + 0.7*8 = 5.6 → 5.5
  });

  it("rejects invalid input", () => {
    expect(() => calculateEma(7.0, null)).toThrow(/newScore/);
    expect(() => calculateEma(7.0, "nan")).toThrow(/newScore/);
    expect(() => calculateEma(7.0, 6.0, 0)).toThrow(/alpha/);
    expect(() => calculateEma(7.0, 6.0, 1.5)).toThrow(/alpha/);
  });

  it("DEFAULT_ALPHA is 0.3", () => {
    expect(DEFAULT_ALPHA).toBe(0.3);
  });
});

describe("isValidSkill / VALID_SKILLS", () => {
  it("accepts the 4 IELTS skills", () => {
    expect(isValidSkill("reading")).toBe(true);
    expect(isValidSkill("writing")).toBe(true);
    expect(isValidSkill("speaking")).toBe(true);
    expect(isValidSkill("listening")).toBe(true);
  });

  it("rejects unknown skills", () => {
    expect(isValidSkill("grammar")).toBe(false);
    expect(isValidSkill("")).toBe(false);
    expect(isValidSkill(null)).toBe(false);
  });

  it("VALID_SKILLS is frozen", () => {
    expect(Object.isFrozen(VALID_SKILLS)).toBe(true);
    expect(VALID_SKILLS).toEqual(["reading", "writing", "speaking", "listening"]);
  });
});
