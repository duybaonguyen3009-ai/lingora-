/**
 * IELTS band descriptors + scoring signals + suggestions.
 *
 * 4-tier structure per criterion:
 *   Tier 1: `descriptors`    — official IELTS band text (band 5-9) EN + VI
 *   Tier 2: `signals`        — concrete features the LLM must flag
 *   Tier 3: `suggestions`    — actionable upgrade paths band_N_to_N+1
 *   Tier 4: `promptBrief`    — compact rubric for LLM prompt injection
 *
 * Source: IELTS official band descriptors (public domain).
 * Vietnamese translations by Lingona — validated against common Vietnamese
 * IELTS teaching conventions.
 *
 * @module domain/ielts/rubrics
 */

// ════════════════════════════════════════════════════════════════
// WRITING — Task Response (Task 2) / Task Achievement (Task 1)
// ════════════════════════════════════════════════════════════════

/** @type {Readonly<Record<number, {en: string, vi: string}>>} */
const TA_DESCRIPTORS = Object.freeze({
  9: Object.freeze({
    en: 'Fully addresses all parts of the task with a fully developed position and relevant, extended, well-supported ideas.',
    vi: 'Trả lời đầy đủ mọi phần của đề, quan điểm rõ ràng xuyên suốt, ý tưởng được phát triển chi tiết và có dẫn chứng thuyết phục.',
  }),
  8: Object.freeze({
    en: 'Sufficiently addresses all parts of the task with a well-developed response and relevant, extended, supported ideas.',
    vi: 'Trả lời đủ mọi phần của đề, phản hồi được phát triển tốt, ý tưởng liên quan và có dẫn chứng.',
  }),
  7: Object.freeze({
    en: 'Addresses all parts of the task; presents a clear position throughout; main ideas are extended and supported, though some more fully than others.',
    vi: 'Trả lời đủ mọi phần của đề, thể hiện quan điểm rõ xuyên suốt, ý chính được phát triển nhưng độ chi tiết chưa đồng đều.',
  }),
  6: Object.freeze({
    en: 'Addresses the task although some parts may be more fully covered than others; presents a relevant position, though conclusions may be unclear or repetitive.',
    vi: 'Có trả lời đề nhưng một số phần chưa đầy đủ, có quan điểm liên quan nhưng kết luận chưa rõ hoặc lặp lại.',
  }),
  5: Object.freeze({
    en: 'Addresses the task only partially; format may be inappropriate in places; expresses a position but the development is not always clear.',
    vi: 'Chỉ trả lời đề một phần, có chỗ format chưa đúng, có thể hiện quan điểm nhưng phát triển chưa rõ.',
  }),
});

/** @type {readonly string[]} */
const TA_SIGNALS = Object.freeze([
  'all_task_parts_addressed',
  'clear_position_throughout',
  'position_stated_in_intro',
  'position_stated_in_conclusion',
  'relevant_supported_ideas',
  'extended_examples_given',
  'main_ideas_underdeveloped',
  'conclusion_unclear_or_repetitive',
  'task_partially_addressed',
  'off_topic_drift',
  'word_count_below_minimum',
  'generic_unsupported_claims',
]);

/** @type {Readonly<Record<string, readonly string[]>>} */
const TA_SUGGESTIONS = Object.freeze({
  '5_to_6': Object.freeze([
    'Đảm bảo trả lời đầy đủ cả 2 phần của đề (không bỏ sót)',
    'Mỗi đoạn thân bài cần 1 topic sentence nêu rõ ý chính',
    'Thêm ít nhất 1 ví dụ cụ thể cho mỗi ý chính',
  ]),
  '6_to_7': Object.freeze([
    'Phát triển mỗi ý chính bằng 2-3 câu: giải thích + ví dụ + tác động',
    'Kết luận nên paraphrase thesis, không lặp lại nguyên văn',
    'Thể hiện quan điểm rõ ngay câu đầu intro, không để người đọc đoán',
  ]),
  '7_to_8': Object.freeze([
    'Ví dụ nên extended: tình huống cụ thể + hệ quả + dẫn chứng số/tên',
    'Tránh over-generalization ("everyone knows", "it is common"): thay bằng evidence',
    'Đảm bảo support đồng đều cho tất cả ý chính, không chỉ 1 ý',
  ]),
  '8_to_9': Object.freeze([
    'Quan điểm phải nuanced: acknowledge counterargument rồi refute',
    'Ideas cần original insight, không repeat prompt',
    'Full development ở mọi paragraph, không chỉ body chính',
  ]),
});

