# LINGONA COMPLETE AUDIT — 6 SESSION PROMPTS
# Bỏ 4 files vào docs/audit/ rồi copy-paste từng session vào Claude Code.

═══════════════════════════════════════════════════════════════
SESSION 1: DATA COLLECTION (Phần 0)
═══════════════════════════════════════════════════════════════

Đọc các files theo thứ tự sau TRƯỚC KHI làm bất cứ thứ gì:

1. Đọc /mnt/skills/public/frontend-design/SKILL.md
2. Đọc .claude/skills/audit/SKILL.md
3. Đọc .claude/skills/ui-ux-pro-max/SKILL.md
4. Đọc .claude/skills/critique/SKILL.md
5. Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — đây là hiến pháp của Lingona, ghi nhớ mọi nguyên tắc.

Sau đó thực hiện PHẦN 0: RECONNAISSANCE từ file docs/audit/LINGONA_AUDIT_V3_BRAIN_AUDIT.md.
Chạy TẤT CẢ commands từ 0.1 đến 0.30.

Rồi chạy thêm commands bổ sung từ 0.31 đến 0.48 trong file docs/audit/LINGONA_AUDIT_V3_EXECUTION_GUIDE.md.

Sau khi có data, chạy Playwright screenshot script từ Execution Guide:
- Chụp mọi page × 6 viewports (375, 390, 430, 768, 1280, 1440px)
- Chụp competitor screenshots (Duolingo, Elsa Speak, Grammarly)
- Lưu vào /tmp/audit/

Lưu toàn bộ command output vào /tmp/audit-data.md.

KHÔNG đánh giá. KHÔNG nhận xét. KHÔNG audit. Chỉ THU THẬP DATA và chụp screenshots.
Khi xong, nói "Data collection hoàn tất" và liệt kê tổng số screenshots đã chụp + tổng dòng data đã thu thập.


═══════════════════════════════════════════════════════════════
SESSION 2: VISUAL & PSYCHOLOGY AUDIT (Phần 1-3)
═══════════════════════════════════════════════════════════════

Đọc các files theo thứ tự:

1. Đọc /mnt/skills/public/frontend-design/SKILL.md
2. Đọc .claude/skills/delight/SKILL.md
3. Đọc .claude/skills/clarify/SKILL.md
4. Đọc .claude/skills/baseline-ui/SKILL.md
5. Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — mọi đánh giá phải qua Soul Filter.
6. Đọc file /tmp/audit-data.md — đây là baseline data từ Session 1.

Bây giờ thực hiện audit từ file docs/audit/LINGONA_AUDIT_V3_BRAIN_AUDIT.md:

PHẦN 1: VISCERAL RESPONSE — 3 GIÂY ĐẦU TIÊN
- Mở screenshots trong /tmp/audit/ để đánh giá visual thực tế
- KHÔNG đoán từ code. NHÌN screenshots.
- So sánh với competitor screenshots trong /tmp/audit/competitors/

PHẦN 2: BEHAVIORAL DESIGN — HABIT FORMATION
- Hook Model, Fogg Behavior Model, Variable Rewards
- Đếm actual taps, actual choices, actual friction points
- Tham chiếu Soul Filter: mọi gamification phải qua "Doraemon test"

PHẦN 3: COGNITIVE PSYCHOLOGY — BRAIN PROCESSING
- Gestalt, Fitts's Law, Hick's Law, Miller's Law
- Đo actual pixel sizes, đếm actual information groups per screen
- Dùng screenshots để annotate visual hierarchy

Mỗi issue phải có format đầy đủ:
```
### [🔴|🟡|🟢|💡] [CATEGORY] > [SUBCATEGORY]
**Lens**: 🧠 Behavioral | 🔬 UX Research | 💰 Growth | 🎨 Design
**Soul Check**: ✅ Aligned | ⚠️ Partially | 🔴 Conflicts → [câu hỏi nào fail?]
**Lintopus**: Present? Correct tone? Correct moment?
**File**: `src/path/file.tsx:42`
**Issue**: [MÔ TẢ CỤ THỂ]
**Psychology**: [TẠI SAO đây là vấn đề theo tâm lý học]
**Current**: [CODE/BEHAVIOR HIỆN TẠI — paste actual code]
**Current copy**: [TEXT HIỆN TẠI nếu liên quan]
**Should be**: [CODE/BEHAVIOR NÊN CÓ]
**Soul-aligned copy**: [TEXT NÊN CÓ theo Micro-Copy Bible trong Soul Audit]
**Effort**: XS (<15m) | S (<1h) | M (<4h) | L (<1d) | XL (>1d)
**Impact**: [CỤ THỂ ảnh hưởng gì đến user behavior/metrics]
**AI Smell**: 🟢 | 🟡 | 🔴
**Safari**: ✅ | ⚠️ | 🔴
```

