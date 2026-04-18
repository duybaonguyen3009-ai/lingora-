/**
 * Unit tests for IELTS scoring functions.
 *
 * Covers IELTS rounding edge cases, raw→band conversion tables,
 * overall band calculation, and tier mapping.
 */

const {
  roundIELTSBand,
  isValidBand,
  clampToValidBand,
  calculateOverallBand,
  calculateWritingBand,
  calculateSpeakingBand,
  readingRawToBand,
  listeningRawToBand,
  speakingScoreToBand,
  speakingScoreToBandRange,
  bandToTier,
} = require('../../../src/domain/ielts/scoring');

describe('roundIELTSBand', () => {
  describe('boundary cases', () => {
    it('rounds x.00 to x.0', () => {
      expect(roundIELTSBand(6.0)).toBe(6);
      expect(roundIELTSBand(0)).toBe(0);
      expect(roundIELTSBand(9)).toBe(9);
    });

    it('rounds x.24 down to x.0', () => {
      expect(roundIELTSBand(6.24)).toBe(6);
      expect(roundIELTSBand(6.125)).toBe(6);
    });

    it('rounds x.25 up to x.5 (boundary)', () => {
      expect(roundIELTSBand(6.25)).toBe(6.5);
    });

    it('rounds x.49 to x.5', () => {
      expect(roundIELTSBand(6.49)).toBe(6.5);
    });

    it('rounds x.50 to x.5', () => {
      expect(roundIELTSBand(6.5)).toBe(6.5);
    });

    it('rounds x.74 to x.5', () => {
      expect(roundIELTSBand(6.74)).toBe(6.5);
      expect(roundIELTSBand(6.625)).toBe(6.5);
    });

    it('rounds x.75 up to (x+1).0 (boundary)', () => {
      expect(roundIELTSBand(6.75)).toBe(7);
    });

    it('rounds x.99 to (x+1).0', () => {
      expect(roundIELTSBand(6.99)).toBe(7);
      expect(roundIELTSBand(6.875)).toBe(7);
    });

    it('handles band 8.75 → 9.0 at ceiling', () => {
      expect(roundIELTSBand(8.75)).toBe(9);
    });
  });

  describe('invalid input', () => {
    it('throws TypeError for non-number', () => {
      expect(() => roundIELTSBand('6.5')).toThrow(TypeError);
      expect(() => roundIELTSBand(null)).toThrow(TypeError);
      expect(() => roundIELTSBand(undefined)).toThrow(TypeError);
    });

    it('throws TypeError for NaN / Infinity', () => {
      expect(() => roundIELTSBand(NaN)).toThrow(TypeError);
      expect(() => roundIELTSBand(Infinity)).toThrow(TypeError);
      expect(() => roundIELTSBand(-Infinity)).toThrow(TypeError);
    });

    it('throws RangeError for out of range', () => {
      expect(() => roundIELTSBand(-0.1)).toThrow(RangeError);
      expect(() => roundIELTSBand(9.1)).toThrow(RangeError);
    });
  });
});

describe('isValidBand', () => {
  it('accepts valid bands', () => {
    expect(isValidBand(0)).toBe(true);
    expect(isValidBand(5.5)).toBe(true);
    expect(isValidBand(7)).toBe(true);
    expect(isValidBand(9)).toBe(true);
  });

  it('rejects non-step-0.5 bands', () => {
    expect(isValidBand(6.3)).toBe(false);
    expect(isValidBand(7.25)).toBe(false);
  });

  it('rejects out of range', () => {
    expect(isValidBand(-1)).toBe(false);
    expect(isValidBand(10)).toBe(false);
  });

  it('rejects non-finite', () => {
    expect(isValidBand(NaN)).toBe(false);
    expect(isValidBand(Infinity)).toBe(false);
  });
});

describe('clampToValidBand', () => {
  it('clamps below 0 to 0', () => {
    expect(clampToValidBand(-1)).toBe(0);
  });

  it('clamps above 9 to 9', () => {
    expect(clampToValidBand(10)).toBe(9);
    expect(clampToValidBand(12.5)).toBe(9);
  });

  it('rounds to nearest 0.5', () => {
    expect(clampToValidBand(6.3)).toBe(6.5);
    expect(clampToValidBand(6.2)).toBe(6);
  });

  it('handles NaN by returning 0', () => {
    expect(clampToValidBand(NaN)).toBe(0);
    expect(clampToValidBand(Infinity)).toBe(0);
  });
});