const TA_PROMPT_BRIEF = `Task Response / Task Achievement (0-9):
- Band 7+: ALL task parts addressed, clear position throughout, main ideas extended with relevant support
- Band 6: task addressed BUT some parts underdeveloped OR conclusion weak/repetitive
- Band 5: task PARTIALLY addressed, position unclear, development weak
Weight task coverage and development over opinion quality or creativity.`;

// ════════════════════════════════════════════════════════════════
// WRITING — Coherence & Cohesion
// ════════════════════════════════════════════════════════════════

const CC_DESCRIPTORS = Object.freeze({
  9: Object.freeze({
    en: 'Uses cohesion in such a way that it attracts no attention. Skilfully manages paragraphing.',
    vi: 'Liên kết mượt mà không gây chú ý, quản lý đoạn văn khéo léo.',
  }),
  8: Object.freeze({
    en: 'Sequences information logically. Manages all aspects of cohesion well. Uses paragraphing sufficiently and appropriately.',
    vi: 'Sắp xếp thông tin logic, quản lý mọi khía cạnh liên kết tốt, chia đoạn đầy đủ và hợp lý.',
  }),
  7: Object.freeze({
    en: 'Logically organises information and ideas with clear progression throughout; uses a range of cohesive devices appropriately though there may be some under-/over-use.',
    vi: 'Tổ chức ý logic, progression rõ, dùng đa dạng cohesive devices nhưng đôi khi dùng thừa hoặc thiếu.',
  }),
  6: Object.freeze({
    en: 'Arranges information and ideas coherently and there is a clear overall progression; uses cohesive devices effectively but cohesion within/between sentences may be faulty.',
    vi: 'Sắp xếp ý mạch lạc có progression chung, dùng cohesive devices hiệu quả nhưng liên kết trong/giữa câu đôi khi sai.',
  }),
  5: Object.freeze({
    en: 'Presents information with some organisation but there may be a lack of overall progression; makes inadequate, inaccurate or over-use of cohesive devices.',
    vi: 'Có tổ chức ý nhưng thiếu progression tổng thể, dùng cohesive devices không đủ/sai/quá nhiều.',
  }),
});

const CC_SIGNALS = Object.freeze([
  'logical_paragraph_structure',
  'clear_topic_sentences',
  'varied_cohesive_devices',
  'smooth_paragraph_transitions',
  'pronoun_reference_clear',
  'mechanical_linker_use',
  'overuse_of_firstly_secondly',
  'sudden_topic_shift_between_paragraphs',
  'missing_paragraph_breaks',
  'paragraph_too_long_multiple_ideas',
  'referencing_errors',
  'no_clear_progression',
]);

const CC_SUGGESTIONS = Object.freeze({
  '5_to_6': Object.freeze([
    'Chia bài thành 4 đoạn rõ: intro, body 1, body 2, conclusion',
    'Mỗi đoạn có 1 topic sentence nêu ý chính ở câu đầu',
    'Dùng linking words cơ bản: however, moreover, therefore',
  ]),
  '6_to_7': Object.freeze([
    'Đa dạng linking: không chỉ "Firstly, Secondly" — dùng "One reason is", "Another factor"',
    'Câu nối giữa 2 đoạn nên reference ý đoạn trước',
    'Tránh repeat noun — dùng pronoun (this, these, the former) nhưng reference phải rõ',
  ]),
  '7_to_8': Object.freeze([
    'Progression phải có hierarchy: general → specific → example',
    'Dùng substitution và ellipsis thay vì lặp từ',
    'Tránh mechanical linkers ở đầu mọi câu',
  ]),
  '8_to_9': Object.freeze([
    'Cohesion phải invisible — đọc không thấy "linker đang kết nối"',
    'Paragraphing skilful: mỗi đoạn có unit of thought rõ ràng',
    'Inter-paragraph reference qua concept, không qua word-matching',
  ]),
});

