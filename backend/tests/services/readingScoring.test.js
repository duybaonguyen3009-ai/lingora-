/**
 * Unit tests for reading scoring. Covers happy path for every supported type
 * plus the edge cases documented in migration 0029 (word-count limits, word
 * bank enforcement, unsupported-type fallback).
 */

const {
  scoreQuestion,
  scoreSubmission,
  countWords,
  normalize,
} = require("../../src/services/readingScoring");

describe("helpers", () => {
  test("normalize trims and lowercases", () => {
    expect(normalize("  Hello World  ")).toBe("hello world");
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });

  test("countWords splits on whitespace and drops empties", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("  spaced   out  ")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(countWords(null)).toBe(0);
  });
});

describe("scoreQuestion — single-choice types", () => {
  test.each([
    ["mcq", "B"],
    ["tfng", "TRUE"],
    ["ynng", "Y"],
    ["matching", "C"],
  ])("%s: exact match scores 1/1", (type, correct) => {
    const q = { type, correct_answer: correct };
    const r = scoreQuestion(q, correct);
    expect(r.points).toBe(1);
    expect(r.max).toBe(1);
    expect(r.is_correct).toBe(true);
  });

  test("mcq: mismatched scores 0/1", () => {
    const r = scoreQuestion({ type: "mcq", correct_answer: "A" }, "B");
    expect(r.points).toBe(0);
    expect(r.max).toBe(1);
    expect(r.is_correct).toBe(false);
  });

  test("ynng: case-insensitive match", () => {
    const r = scoreQuestion({ type: "ynng", correct_answer: "NG" }, "ng");
    expect(r.points).toBe(1);
  });

  test("empty answer scores 0", () => {
    const r = scoreQuestion({ type: "mcq", correct_answer: "A" }, "");
    expect(r.points).toBe(0);
    expect(r.is_correct).toBe(false);
  });
});

describe("scoreQuestion — matching_headings", () => {
  const question = {
    type: "matching_headings",
    correct_answer: '{"A":"i","B":"iii","C":"ii"}',
    options: {
      headings: [
        { letter: "i", text: "One" },
        { letter: "ii", text: "Two" },
        { letter: "iii", text: "Three" },
      ],
      paragraphs: [{ label: "A" }, { label: "B" }, { label: "C" }],
      correct_mapping: { A: "i", B: "iii", C: "ii" },
    },
  };

  test("all correct → full points", () => {
    const r = scoreQuestion(question, JSON.stringify({ A: "i", B: "iii", C: "ii" }));
    expect(r.points).toBe(3);
    expect(r.max).toBe(3);
    expect(r.is_correct).toBe(true);
    expect(r.sub_results).toHaveLength(3);
    expect(r.sub_results.every((s) => s.is_correct)).toBe(true);
  });

  test("partial match → partial points, is_correct false", () => {
    const r = scoreQuestion(question, JSON.stringify({ A: "i", B: "wrong", C: "ii" }));
    expect(r.points).toBe(2);
    expect(r.max).toBe(3);
    expect(r.is_correct).toBe(false);
    expect(r.sub_results[1].is_correct).toBe(false);
  });

  test("malformed JSON answer → 0 points, no crash", () => {
    const r = scoreQuestion(question, "not json");
    expect(r.points).toBe(0);
    expect(r.max).toBe(3);
  });

  test("accepts object answer as well as JSON string", () => {
    const r = scoreQuestion(question, { A: "i", B: "iii", C: "ii" });
    expect(r.points).toBe(3);
  });
});