Output toàn bộ report vào /tmp/audit-report-visual.md.
Không skip. Không nói "looks good" mà không có evidence. Paste code, đo pixels, đếm numbers.


═══════════════════════════════════════════════════════════════
SESSION 3: GROWTH & MOBILE SAFARI AUDIT (Phần 4-5)
═══════════════════════════════════════════════════════════════

Đọc các files theo thứ tự:

1. Đọc /mnt/skills/public/frontend-design/SKILL.md
2. Đọc .claude/skills/adapt/SKILL.md
3. Đọc .claude/skills/optimize/SKILL.md
4. Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — đặc biệt phần IV (Soul Decisions về monetization, battle gate, paywall copy).
5. Đọc file /tmp/audit-data.md — baseline data.

Thực hiện audit từ file docs/audit/LINGONA_AUDIT_V3_BRAIN_AUDIT.md:

PHẦN 4: GROWTH FRAMEWORK — AARRR FUNNEL
- Acquisition: SEO readiness, social sharing preview, referral mechanism
- Activation: "Aha moment" definition, time to aha, onboarding quality
- Retention: D1/D7/D30 mechanisms, habit loop completeness, session design
- Revenue: Paywall trigger points, pricing psychology, upgrade prompts
  QUAN TRỌNG: Paywall copy phải theo Soul Audit — thẳng thắn, không thao túng:
  "Hết lượt cho hôm nay rồi! Nếu bạn thấy app thật sự giúp ích, cùng mình đi tới Pro nhé! Mách nhỏ: rẻ hơn trung tâm ngoài kia nhiều lắm 😉"
- Referral: Viral features, K-factor estimate, network effects

PHẦN 5: MOBILE SAFARI — THE NIGHTMARE BROWSER
- Chạy mọi check: 100vh, input zoom, safe area, position fixed + keyboard, rubber band, tap highlight
- Mỗi issue phải ghi file path + line number + actual code
- Test với screenshots viewport 375px và 390px
- Check PWA manifest, apple-touch-icon, theme-color

Dùng cùng format issue như Session 2.
Output toàn bộ report vào /tmp/audit-report-growth.md.


═══════════════════════════════════════════════════════════════
SESSION 4: DESIGN SYSTEM AUDIT (Phần 6-9)
═══════════════════════════════════════════════════════════════

Đọc các files theo thứ tự:

1. Đọc /mnt/skills/public/frontend-design/SKILL.md
2. Đọc .claude/skills/typeset/SKILL.md
3. Đọc .claude/skills/colorize/SKILL.md
4. Đọc .claude/skills/layout/SKILL.md
5. Đọc .claude/skills/animate/SKILL.md
6. Đọc .claude/skills/bolder/SKILL.md
7. Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — đặc biệt phần V (Micro-Copy Bible, giọng Lintopus).
8. Đọc file /tmp/audit-data.md — baseline data, đặc biệt color/font/spacing/radius/shadow/animation counts.

Thực hiện audit từ file docs/audit/LINGONA_AUDIT_V3_BRAIN_AUDIT.md:

PHẦN 6: TYPOGRAPHY — PHÂN BIỆT HUMAN VS AI
- Font DNA: Inter? system-ui? DM Sans? Playfair Display?
- Type scale: mathematical ratio hay random?
- Optical adjustments: letter-spacing, line-height per context, font-weight nuance
- Vietnamese diacritics rendering
- Mobile font sizes (≥16px body NON-NEGOTIABLE)
- Dùng data từ 0.3, 0.8 để verify — KHÔNG đoán

PHẦN 7: COLOR PSYCHOLOGY & SYSTEM
- Color inventory: total unique, hardcoded vs tokenized, Tailwind defaults raw
- Brand application consistency: navy, teal đúng chỗ?
- Contrast WCAG AA: MỌI text/background combo
- Dark mode status (known bug: sidebar losing dark theme)
- Dùng data từ 0.4, 0.5, 0.6 để verify

PHẦN 8: COMPONENT SYSTEM — PIXEL LEVEL
- Design tokens: border-radius, shadows, z-index consistency
- Icon system: single library? consistent sizes? consistent style?
- Button system: every state (hover, active, focus, disabled, loading)
- Form system: input height, focus state, error state
- Dùng data từ 0.9, 0.10, 0.11, 0.13