describe('calculateOverallBand', () => {
  it('averages 4 same bands', () => {
    expect(calculateOverallBand({ listening: 7, reading: 7, writing: 7, speaking: 7 })).toBe(7);
  });

  it('applies IELTS rounding to average', () => {
    // avg = 6.375 → 6.5
    expect(calculateOverallBand({ listening: 6.5, reading: 6.5, writing: 6, speaking: 6.5 })).toBe(6.5);
  });

  it('handles boundary avg 6.625 → 6.5', () => {
    expect(calculateOverallBand({ listening: 7, reading: 6.5, writing: 6.5, speaking: 6.5 })).toBe(6.5);
  });

  it('handles boundary avg 6.75 → 7', () => {
    expect(calculateOverallBand({ listening: 7, reading: 7, writing: 6.5, speaking: 6.5 })).toBe(7);
  });

  it('throws on invalid skill band', () => {
    expect(() =>
      calculateOverallBand({ listening: 7.3, reading: 7, writing: 7, speaking: 7 }),
    ).toThrow(RangeError);
  });

  it('throws on non-object input', () => {
    expect(() => calculateOverallBand(null)).toThrow(TypeError);
    expect(() => calculateOverallBand('hello')).toThrow(TypeError);
  });
});

describe('calculateWritingBand', () => {
  it('averages 4 criteria with IELTS rounding', () => {
    // avg = 6.25 → 6.5
    expect(
      calculateWritingBand({ taskResponse: 7, coherence: 6, lexical: 6, grammar: 6 }),
    ).toBe(6.5);
  });

  it('handles all band 9', () => {
    expect(
      calculateWritingBand({ taskResponse: 9, coherence: 9, lexical: 9, grammar: 9 }),
    ).toBe(9);
  });

  it('throws on missing criterion', () => {
    expect(() => calculateWritingBand({ taskResponse: 7, coherence: 7, lexical: 7 })).toThrow(
      RangeError,
    );
  });
});

describe('calculateSpeakingBand', () => {
  it('averages 4 criteria correctly', () => {
    // avg = 5.875 → 6
    expect(
      calculateSpeakingBand({ fluency: 6, lexical: 6, grammar: 5.5, pronunciation: 6 }),
    ).toBe(6);
  });

  it('throws on invalid criterion', () => {
    expect(() =>
      calculateSpeakingBand({ fluency: 10, lexical: 6, grammar: 6, pronunciation: 6 }),
    ).toThrow(RangeError);
  });
});

describe('readingRawToBand (academic)', () => {
  it('maps 40/40 to band 9', () => {
    expect(readingRawToBand(40)).toBe(9);
  });

  it('maps 39/40 to band 9', () => {
    expect(readingRawToBand(39)).toBe(9);
  });

  it('maps 30/40 to band 7', () => {
    expect(readingRawToBand(30)).toBe(7);
  });

  it('maps 23/40 to band 6', () => {
    expect(readingRawToBand(23)).toBe(6);
  });

  it('maps 15/40 to band 5', () => {
    expect(readingRawToBand(15)).toBe(5);
  });

  it('maps 0/40 to band 0', () => {
    expect(readingRawToBand(0)).toBe(0);
  });

  it('defaults to academic when testType omitted', () => {
    expect(readingRawToBand(30)).toBe(readingRawToBand(30, 'academic'));
  });
});

describe('readingRawToBand (general training)', () => {
  it('requires higher raw for same band', () => {
    // 34 raw → academic 7.5, general 7.0
    expect(readingRawToBand(34, 'academic')).toBe(7.5);
    expect(readingRawToBand(34, 'general_training')).toBe(7);
  });

  it('maps 40/40 to band 9', () => {
    expect(readingRawToBand(40, 'general_training')).toBe(9);
  });
});