const CC_PROMPT_BRIEF = `Coherence & Cohesion (0-9):
- Band 7+: clear progression, varied cohesive devices, paragraphing appropriate, minor under/overuse acceptable
- Band 6: coherent with clear progression BUT sentence-level cohesion faulty OR cohesive devices mechanical
- Band 5: some organization BUT no clear progression, linkers inadequate/inaccurate/overused
Judge cohesion as invisible linking (higher) vs mechanical linking (lower).`;

// ════════════════════════════════════════════════════════════════
// WRITING — Lexical Resource
// ════════════════════════════════════════════════════════════════

const LR_DESCRIPTORS = Object.freeze({
  9: Object.freeze({
    en: 'Uses a wide range of vocabulary with very natural and sophisticated control of lexical features; rare minor errors occur only as slips.',
    vi: 'Dùng từ vựng rộng, tự nhiên, tinh tế; lỗi nhỏ chỉ xuất hiện như slip của người bản xứ.',
  }),
  8: Object.freeze({
    en: 'Uses a wide range of vocabulary fluently and flexibly to convey precise meanings; skilfully uses uncommon lexical items; rare errors in word choice/collocation/spelling.',
    vi: 'Dùng từ vựng rộng linh hoạt, chính xác; sử dụng khéo léo từ ít gặp; lỗi word choice/collocation/spelling rất hiếm.',
  }),
  7: Object.freeze({
    en: 'Uses a sufficient range of vocabulary to allow some flexibility and precision; uses less common lexical items with some awareness of style and collocation; may produce occasional errors.',
    vi: 'Dùng đủ từ vựng để có linh hoạt và chính xác; có dùng từ ít gặp với ý thức về style/collocation; thỉnh thoảng sai.',
  }),
  6: Object.freeze({
    en: 'Uses an adequate range of vocabulary for the task; attempts to use less common vocabulary but with some inaccuracy; makes some errors in spelling and/or word formation but they do not impede communication.',
    vi: 'Dùng đủ từ vựng cho đề; có cố dùng từ ít gặp nhưng thiếu chính xác; có lỗi spelling/word form nhưng không gây hiểu lầm.',
  }),
  5: Object.freeze({
    en: 'Uses a limited range of vocabulary, but this is minimally adequate for the task; may make noticeable errors in spelling and/or word formation that may cause some difficulty for the reader.',
    vi: 'Từ vựng hạn chế nhưng tạm đủ dùng; lỗi spelling/word form rõ và có thể gây khó hiểu cho người đọc.',
  }),
});

const LR_SIGNALS = Object.freeze([
  'wide_lexical_range',
  'less_common_vocabulary_attempted',
  'collocation_accurate',
  'word_form_accurate',
  'spelling_accurate',
  'style_register_appropriate',
  'repetition_of_key_words',
  'word_choice_errors',
  'collocation_errors',
  'word_form_errors',
  'spelling_errors',
  'vocabulary_too_basic_for_band',
  'inappropriate_register',
]);

const LR_SUGGESTIONS = Object.freeze({
  '5_to_6': Object.freeze([
    'Tránh lặp từ — 1 từ key xuất hiện >3 lần thì thay bằng synonym',
    'Học word family: "develop → development → developmental → developed"',
    'Kiểm tra spelling các từ phổ biến trước khi submit',
  ]),
  '6_to_7': Object.freeze([
    'Bổ sung 3-5 less common words mỗi bài (thay vì chỉ basic vocab)',
    'Học collocations thay vì từ đơn: "make progress" chứ không "do progress"',
    'Chú ý register: không dùng contractions (don\'t, can\'t) trong academic writing',
  ]),
  '7_to_8': Object.freeze([
    'Dùng uncommon vocab 1 cách natural, không forced ("paradigm shift" phải đúng context)',
    'Precision: thay "bad" bằng "detrimental", "counterproductive", "harmful" tùy context',
    'Tránh direct translation từ tiếng Việt (ví dụ "open the light" → "turn on the light")',
  ]),
  '8_to_9': Object.freeze([
    'Lexical choice phải sophisticated: idioms, metaphors dùng đúng',
    'Collocation như native: "strong coffee" không "powerful coffee"',
    'Zero spelling errors, zero word form errors',
  ]),
});

const LR_PROMPT_BRIEF = `Lexical Resource (0-9):
- Band 7+: sufficient range, attempts less common words with style/collocation awareness, occasional errors OK
- Band 6: adequate range, attempts less common words but some inaccuracy, spelling/word-form errors don't impede meaning
- Band 5: limited but minimally adequate range, noticeable spelling/word-form errors causing reader difficulty
Do NOT penalize correctly-used basic vocabulary if range is demonstrated elsewhere.`;