describe("scoreQuestion — sentence_completion", () => {
  const question = {
    type: "sentence_completion",
    correct_answer: "apple",
    options: {
      sentences: [
        { id: "s1", text_with_blank: "The ___ is red.", max_words: 2, correct_answers: ["apple", "red apple"] },
        { id: "s2", text_with_blank: "She rode her ___.", max_words: 1, correct_answers: ["bike", "bicycle"] },
      ],
    },
  };

  test("both blanks correct → 2/2", () => {
    const r = scoreQuestion(question, JSON.stringify({ s1: "apple", s2: "bike" }));
    expect(r.points).toBe(2);
    expect(r.max).toBe(2);
    expect(r.is_correct).toBe(true);
  });

  test("case-insensitive + trim", () => {
    const r = scoreQuestion(question, JSON.stringify({ s1: "  APPLE  ", s2: "Bicycle" }));
    expect(r.points).toBe(2);
  });

  test("alternate accepted answer counts", () => {
    const r = scoreQuestion(question, JSON.stringify({ s1: "red apple", s2: "bicycle" }));
    expect(r.points).toBe(2);
  });

  test("exceeding max_words rejects that blank with reason", () => {
    const r = scoreQuestion(question, JSON.stringify({ s1: "a big red apple", s2: "bike" }));
    expect(r.points).toBe(1);
    expect(r.sub_results[0].is_correct).toBe(false);
    expect(r.sub_results[0].reason).toBe("exceeds_max_words");
  });

  test("missing blank → 0 for that blank", () => {
    const r = scoreQuestion(question, JSON.stringify({ s1: "apple" }));
    expect(r.points).toBe(1);
    expect(r.sub_results[1].is_correct).toBe(false);
  });
});

describe("scoreQuestion — summary_completion", () => {
  const withBank = {
    type: "summary_completion",
    correct_answer: "train",
    options: {
      summary_text_with_blanks: "The {{b1}} moves in {{b2}}.",
      word_bank: ["train", "tracks", "bicycle"],
      blanks: [
        { id: "b1", correct_answers: ["train"], max_words: 1 },
        { id: "b2", correct_answers: ["tracks"], max_words: 1 },
      ],
      mode: "with_bank",
    },
  };

  const withoutBank = {
    ...withBank,
    options: { ...withBank.options, mode: "without_bank", word_bank: undefined },
  };

  test("with_bank: both in bank + correct → full points", () => {
    const r = scoreQuestion(withBank, JSON.stringify({ b1: "train", b2: "tracks" }));
    expect(r.points).toBe(2);
  });

  test("with_bank: answer not in bank → rejected with reason", () => {
    const r = scoreQuestion(withBank, JSON.stringify({ b1: "locomotive", b2: "tracks" }));
    expect(r.points).toBe(1);
    expect(r.sub_results[0].is_correct).toBe(false);
    expect(r.sub_results[0].reason).toBe("not_in_word_bank");
  });

  test("without_bank: no bank check", () => {
    const r = scoreQuestion(withoutBank, JSON.stringify({ b1: "train", b2: "tracks" }));
    expect(r.points).toBe(2);
  });
});

describe("scoreQuestion — matching_information / matching_features / matching_sentence_endings", () => {
  test("matching_information: paragraph reuse + partial credit", () => {
    const q = {
      type: "matching_information",
      correct_answer: "{}",
      options: {
        statements: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
        paragraph_labels: ["A", "B", "C"],
        correct_mapping: { s1: "A", s2: "C", s3: "A" }, // A used twice
      },
    };
    const r = scoreQuestion(q, JSON.stringify({ s1: "A", s2: "B", s3: "A" }));
    expect(r.points).toBe(2);
    expect(r.max).toBe(3);
    expect(r.is_correct).toBe(false);
  });

  test("matching_features: case-insensitive feature letter match", () => {
    const q = {
      type: "matching_features",
      correct_answer: "{}",
      options: {
        features: [{ letter: "A" }, { letter: "B" }],
        items: [{ id: "i1" }, { id: "i2" }],
        correct_mapping: { i1: "A", i2: "B" },
      },
    };
    const r = scoreQuestion(q, JSON.stringify({ i1: "a", i2: "B" }));
    expect(r.points).toBe(2);
  });

  test("matching_sentence_endings: distractor endings don't crash scoring", () => {
    const q = {
      type: "matching_sentence_endings",
      correct_answer: "{}",
      options: {
        sentence_starts: [{ id: "s1" }, { id: "s2" }],
        endings: [{ letter: "A" }, { letter: "B" }, { letter: "C" }, { letter: "D" }],
        correct_mapping: { s1: "C", s2: "A" },
      },
    };
    const r = scoreQuestion(q, JSON.stringify({ s1: "C", s2: "D" }));
    expect(r.points).toBe(1);
    expect(r.max).toBe(2);
    expect(r.sub_results[1].is_correct).toBe(false);
  });
});