PHẦN 9: ANIMATION & DELIGHT — THE EMOTION LAYER
- Peak moments: correct answer, achievement, battle win — có celebration không?
- Peak-End Rule: session end experience
- Sound design: có sound files không? (check 0.28 data)
- Transition quality: duration consistency
- Skeleton loaders: present? shaped correctly? shimmer?
- Dùng data từ 0.12

Dùng cùng format issue như Session 2.
Output toàn bộ report vào /tmp/audit-report-design.md.


═══════════════════════════════════════════════════════════════
SESSION 5: QUALITY & POLISH AUDIT (Phần 10-18)
═══════════════════════════════════════════════════════════════

Đọc các files theo thứ tự:

1. Đọc /mnt/skills/public/frontend-design/SKILL.md
2. Đọc .claude/skills/impeccable/SKILL.md
3. Đọc .claude/skills/polish/SKILL.md
4. Đọc .claude/skills/harden/SKILL.md
5. Đọc .claude/skills/fixing-accessibility/SKILL.md
6. Đọc .claude/skills/fixing-metadata/SKILL.md
7. Đọc .claude/skills/fixing-motion-performance/SKILL.md
8. Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — đặc biệt Soul Filter cho empty states và error states.
9. Đọc file /tmp/audit-data.md — baseline data.

Thực hiện audit từ file docs/audit/LINGONA_AUDIT_V3_BRAIN_AUDIT.md:

PHẦN 10: EMPTY, ERROR & EDGE STATES
- Empty state inventory: MỌI screen với dynamic content
- Mỗi empty state: có illustration? CTA? Lintopus personality?
- Error states: 404, 500, API errors, network errors — custom design?
- Edge cases: text overflow, long names, extreme scores, rapid clicks
- Soul check: empty/error states có Lintopus không? Có motivated empathy không?

PHẦN 11: PERFORMANCE — VIETNAM NETWORK REALITY
- Bundle analysis: total JS, largest chunks
- Image optimization: next/image usage, formats, sizes
- 3G simulation: time to interactive
- Perceived performance: optimistic updates, prefetching

PHẦN 12: SECURITY & CODE QUALITY
- Exposed secrets scan
- AI smell code patterns: console.log, any types, eslint-disable, TODO, obvious comments
- Component health: files > 300/500 lines
- Dead code detection
- Dùng data từ 0.14, 0.15, 0.16, 0.17, 0.18, 0.19

PHẦN 13: SEO & SOCIAL SHARING
- Technical SEO: titles, descriptions, sitemap, robots.txt
- OG tags: per page? Image quality? Facebook/Zalo preview test
- Share-worthy moments: share cards, viral features

PHẦN 14: ACCESSIBILITY
- Alt text, form labels, focus order, keyboard nav
- Screen reader heading hierarchy
- Reduced motion preference

PHẦN 15: CROSS-PAGE CONSISTENCY
- Pick 5 pages: Landing, Dashboard, Reading, Battle, Profile
- Compare: heading, button, card, spacing, background, icon — EVERYTHING must match
- Fill comparison table

PHẦN 16: VISUAL IDENTITY
- Illustration style consistency: Lintopus vs other illustrations
- Brand application across all visual elements

PHẦN 17: VIETNAM-SPECIFIC UX
- Social login (Facebook, Zalo, phone number)
- Payment methods (MoMo, ZaloPay, bank QR)
- Vietnamese language quality: natural tone, gen Z, not Google Translate
- Formats: currency (179.000đ), date (DD/MM/YYYY), numbers (dot thousands separator)

PHẦN 18: "NOT AI" FINAL TEST
- AI Smell Composite Score /30 (calculate from all data)
- List every AI tell found across entire audit

Dùng cùng format issue như Session 2.
Output toàn bộ report vào /tmp/audit-report-quality.md.


═══════════════════════════════════════════════════════════════
SESSION 6: FINAL SCORING & PRIORITY (Tổng hợp)
═══════════════════════════════════════════════════════════════

Đọc các files theo thứ tự:

1. Đọc .claude/skills/overdrive/SKILL.md
2. Đọc .claude/skills/critique/SKILL.md
3. Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — phần VII (scoring) và phần VIII (Steve Jobs Test).

Đọc 4 audit reports:
- /tmp/audit-report-visual.md
- /tmp/audit-report-growth.md
- /tmp/audit-report-design.md
- /tmp/audit-report-quality.md

Tổng hợp thành FINAL REPORT với các phần sau:

### PHẦN A: EXECUTIVE SUMMARY
- Tóm tắt 5 dòng: app đang ở đâu, cần gì nhất, bao lâu để fix

### PHẦN B: SCORING TABLE (/230)

| # | Category | Score (/10) | Evidence Summary |
|---|----------|-------------|------------------|
| 1 | Visceral Response (3-second test) | | |
| 2 | Behavioral Design (habit hooks) | | |
| 3 | Cognitive Psychology (load, laws) | | |
| 4 | Growth Funnel (AARRR) | | |
| 5 | Mobile Safari Compatibility | | |
| 6 | Typography | | |
| 7 | Color System | | |
| 8 | Component System | | |
| 9 | Animation & Delight | | |
| 10 | Empty/Error/Edge States | | |
| 11 | IELTS-Specific UX | | |
| 12 | Performance | | |
| 13 | Security & Code Quality | | |
| 14 | SEO & Social Sharing | | |
| 15 | Accessibility | | |
| 16 | Cross-Page Consistency | | |
| 17 | Visual Identity | | |
| 18 | Vietnam-Specific UX | | |
| 19 | "Not AI" Score (inverted: 10 = human) | | |
| 20 | Soul Alignment | | |
| 21 | Lintopus Presence & Quality | | |
| 22 | Micro-Copy Voice Consistency | | |
| 23 | Motivated Empathy | | |
| | **TOTAL** | **/230** | |

Grading:
- 207-230 (90%+): S-Tier — Sản phẩm có soul. Ship with pride.
- 184-206 (80-89%): A-Tier — Soul rõ, cần polish.
- 161-183 (70-79%): B-Tier — Soul mờ nhạt ở một số nơi.
- 138-160 (60-69%): C-Tier — Features đúng nhưng thiếu soul.
- < 138 (<60%): D-Tier — App chưa có linh hồn.

### PHẦN C: AI SMELL COMPOSITE SCORE (/30)
Tính điểm theo bảng trong docs/audit/LINGONA_AUDIT_V3_BRAIN_AUDIT.md Phần 18. Liệt kê từng item.

### PHẦN D: SOUL FILTER RESULTS
Fill bảng Soul Filter từ docs/audit/LINGONA_SOUL_AUDIT_FINAL.md phần VI cho MỌI feature.
Liệt kê features 🔴 Conflicts with Soul → redesign proposals.

### PHẦN E: PRIORITY FIX LIST

**Tier 0 — FIX TRƯỚC MỌI THỨ (blocks launch):**
- Safari-breaking bugs
- Security issues
- Broken core flows

**Tier 1 — FIX TRƯỚC LAUNCH (1-2 tuần):**
- "Obviously AI" items (AI Score > 10)
- Soul-conflicting features (redesign per Soul Audit)
- Empty states cho core screens
- Typography overhaul nếu dùng defaults
- Paywall copy theo Soul Audit

**Tier 2 — FIX CHO GROWTH (post-launch sprint):**
- Lintopus presence system (positive + help moments)
- Push notifications / triggers
- Share cards cho viral moments
- Sound design
- Social login (Facebook/Zalo)

**Tier 3 — CONTINUOUS IMPROVEMENT:**
- Advanced behavioral design
- Full accessibility
- Performance 3G optimization
- SEO content strategy
- Referral system

Mỗi item trong fix list phải có:
- Effort estimate (XS/S/M/L/XL)
- Impact level
- File(s) affected
- Người/tool thực hiện (Claude Code, manual, third-party)

### PHẦN F: STEVE JOBS TEST
Trả lời 3 câu hỏi:
1. "Does it have taste?" — evidence-based answer
2. "What would you REMOVE?" — list 5 features/elements nên bỏ
3. "Is this the BEST it can be?" — honest assessment

### PHẦN G: TOTAL EFFORT ESTIMATE
- Tier 0: _____ giờ
- Tier 1: _____ giờ
- Tier 2: _____ giờ
- Tier 3: _____ giờ
- Total: _____ giờ
- Với tốc độ Claude Code: _____ ngày estimated

### PHẦN H: RECOMMENDED 2-WEEK SPRINT PLAN (trước launch July 9)
- Week 1: [cụ thể tasks, files, estimates]
- Week 2: [cụ thể tasks, files, estimates]

Output: /tmp/LINGONA_FINAL_AUDIT_REPORT.md

Đây là report cuối cùng. Phải comprehensive, honest, actionable.
Cho điểm HARSH nhưng FAIR. Evidence cho mọi score.
Audit như thể reputation của bạn phụ thuộc vào nó. Vì nó đúng như vậy.