// ════════════════════════════════════════════════════════════════
// WRITING — Grammatical Range & Accuracy
// ════════════════════════════════════════════════════════════════

const GRA_DESCRIPTORS = Object.freeze({
  9: Object.freeze({
    en: 'Uses a wide range of structures with full flexibility and accuracy; rare minor errors occur only as slips.',
    vi: 'Dùng đa dạng cấu trúc linh hoạt và chính xác; lỗi nhỏ hiếm gặp như slip.',
  }),
  8: Object.freeze({
    en: 'Uses a wide range of structures; the majority of sentences are error-free; makes only very occasional errors or inappropriacies.',
    vi: 'Đa dạng cấu trúc; đa số câu không lỗi; thỉnh thoảng có lỗi nhỏ hoặc không phù hợp.',
  }),
  7: Object.freeze({
    en: 'Uses a variety of complex structures; produces frequent error-free sentences; has good control of grammar and punctuation but may make a few errors.',
    vi: 'Dùng đa dạng câu phức; nhiều câu không lỗi; kiểm soát grammar/punctuation tốt nhưng vẫn sai vài chỗ.',
  }),
  6: Object.freeze({
    en: 'Uses a mix of simple and complex sentence forms; makes some errors in grammar and punctuation but they rarely reduce communication.',
    vi: 'Mix câu đơn và câu phức; có lỗi grammar/punctuation nhưng hiếm khi cản trở hiểu.',
  }),
  5: Object.freeze({
    en: 'Uses only a limited range of structures; attempts complex sentences but these tend to be less accurate than simple sentences; may make frequent grammatical errors and punctuation may be faulty; errors can cause some difficulty for the reader.',
    vi: 'Dùng cấu trúc hạn chế; có cố dùng câu phức nhưng kém chính xác hơn câu đơn; lỗi grammar thường xuyên, punctuation sai, có thể gây khó đọc.',
  }),
});

const GRA_SIGNALS = Object.freeze([
  'wide_structure_range',
  'complex_sentences_accurate',
  'conditional_structures_used',
  'passive_voice_appropriate',
  'punctuation_accurate',
  'article_errors',
  'subject_verb_agreement_errors',
  'tense_consistency_errors',
  'preposition_errors',
  'run_on_sentences',
  'fragment_sentences',
  'complex_sentences_attempted_but_inaccurate',
  'only_simple_sentences',
  'comma_splices',
]);

const GRA_SUGGESTIONS = Object.freeze({
  '5_to_6': Object.freeze([
    'Kiểm tra subject-verb agreement cẩn thận: "The number of students IS" not ARE',
    'Consistent tense: bài past thì past cả bài, trừ khi đổi time frame rõ ràng',
    'Thử 2-3 câu phức đơn giản mỗi đoạn (using "because", "although", "if")',
  ]),
  '6_to_7': Object.freeze([
    'Article (a/an/the) — check mỗi noun: countable singular phải có article',
    'Kết hợp câu đơn thành câu phức: "X happened. Then Y." → "After X happened, Y followed."',
    'Dùng relative clauses: "The student who passed" thay vì 2 câu riêng',
  ]),
  '7_to_8': Object.freeze([
    'Đa dạng cấu trúc: conditional (if/unless), participle clauses ("Having done X, Y..."), inversion',
    'Đa số câu phải error-free — đọc lại 2 lần trước submit',
    'Punctuation: dùng đúng comma trong dependent clauses, semicolon nối 2 independent clauses',
  ]),
  '8_to_9': Object.freeze([
    'Full flexibility — sophisticated structures không forced',
    'Lỗi chỉ như slip không như mistake',
    'Punctuation hoàn hảo, không comma splice, không run-on',
  ]),
});

const GRA_PROMPT_BRIEF = `Grammatical Range & Accuracy (0-9):
- Band 7+: variety of complex structures, FREQUENT error-free sentences, good punctuation, occasional errors OK
- Band 6: mix of simple + complex, some errors that rarely reduce communication
- Band 5: LIMITED range, complex sentences less accurate than simple, frequent errors causing reader difficulty
Weight accuracy AND range — neither alone gives band 7.`;