describe('readingRawToBand invalid', () => {
  it('throws on non-integer', () => {
    expect(() => readingRawToBand(30.5)).toThrow(RangeError);
  });

  it('throws on out of range', () => {
    expect(() => readingRawToBand(-1)).toThrow(RangeError);
    expect(() => readingRawToBand(41)).toThrow(RangeError);
  });
});

describe('listeningRawToBand', () => {
  it('maps 40/40 to band 9', () => {
    expect(listeningRawToBand(40)).toBe(9);
  });

  it('maps 30/40 to band 7', () => {
    expect(listeningRawToBand(30)).toBe(7);
  });

  it('maps 18/40 to band 5.5', () => {
    expect(listeningRawToBand(18)).toBe(5.5);
  });

  it('throws on invalid input', () => {
    expect(() => listeningRawToBand(41)).toThrow(RangeError);
    expect(() => listeningRawToBand(-1)).toThrow(RangeError);
    expect(() => listeningRawToBand(15.5)).toThrow(RangeError);
  });
});

describe('bandToTier', () => {
  it('maps 0 to iron', () => {
    expect(bandToTier(0)).toBe('iron');
    expect(bandToTier(3.5)).toBe('iron');
  });

  it('maps 4.0 to bronze', () => {
    expect(bandToTier(4)).toBe('bronze');
  });

  it('maps 4.5 to silver', () => {
    expect(bandToTier(4.5)).toBe('silver');
  });

  it('maps 5.0 to gold', () => {
    expect(bandToTier(5)).toBe('gold');
  });

  it('maps 5.5 to platinum', () => {
    expect(bandToTier(5.5)).toBe('platinum');
  });

  it('maps 6.0 to diamond', () => {
    expect(bandToTier(6)).toBe('diamond');
  });

  it('maps 6.5 to master', () => {
    expect(bandToTier(6.5)).toBe('master');
  });

  it('maps 7.0+ to challenger', () => {
    expect(bandToTier(7)).toBe('challenger');
    expect(bandToTier(9)).toBe('challenger');
  });

  it('throws on invalid band', () => {
    expect(() => bandToTier(7.3)).toThrow(RangeError);
    expect(() => bandToTier(-1)).toThrow(RangeError);
  });
});

describe('speakingScoreToBand (Lingona heuristic)', () => {
  // Canonical bin table — must match historical behaviour from scenarioService
  // and IeltsConversationV2 so migration does not shift any user's band.
  it.each([
    [100, 9.0],
    [95,  9.0],
    [94,  8.5],
    [90,  8.5],
    [85,  8.0],
    [80,  7.5],
    [75,  7.0],
    [74,  6.5],
    [70,  6.5],
    [60,  6.0],
    [50,  5.5],
    [40,  5.0],
    [30,  4.5],
    [20,  4.0],
    [10,  3.0],
    [9,   2.0],
    [0,   2.0],
  ])('score %i → band %p', (score, expected) => {
    expect(speakingScoreToBand(score)).toBe(expected);
  });

  it('preserves historical edge behaviour for out-of-range + junk inputs', () => {
    // These are NOT fixed — they match what the original local copy did.
    expect(speakingScoreToBand(150)).toBe(9.0);   // > 100 → first branch
    expect(speakingScoreToBand(-50)).toBe(2.0);   // negative → floor
    expect(speakingScoreToBand(NaN)).toBe(2.0);   // NaN >= x is false → floor
    expect(speakingScoreToBand(undefined)).toBe(2.0);
  });
});

describe('speakingScoreToBandRange', () => {
  it('returns a ±0.5 window rounded to nearest 0.5', () => {
    // band 7.0 → [6.5, 7.0]
    expect(speakingScoreToBandRange(75)).toEqual({ low: 6.5, high: 7.0 });
    // band 6.0 → [5.5, 6.0]
    expect(speakingScoreToBandRange(60)).toEqual({ low: 5.5, high: 6.0 });
    // band 9.0 clamped → [8.5, 9.0]
    expect(speakingScoreToBandRange(100)).toEqual({ low: 8.5, high: 9.0 });
  });

  it('floors low at 1.0', () => {
    // band 2.0 → [1.5, 2.0]  (low would be 1.5, above the 1.0 floor)
    expect(speakingScoreToBandRange(0)).toEqual({ low: 1.5, high: 2.0 });
  });
});