describe("scoreQuestion — note_table_diagram_completion", () => {
  const baseBlanks = [
    { id: "b1", max_words: 2, correct_answers: ["the lab", "lab"] },
    { id: "b2", max_words: 1, correct_answers: ["1965"] },
  ];

  test("note format: per-blank scoring", () => {
    const q = {
      type: "note_table_diagram_completion",
      correct_answer: "lab",
      options: { format: "note", structure: "Built in {{b1}}, opened {{b2}}.", blanks: baseBlanks },
    };
    const r = scoreQuestion(q, JSON.stringify({ b1: "the lab", b2: "1965" }));
    expect(r.points).toBe(2);
    expect(r.is_correct).toBe(true);
  });

  test("table format: max_words enforced", () => {
    const q = {
      type: "note_table_diagram_completion",
      correct_answer: "1965",
      options: { format: "table", structure: { rows: [["{{b2}}"]] }, blanks: baseBlanks },
    };
    const r = scoreQuestion(q, JSON.stringify({ b1: "this is the laboratory", b2: "1965" }));
    expect(r.points).toBe(1);
    expect(r.sub_results[0].reason).toBe("exceeds_max_words");
  });

  test("diagram format: blanks scored regardless of structure shape", () => {
    const q = {
      type: "note_table_diagram_completion",
      correct_answer: "lab",
      options: {
        format: "diagram",
        structure: { image_url: "https://x", caption: "Fig 1" },
        blanks: baseBlanks,
      },
    };
    const r = scoreQuestion(q, JSON.stringify({ b1: "lab", b2: "1965" }));
    expect(r.points).toBe(2);
  });
});

describe("scoreQuestion — short_answer", () => {
  const q = {
    type: "short_answer",
    correct_answer: "in the lab",
    options: {
      questions: [
        { id: "q1", question_text: "Where?", max_words: 3, correct_answers: ["in the lab", "lab"] },
        { id: "q2", question_text: "When?", max_words: 1, correct_answers: ["1965"] },
      ],
    },
  };

  test("happy path → full points", () => {
    const r = scoreQuestion(q, JSON.stringify({ q1: "in the lab", q2: "1965" }));
    expect(r.points).toBe(2);
    expect(r.is_correct).toBe(true);
  });

  test("alternate accepted answer + case-insensitive trim", () => {
    const r = scoreQuestion(q, JSON.stringify({ q1: "  LAB  ", q2: "1965" }));
    expect(r.points).toBe(2);
  });

  test("exceeds max_words → that sub-question scores 0", () => {
    const r = scoreQuestion(q, JSON.stringify({ q1: "deep in the underground lab", q2: "1965" }));
    expect(r.points).toBe(1);
    expect(r.sub_results[0].reason).toBe("exceeds_max_words");
  });

  test("missing answer → 0 for that sub-question", () => {
    const r = scoreQuestion(q, JSON.stringify({ q1: "lab" }));
    expect(r.points).toBe(1);
    expect(r.sub_results[1].is_correct).toBe(false);
  });
});

describe("scoreQuestion — unsupported type", () => {
  test("returns 0 points with unsupported_type flag", () => {
    const r = scoreQuestion({ type: "diagram_labelling", correct_answer: "X" }, "X");
    expect(r.points).toBe(0);
    expect(r.unsupported_type).toBe(true);
  });
});

describe("scoreSubmission — mixed types", () => {
  test("aggregates points across heterogeneous question row types", () => {
    const questions = [
      { id: "q1", order_index: 1, type: "mcq", correct_answer: "B" },
      {
        id: "q2",
        order_index: 2,
        type: "matching_headings",
        correct_answer: "{}",
        options: { correct_mapping: { A: "i", B: "ii" } },
      },
      {
        id: "q3",
        order_index: 3,
        type: "sentence_completion",
        correct_answer: "red",
        options: {
          sentences: [{ id: "s1", max_words: 1, correct_answers: ["red"] }],
        },
      },
    ];
    const answers = [
      { question_id: "q1", answer: "B" },
      { question_id: "q2", answer: JSON.stringify({ A: "i", B: "wrong" }) },
      { question_id: "q3", answer: JSON.stringify({ s1: "red" }) },
    ];
    const r = scoreSubmission(questions, answers);
    expect(r.correct).toBe(1 + 1 + 1);
    expect(r.total).toBe(1 + 2 + 1);
    expect(r.results).toHaveLength(3);
    expect(r.results[1].is_correct).toBe(false);
  });
});