// ════════════════════════════════════════════════════════════════
// SPEAKING — Fluency & Coherence
// ════════════════════════════════════════════════════════════════

const FC_DESCRIPTORS = Object.freeze({
  9: Object.freeze({
    en: 'Speaks fluently with only rare repetition or self-correction; any hesitation is content-related; speaks coherently with fully appropriate cohesive features.',
    vi: 'Nói lưu loát, hiếm lặp/tự sửa; do dự chỉ vì nội dung; mạch lạc với cohesion hoàn toàn phù hợp.',
  }),
  8: Object.freeze({
    en: 'Speaks fluently with only occasional repetition or self-correction; hesitation is usually content-related; develops topics coherently and appropriately.',
    vi: 'Nói lưu loát, thỉnh thoảng lặp/tự sửa; do dự thường vì nội dung; phát triển ý mạch lạc.',
  }),
  7: Object.freeze({
    en: 'Speaks at length without noticeable effort or loss of coherence; may demonstrate language-related hesitation at times; uses a range of connectives and discourse markers.',
    vi: 'Nói dài không thấy gắng sức hay mất mạch lạc; đôi khi do dự do ngôn ngữ; dùng đa dạng connective/discourse marker.',
  }),
  6: Object.freeze({
    en: 'Is willing to speak at length, though may lose coherence at times due to occasional repetition, self-correction or hesitation; uses a range of connectives and discourse markers but not always appropriately.',
    vi: 'Sẵn sàng nói dài, đôi khi mất mạch lạc do lặp/sửa/do dự; dùng đa dạng connective nhưng không luôn phù hợp.',
  }),
  5: Object.freeze({
    en: 'Usually maintains flow of speech but uses repetition, self-correction and/or slow speech to keep going; may over-use certain connectives and discourse markers.',
    vi: 'Thường giữ được dòng nói nhưng dùng lặp/sửa/nói chậm để tiếp tục; có thể lạm dụng 1 số connective.',
  }),
});

const FC_SIGNALS = Object.freeze([
  'speaks_at_length_effortlessly',
  'natural_hesitation_content_related',
  'varied_discourse_markers',
  'smooth_topic_development',
  'language_related_hesitation',
  'frequent_self_correction',
  'repetition_to_maintain_flow',
  'slow_speech_to_think',
  'overuse_of_like_so_you_know',
  'coherence_breakdown',
  'short_abrupt_answers',
  'silence_gaps',
]);

const FC_SUGGESTIONS = Object.freeze({
  '5_to_6': Object.freeze([
    'Tránh dừng lâu — nếu không nhớ từ, paraphrase bằng từ đơn giản hơn',
    'Câu trả lời >= 2-3 câu cho Part 1, >= 1 phút cho Part 2',
    'Giảm filler "umm", "uhh" — thay bằng "Let me think" hoặc "That\'s interesting"',
  ]),
  '6_to_7': Object.freeze([
    'Mở rộng câu trả lời: answer + reason + example + personal detail',
    'Dùng discourse markers: "The thing is", "What I\'d say is", "Actually"',
    'Topic development natural: mỗi câu tiếp nối ý câu trước',
  ]),
  '7_to_8': Object.freeze([
    'Speaks at length mà không effort — không gắng suy nghĩ rồi nói',
    'Hesitation chỉ do nội dung (đang nghĩ về ý) không do từ vựng',
    'Đa dạng connective: "However, despite this, on the other hand, to illustrate"',
  ]),
  '8_to_9': Object.freeze([
    'Fluency như native — flow tự nhiên, cohesion invisible',
    'Development rich: examples, counter-points, nuance',
    'Zero filler overuse, zero mechanical markers',
  ]),
});

const FC_PROMPT_BRIEF = `Fluency & Coherence (0-9):
- Band 7+: speaks at length effortlessly, language-related hesitation occasional, range of markers
- Band 6: willing to speak at length BUT occasional coherence loss from repetition/self-correction
- Band 5: maintains flow BUT uses repetition/self-correction/slow speech AS STRATEGY to continue
Distinguish content-hesitation (higher) from language-hesitation (lower).`;

// ════════════════════════════════════════════════════════════════
// SPEAKING — Pronunciation
// ════════════════════════════════════════════════════════════════

const P_DESCRIPTORS = Object.freeze({
  9: Object.freeze({
    en: 'Uses a full range of pronunciation features with precision and subtlety; sustains flexible use of features throughout; is effortless to understand.',
    vi: 'Dùng đầy đủ đặc điểm phát âm chính xác và tinh tế; duy trì linh hoạt xuyên suốt; dễ hiểu không cần gắng.',
  }),
  8: Object.freeze({
    en: 'Uses a wide range of pronunciation features; sustains flexible use with only occasional lapses; is easy to understand throughout; L1 accent has minimal effect.',
    vi: 'Đa dạng đặc điểm phát âm; duy trì linh hoạt trừ thỉnh thoảng; dễ hiểu xuyên suốt; accent L1 ảnh hưởng nhỏ.',
  }),
  7: Object.freeze({
    en: 'Shows all the positive features of band 6 and some, but not all, of the positive features of band 8.',
    vi: 'Có mọi đặc điểm band 6 và một số (không hết) đặc điểm band 8.',
  }),
  6: Object.freeze({
    en: 'Uses a range of pronunciation features with mixed control; shows some effective use of features but this is not sustained; can generally be understood throughout, though mispronunciation of individual words or sounds reduces clarity at times.',
    vi: 'Có đa dạng đặc điểm phát âm với kiểm soát không đều; dùng hiệu quả 1 số nhưng không duy trì; nhìn chung hiểu được nhưng phát âm sai 1 số từ/âm giảm độ rõ đôi khi.',
  }),
  5: Object.freeze({
    en: 'Shows all the positive features of band 4 and some, but not all, of the positive features of band 6.',
    vi: 'Có đặc điểm band 4 và 1 số (không hết) đặc điểm band 6.',
  }),
});

const P_SIGNALS = Object.freeze([
  'intonation_varied_and_purposeful',
  'word_stress_accurate',
  'sentence_stress_effective',
  'individual_sounds_clear',
  'connected_speech_natural',
  'l1_accent_minimal',
  'mispronounced_individual_sounds',
  'word_stress_errors',
  'monotone_intonation',
  'l1_accent_heavy_strain',
  'unclear_consonants',
  'vowel_length_errors',
  'final_consonant_dropping',
]);

const P_SUGGESTIONS = Object.freeze({
  '5_to_6': Object.freeze([
    'Kiểm tra word stress khi học từ mới — học từ nào nhớ stress từ đó',
    'Phát âm đủ âm cuối: "walk" không "wok", "liked" không "like"',
    'Phân biệt /i:/ và /ɪ/: "sheep" vs "ship" — kéo dài /i:/',
  ]),
  '6_to_7': Object.freeze([
    'Sentence stress: nhấn content words (nouns, verbs), bỏ qua function words (a, the, of)',
    'Intonation rising ở câu hỏi yes/no, falling ở câu khẳng định',
    'Connected speech: "what are you" → "whaddayou", không tách rời',
  ]),
  '7_to_8': Object.freeze([
    'Đa dạng intonation cho purpose: sarcasm, emphasis, doubt',
    'Accent L1 gần như không nhận ra — luyện minimal pairs VN-EN',
    'Natural rhythm — không speak syllable-by-syllable',
  ]),
  '8_to_9': Object.freeze([
    'Precision + subtlety — intonation subtle, word choice natural',
    'Effortless to understand — người nghe không cần re-process',
    'Full flexibility across all features',
  ]),
});

const P_PROMPT_BRIEF = `Pronunciation (0-9):
- Band 7+: range of features used, easy to understand, L1 accent minimal effect
- Band 6: range of features WITH MIXED CONTROL, generally understandable, mispronunciation reduces clarity at times
- Band 5: some band 6 features present but not consistent
Score based on Azure Speech scores if available; otherwise estimate from transcript quality + typical VN pronunciation patterns.`;

// ════════════════════════════════════════════════════════════════
// CRITERIA REGISTRY
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Criterion
 * @property {string}                                          code         IELTS code (TA, CC, LR, GRA, FC, P)
 * @property {string}                                          nameEn       English name
 * @property {string}                                          nameVi       Vietnamese name
 * @property {Readonly<Record<number, {en: string, vi: string}>>} descriptors Band 5-9
 * @property {readonly string[]}                               signals      Whitelist of concrete signals
 * @property {Readonly<Record<string, readonly string[]>>}     suggestions  Keyed by band_to_band
 * @property {string}                                          promptBrief  Compact LLM prompt fragment
 */

/** @type {Readonly<Record<string, Criterion>>} */
const WRITING_CRITERIA = Object.freeze({
  TA: Object.freeze({
    code: 'TA',
    nameEn: 'Task Response',
    nameVi: 'Trả lời đề bài',
    descriptors: TA_DESCRIPTORS,
    signals: TA_SIGNALS,
    suggestions: TA_SUGGESTIONS,
    promptBrief: TA_PROMPT_BRIEF,
  }),
  CC: Object.freeze({
    code: 'CC',
    nameEn: 'Coherence & Cohesion',
    nameVi: 'Mạch lạc & Liên kết',
    descriptors: CC_DESCRIPTORS,
    signals: CC_SIGNALS,
    suggestions: CC_SUGGESTIONS,
    promptBrief: CC_PROMPT_BRIEF,
  }),
  LR: Object.freeze({
    code: 'LR',
    nameEn: 'Lexical Resource',
    nameVi: 'Từ vựng',
    descriptors: LR_DESCRIPTORS,
    signals: LR_SIGNALS,
    suggestions: LR_SUGGESTIONS,
    promptBrief: LR_PROMPT_BRIEF,
  }),
  GRA: Object.freeze({
    code: 'GRA',
    nameEn: 'Grammatical Range & Accuracy',
    nameVi: 'Ngữ pháp',
    descriptors: GRA_DESCRIPTORS,
    signals: GRA_SIGNALS,
    suggestions: GRA_SUGGESTIONS,
    promptBrief: GRA_PROMPT_BRIEF,
  }),
});

/** @type {Readonly<Record<string, Criterion>>} */
const SPEAKING_CRITERIA = Object.freeze({
  FC: Object.freeze({
    code: 'FC',
    nameEn: 'Fluency & Coherence',
    nameVi: 'Lưu loát & Mạch lạc',
    descriptors: FC_DESCRIPTORS,
    signals: FC_SIGNALS,
    suggestions: FC_SUGGESTIONS,
    promptBrief: FC_PROMPT_BRIEF,
  }),
  LR: Object.freeze({
    code: 'LR',
    nameEn: 'Lexical Resource',
    nameVi: 'Từ vựng',
    descriptors: LR_DESCRIPTORS, // reuse from Writing
    signals: LR_SIGNALS,
    suggestions: LR_SUGGESTIONS,
    promptBrief: LR_PROMPT_BRIEF,
  }),
  GR: Object.freeze({
    code: 'GR',
    nameEn: 'Grammatical Range & Accuracy',
    nameVi: 'Ngữ pháp',
    descriptors: GRA_DESCRIPTORS, // reuse
    signals: GRA_SIGNALS,
    suggestions: GRA_SUGGESTIONS,
    promptBrief: GRA_PROMPT_BRIEF,
  }),
  P: Object.freeze({
    code: 'P',
    nameEn: 'Pronunciation',
    nameVi: 'Phát âm',
    descriptors: P_DESCRIPTORS,
    signals: P_SIGNALS,
    suggestions: P_SUGGESTIONS,
    promptBrief: P_PROMPT_BRIEF,
  }),
});

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Returns all valid signal codes across all criteria.
 * Used by postProcessor to validate LLM output against the whitelist.
 *
 * @returns {Set<string>}
 */
function getAllValidSignals() {
  const all = new Set();
  for (const c of Object.values(WRITING_CRITERIA)) c.signals.forEach((s) => all.add(s));
  for (const c of Object.values(SPEAKING_CRITERIA)) c.signals.forEach((s) => all.add(s));
  return all;
}

/**
 * Returns the suggestion list for a given criterion and band transition.
 * Returns [] if no matching suggestion found.
 *
 * @param {Criterion} criterion
 * @param {number}    band Current band (will select band_to_band+1 path)
 * @returns {readonly string[]}
 */
function getSuggestionsForBand(criterion, band) {
  const rounded = Math.floor(band);
  const key = `${rounded}_to_${rounded + 1}`;
  return criterion.suggestions[key] || [];
}

module.exports = {
  WRITING_CRITERIA,
  SPEAKING_CRITERIA,
  getAllValidSignals,
  getSuggestionsForBand,
};
