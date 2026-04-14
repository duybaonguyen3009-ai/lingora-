# LINGONA SOUL AUDIT — FINAL
# Dùng kèm với V3 Brain Audit. File này đọc TRƯỚC V3.
# Mọi đánh giá trong V3 phải qua Soul Filter trong file này.

# ═══════════════════════════════════════════════════════════════
# Tài liệu này là kết quả của phiên debate giữa CEO Louis 
# và 4 lens (Behavioral Designer, UX Researcher, Growth PM, 
# Product Designer), được sàng lọc qua triết lý của Steve Jobs, 
# Don Norman, Dieter Rams, Marcus Aurelius.
#
# Không phải checklist. Đây là HIẾN PHÁP của Lingona.
# Mọi feature, mọi pixel, mọi dòng chữ phải tuân theo.
# ═══════════════════════════════════════════════════════════════

---

## I. LINH HỒN CỦA LINGONA

### Niềm tin cốt lõi:
> "Bất kỳ ai muốn học ngoại ngữ đều được tiếp cận dễ dàng, 
> không bị lạc hướng. Khi cảm thấy lạc lối, Lingona là bạn 
> đồng hành đưa ra lời khuyên chân thật."

### Cảm xúc khi MỞ app: **ORIENTED**
> "Tôi biết mình đang ở đâu, và tôi biết bước tiếp theo."

### Cảm xúc khi ĐÓNG app: **IMPROVEMENT**
> "Hôm nay tôi tốt hơn hôm qua, dù chỉ một chút."

### Lingona là ai:
> Người bạn học giỏi nhất lớp — không khoe khoang, không phán xét,
> chỉ vui khi thấy bạn mình tiến bộ. Hỏi gì cũng trả lời,
> sai cũng không chê, chỉ chỉ cách đúng rồi cùng cười.

### Nguyên tắc cốt lõi: MOTIVATED EMPATHY
> Không phải empathy kiểu "tội nghiệp bạn, từ từ thôi."
> Mà empathy kiểu "tôi hiểu bạn, VÌ hiểu nên tôi sẽ đẩy bạn đi đúng hướng."
> Cuộc sống không dễ dàng. Sẽ luôn có khó khăn. 
> Lingona không giấu user khỏi khó khăn.
> Lingona đảm bảo user không đối mặt khó khăn MỘT MÌNH.

---

## II. LINTOPUS — DORAEMON CỦA LINGONA

### Bản chất:
- Doraemon, không phải Clippy.
- Người bạn giỏi toàn diện. 
- Xúc tu = nhiều kỹ năng, nhiều công cụ, tất cả để giúp user.
- Tính cách: thân thiện, helpful, thẳng thắn, không phán xét, luôn có giải pháp.

### Doraemon vs Clippy — Sự khác biệt sống còn:
| | Clippy ❌ | Doraemon (Lintopus) ✅ |
|---|----------|----------------------|
| Timing | Xuất hiện random, sai lúc | Context-aware, đúng lúc |
| Dismiss | Khó đuổi đi | Tap anywhere = biến mất |
| Usefulness | "Bạn cần giúp không?" (generic) | "Mình nghĩ bạn cần cái này" (specific) |
| Knowledge | Không biết user đang làm gì | Biết screen, biết context, biết level |
| Feeling | Annoying → "đi đi" | Comforting → "cảm ơn bạn" |

### Lintopus xuất hiện KHI NÀO:

**70% — Positive moments (user associate Lintopus với niềm vui TRƯỚC):**
- Login ngày mới → vẫy tay "Chào buổi sáng! 🐙"
- Hoàn thành bài → vỗ tay celebration
- Đúng 5 câu liên tiếp → "Ủa giỏi dữ! 🐙"
- Streak milestone → celebration dance
- Rank up → party animation
- Band score tăng → "Tiến bộ rồi nè! 🐙"

**30% — Help moments (chỉ khi THỰC SỰ stuck):**
- Trigger: user ở screen quá lâu + KHÔNG có interaction (no tap, no scroll)
- Thời gian trigger KHÁC NHAU theo screen:
  | Screen | Threshold (no interaction) | Lintopus nói |
  |--------|--------------------------|--------------|
  | Chọn bài practice | 20-30 giây | "Mình gợi ý bài này cho level bạn nhé!" |
  | Dashboard (first time) | 10-15 giây | "Bạn có cảm thấy choáng ngợp không? Để mình giúp bạn từng bước nhé!" |
  | Dashboard (returning) | 45-60 giây | "Hôm nay mình luyện [skill yếu nhất] nhé?" |
  | Giữa quiz | 30-45 giây | "Mẹo: đọc lại đoạn 2, câu trả lời ở đó 🐙" |
  | Settings | 60 giây | "Bạn đang tìm gì? Mình giúp nhé!" |
  | Pro/Pricing page | 45 giây | "Bạn có thể dùng Free thoải mái, Pro chỉ thêm tính năng thôi!" |
  | Battle matchmaking | 30 giây (nếu không tìm được match) | "Chưa tìm được đối thủ. Luyện với mình trước nhé!" |

### Lintopus dismiss behavior:
- User tap BẤT KỲ ĐÂU khác trên screen → Lintopus biến mất NGAY
- Không hỏi lại, không confirm
- Nhớ user đã dismiss → lần sau ở screen tương tự, threshold × 2
- Không bao giờ xuất hiện > 2 lần trong 1 session (trừ positive moments)

### Lintopus expression:
- **Text bubble + Animation** kết hợp
- Text bubble: ngắn gọn, 1-2 câu max, tiếng Việt tự nhiên
- Animation: nhỏ, subtle, không che content chính
- Vị trí: bottom-right (không conflict với BottomNav), nhỏ, ló đầu ra từ edge
- Positive moments: có thể ở center screen (overlay nhẹ, auto-dismiss 2-3 giây)

---

## III. SOUL FILTER — 5 CÂU HỎI

> Mỗi feature, mỗi screen, mỗi dòng text, mỗi animation phải qua 5 câu hỏi.
> Trả lời "không" bất kỳ câu nào → redesign hoặc remove.

### Câu 1: "Doraemon có làm thế không?"
Doraemon giúp Nobita đối mặt thử thách, KHÔNG giấu Nobita khỏi thử thách.
Doraemon đưa bảo bối phù hợp, KHÔNG làm thay Nobita.
Doraemon vui khi Nobita tiến bộ, KHÔNG phán xét khi Nobita sai.

### Câu 2: "User có cảm thấy ORIENTED không?"
Sau interaction này, user có biết bước tiếp theo không?
Nếu confused → Lintopus có xuất hiện với gợi ý CỤ THỂ không?

### Câu 3: "User có cảm thấy IMPROVEMENT không?"
Dù nhỏ — user có cảm giác "mình vừa tốt hơn" không?
Progress có visible không? Improvement có được celebrate không?

### Câu 4: "Feature này có MOTIVATED EMPATHY không?"
Có thấu hiểu user NHƯNG CŨNG đẩy user tiến lên không?
Không coddle. Không né khó khăn. Nhưng luôn đi cùng.

### Câu 5: "Nếu bỏ feature này, app có mất soul không?"
Feature vì USER CẦN hay vì FOUNDER MUỐN? Thành thật.

---

## IV. SOUL DECISIONS — ĐÃ THỐNG NHẤT

### 4.1 Battle Arena ✅ GIỮ
- **Lý do giữ**: Cạnh tranh có vẻ đẹp riêng. Giúp hiểu vì sao phải cố gắng. 
  Giúp thấy người khác cũng phải nỗ lực để đạt được mục tiêu.
  User cần thành tựu để tự hào — không thể là Nobita ngốc ngếch mãi.
- **Gate**: Phải hoàn thành 5 bài practice trước khi unlock Battle.
  - Lý do: user có baseline skill, quen app, cảm giác EARN quyền battle
  - Endowed progress + IKEA effect: "Mình đã đủ giỏi để thử sức rồi!"
- **Matchmaking**: ĐẤU ĐỒNG HẠNG. Band 4.0 chỉ gặp Band 4.0 (±0.5).
  - Nếu không có đối thủ đồng hạng → đấu Lintopus bot
- **Soul compliance**: Lintopus có mặt ở MỌI kết quả battle
  - Thắng: "Tuyệt vời! Bạn đã tiến bộ nhiều! 🐙🎉"
  - Thua: "Trận này khó nhỉ! Mình xem lại mấy câu sai nhé 🐙" (+ analysis)
  - Không bao giờ: "Bạn thua rồi." (không có text negative đứng một mình)

### 4.2 Lintopus Bot Battle ✅ MỚI
- Bot chơi ở level **flow state**: hơi khó hơn khả năng user một chút
- User thắng sát nút → "wow mình giỏi hơn mình tưởng" → dopamine → quay lại
- Bot difficulty auto-adjust theo performance history
- Bot KHÔNG cố tình thua dễ dàng (user sẽ nhận ra) — mà calibrate để trận đấu SÁT NÚT
- Bot personality: Lintopus playful, đôi khi comment "Ồ câu này khó, mình cũng suýt sai! 🐙"

### 4.3 Ranking System ✅ GIỮ (nhưng adjust)
- Rank names: GIỮ Iron → Challenger HOẶC đổi sang journey-based
  - Nếu giữ game terms: phải có Lintopus variant mỗi rank (visual identity)
  - Nếu journey-based: "Người Bắt Đầu" → "Người Khám Phá" → "Người Tự Tin" → ...
  - **Decision**: CEO quyết định. Cả 2 đều pass Soul Filter nếu có Lintopus companion.
- Rank KHÔNG chỉ dựa trên win/lose — kết hợp effort (bài đã practice, streaks)
- Lintopus đứng cạnh mọi rank display
- Rank up → celebration moment với Lintopus

### 4.4 Leaderboard ✅ GIỮ (nhưng gate)
- Gate: unlock sau vài ngày + vài bài practice (cùng logic battle gate)
- Có thể show friends-only leaderboard trước → global leaderboard sau
- IMPROVEMENT leaderboard option: "ai tiến bộ nhiều nhất tuần này"

### 4.5 Streak System ✅ GIỮ (nhưng reframe)
- Giữ streak counting
- KHÔNG guilt-trip khi mất streak
- Break streak → Lintopus: "Không sao! Hôm nay mình bắt đầu lại nhé 🐙"
- Streak freeze tự động (1 ngày tha)
- Kết hợp TOTAL DAYS practiced (cumulative, không bao giờ giảm)
- "Bạn đã luyện tổng cộng 47 ngày!" luôn hiện bên cạnh streak

### 4.6 Band Score Display ✅ GIỮ (nhưng redesign)
- Band score hiện với neutral color (navy/teal), KHÔNG BAO GIỜ màu đỏ cho band thấp
- Lintopus LUÔN đứng cạnh band score
  - Band 4.0: Lintopus ở bên cạnh — "Có mình ở đây, mình sẽ giúp bạn 🐙"
  - Band 7.0+: Lintopus celebration — "Tuyệt vời! 🐙🎉"
- Luôn kèm: "Để cải thiện, tập trung vào [cụ thể]"
- Celebrate PROGRESS: "Band 5.0 → 5.5! Tăng 0.5 trong 2 tuần! 🎉"

### 4.7 Daily Limits + Paywall ✅ GIỮ (nhưng THẲNG THẮN)
> Gen Z ghét bị thao túng. Họ tôn trọng sự thẳng thắn.

- **Khi hit limit, Lintopus nói THẲNG:**
  > "Hết lượt cho hôm nay rồi! 🐙
  > Nếu bạn thấy app thật sự giúp ích cho bạn, 
  > thì bạn hãy cùng mình đi tới Pro, chúng ta luyện tiếp nhé!
  > Mách nhỏ: rẻ hơn trung tâm ngoài kia nhiều lắm 😉"

- **KHÔNG BAO GIỜ**:
  - "Nghỉ ngơi nhé!" (nói dối — user muốn luyện, app đang block)
  - "Nâng cấp để tiếp tục" (lạnh, transactional)
  - "Bạn đã dùng hết lượt miễn phí" (corporate, không personality)

- **Key principle**: HONEST + FRIENDLY + VALUE PROP
  - Honest: "hết lượt rồi" (sự thật)
  - Friendly: "cùng mình đi tới Pro" (companion language)
  - Value prop: "rẻ hơn trung tâm" (real benefit, not manipulation)

### 4.8 First-Time User Experience ✅ MỚI
- Lintopus chào hỏi NGAY khi mở app lần đầu:
  > "Chào bạn! Mình là Lintopus 🐙
  > Bạn có cảm thấy choáng ngợp khi bắt đầu học tiếng Anh không?
  > Không sao, để mình giúp bạn từng bước nhé!"
- Motivated empathy: acknowledge nỗi sợ → đưa giải pháp ngay
- Onboarding = Lintopus DẪN user qua từng bước, không phải form điền
- Mỗi screen onboarding = 1 câu hỏi + Lintopus phản hồi personal

---

## V. MICRO-COPY BIBLE — GIỌNG NÓI CỦA LINTOPUS

### Voice Principles:
1. **Thẳng thắn, không thao túng**: nói sự thật, không tô hồng, không guilt-trip
2. **Warm, không formal**: "Bạn ơi" không "Người dùng thân mến"
3. **Encouraging khi khó, celebrating khi thắng**: motivated empathy
4. **Simple, không academic**: "Nói chậm hơn" không "Cải thiện fluency"
5. **Vietnamese gen Z natural**: casual, friendly, emoji vừa phải

### Complete Voice Guide by Context:

**🟢 CORRECT ANSWER:**
- ❌ "Correct! +10 XP"
- ❌ "Đúng rồi."
- ✅ "Đúng rồi! Bạn nhớ tốt lắm 🐙"
- ✅ "Chính xác! Cái này nhiều người hay nhầm lắm đó"
- ✅ (streak 5 đúng liên tiếp): "5 câu liên tiếp! Ủa giỏi dữ 🐙🔥"

**🔴 WRONG ANSWER:**
- ❌ "Wrong. The correct answer is B."
- ❌ "Sai rồi."
- ✅ "Chưa đúng — đáp án là B. Vì [lý do ngắn]. Lần sau bạn sẽ nhớ! 🐙"
- ✅ "Gần rồi! Mẹo nhớ: [mẹo]. Mình đánh dấu bài này để ôn lại nhé!"
- Key: LUÔN có lý do + LUÔN có hướng tiếp theo

**🔥 STREAK:**
- Maintained: "7 ngày liên tục! Bạn kiên trì ghê 🐙🔥"
- Broken: "Hôm qua bận quá nhỉ? Không sao! Hôm nay mình bắt đầu lại nhé 🐙"
- Milestone (30 ngày): "30 NGÀY! Bạn thuộc top những người kiên trì nhất trên Lingona! 🐙🎉"
- KHÔNG BAO GIỜ: "Streak sắp mất!" / "Bạn đã mất streak"

**📊 BAND SCORE:**
- Band 4.0: "Bạn đang ở Band 4.0 — đây là điểm xuất phát. Có mình ở đây, mình sẽ giúp bạn 🐙"
- Band 5.5: "Band 5.5! Bạn đang tiến bộ tốt lắm! Mục tiêu tiếp: [cụ thể] 🐙"
- Band 7.0+: "Band 7.0! Tuyệt vời! 🐙🎉"
- Band tăng: "Band 5.0 → 5.5! Tăng 0.5 trong 2 tuần! Bạn giỏi thật! 🐙🎉"
- KHÔNG BAO GIỜ: màu đỏ cho band thấp / "Band thấp" / "Cần cải thiện nhiều"

**⚔️ BATTLE:**
- Thắng: "Trận hay! Bạn đã tiến bộ rất nhiều! 🐙🎉"
- Thua: "Trận này khó nhỉ! Mình xem lại mấy câu sai nhé 🐙" (+ link đến review)
- Thua sát nút: "Suýt nữa rồi! Lần sau chắc chắn được! 🐙💪"
- Vs Bot: "Luyện với mình nhé! Mình sẽ không nhường đâu 😏🐙"
- KHÔNG BAO GIỜ: "Bạn thua rồi" / "Đối thủ giỏi hơn bạn"

**💰 HIT DAILY LIMIT:**
- ✅ "Hết lượt cho hôm nay rồi! 🐙 Nếu bạn thấy app thật sự giúp ích, thì bạn hãy cùng mình đi tới Pro, chúng ta luyện tiếp nhé! Mách nhỏ: rẻ hơn trung tâm ngoài kia nhiều lắm 😉"
- KHÔNG BAO GIỜ: "Nghỉ ngơi nhé!" (nói dối) / "Nâng cấp để tiếp tục" (lạnh)

**👋 FIRST OPEN:**
- "Chào bạn! Mình là Lintopus 🐙 Bạn có cảm thấy choáng ngợp không? Không sao, để mình giúp bạn từng bước nhé!"

**🌅 DAILY OPEN:**
- "Chào buổi sáng! Hôm nay mình luyện gì nhỉ? 🐙"
- "Chào bạn! Hôm qua bạn làm tốt lắm. Hôm nay tiếp tục nhé!"
- (vary mỗi ngày, không lặp)

**🚪 SESSION END:**
- "Hôm nay bạn đã: ✅ Reading 7/10, ✅ 12 từ mới, 🔥 Streak ngày 5! 
   Ngày mai: Speaking Part 2 đang chờ bạn! 🐙"
- LUÔN có: summary + tomorrow's teaser

**😕 STUCK (context-aware help):**
- Dashboard lần đầu: "Bắt đầu với Reading nhé, mình sẽ hướng dẫn từng bước! 🐙"
- Chọn bài: "Mình gợi ý bài này cho level của bạn nhé! 🐙"
- Giữa quiz: "Mẹo: đọc lại đoạn 2, câu trả lời ở đó 🐙"
- Pro page: "Bạn có thể dùng Free thoải mái, Pro chỉ thêm tính năng thôi! 🐙"
- KHÔNG BAO GIỜ: "Bạn cần giúp gì không?" (generic Clippy)

**🏆 ACHIEVEMENTS:**
- Unlock: "Mở khóa thành tựu [tên]! Bạn xứng đáng lắm! 🐙🏆"
- Locked (preview): "Còn [X] bài nữa là mở khóa [tên]! Cố lên! 🐙"

**📈 RANK UP:**
- "Lên hạng [tên]! Bạn đã tiến bộ rất nhiều, Lintopus tự hào lắm! 🐙🎉"

---

## VI. SOUL FILTER APPLIED — EVALUATION TABLE

> Audit MỖI feature qua Soul Filter. Fill table này trong quá trình audit.

### Core Learning Features
| Feature | Q1: Doraemon? | Q2: Oriented? | Q3: Improvement? | Q4: Motivated Empathy? | Q5: Essential? | Verdict | Notes |
|---------|:---:|:---:|:---:|:---:|:---:|---------|-------|
| Reading Practice | | | | | | | |
| Speaking AI | | | | | | | |
| Writing AI | | | | | | | |
| Grammar | | | | | | | |
| Listening | | | | | | | |
| Vocabulary | | | | | | | |
| Onboarding | | | | | | | |
| Band tracking | | | | | | | |
| Daily recommendations | | | | | | | |

### Gamification Features
| Feature | Q1 | Q2 | Q3 | Q4 | Q5 | Verdict | Soul-Aligned Design |
|---------|:---:|:---:|:---:|:---:|:---:|---------|-------------------|
| Battle (ranked, đồng hạng) | | | | | | | Gate: 5 bài practice |
| Battle (Lintopus bot) | | | | | | | Flow state difficulty |
| Battle (friend unranked) | | | | | | | |
| Rank ladder | | | | | | | Lintopus mỗi rank |
| Leaderboard | | | | | | | Gate: vài ngày |
| Achievements (45 badges) | | | | | | | |
| Streak | | | | | | | No guilt-trip, cumulative |
| Season resets | | | | | | | |

### Social Features
| Feature | Q1 | Q2 | Q3 | Q4 | Q5 | Verdict | Notes |
|---------|:---:|:---:|:---:|:---:|:---:|---------|-------|
| Friend Chat | | | | | | | |
| Voice notes | | | | | | | |
| Public profile | | | | | | | |

### Monetization
| Feature | Q1 | Q2 | Q3 | Q4 | Q5 | Verdict | Soul-Aligned Copy |
|---------|:---:|:---:|:---:|:---:|:---:|---------|-------------------|
| Daily limits | | | | | | | Honest messaging |
| Pro upgrade prompts | | | | | | | "Cùng mình đi Pro" |
| Pricing page | | | | | | | "Rẻ hơn trung tâm" |
| Free trial (3 days) | | | | | | | |

---

## VII. AUDIT INTEGRATION — CÁCH KẾT HỢP VỚI V3

### Khi chạy V3 Brain Audit, thêm lens này vào MỖI đánh giá:

```
### [🔴|🟡|🟢|💡] [CATEGORY] > [SUBCATEGORY]
**Lens**: 🧠 Behavioral | 🔬 UX Research | 💰 Growth | 🎨 Design
**Soul Check**: ✅ Aligned | ⚠️ Partially | 🔴 Conflicts → [câu hỏi nào fail?]
**Lintopus**: Present? Correct tone? Correct moment?
**File**: `src/path/file.tsx:42`
**Issue**: [MÔ TẢ CỤ THỂ]
**Psychology**: [TẠI SAO đây là vấn đề theo tâm lý học]
**Current**: [CODE/BEHAVIOR HIỆN TẠI]
**Current copy**: [TEXT HIỆN TẠI nếu liên quan]
**Should be**: [CODE/BEHAVIOR NÊN CÓ]
**Soul-aligned copy**: [TEXT NÊN CÓ theo Micro-Copy Bible]
**Effort**: XS | S | M | L | XL
**Impact**: [CỤ THỂ ảnh hưởng gì]
**AI Smell**: 🟢 | 🟡 | 🔴
**Safari**: ✅ | ⚠️ | 🔴
```

### V3 Scoring bổ sung:
Thêm vào scoring table V3 (/190):

| # | Category | Score (/10) |
|---|----------|-------------|
| 20 | Soul Alignment | /10 |
| 21 | Lintopus Presence & Quality | /10 |
| 22 | Micro-Copy Voice Consistency | /10 |
| 23 | Motivated Empathy | /10 |
| | **TỔNG MỚI** | **/230** |

### Grading mới:
- **207-230 (90%+)**: S-Tier — Sản phẩm có soul. Ship with pride.
- **184-206 (80-89%)**: A-Tier — Soul rõ, cần polish.
- **161-183 (70-79%)**: B-Tier — Soul mờ nhạt ở một số nơi.
- **138-160 (60-69%)**: C-Tier — Features đúng nhưng thiếu soul. Cần rework.
- **< 138 (<60%)**: D-Tier — App chưa có linh hồn.

---

## VIII. THE STEVE JOBS TEST

> Sau khi audit xong, trả lời 3 câu hỏi cuối cùng:

### 1. "Does it have taste?"
Nhìn toàn bộ app. Mỗi pixel có cảm giác INEVITABLE — "tất nhiên phải vậy" — hay arbitrary — "cũng được, đổi cũng được"?
Nếu bạn đổi bất kỳ element nào mà KHÔNG AI notice → element đó chưa có taste.

### 2. "What would you REMOVE?"
Liệt kê 5 thứ NÊN XÓA khỏi app. Không phải "thêm gì" — "BỎ gì."
Mỗi thứ bỏ đi = tập trung hơn cho thứ còn lại.
> "People think focus means saying yes to the thing you've got to focus on. 
> But that's not what it means at all. It means saying no to the hundred 
> other good ideas." — Steve Jobs

### 3. "Is this the BEST it can be?"
Không phải "có tốt không." Mà "đây có phải TỐT NHẤT mà team này có thể làm không?"
Nếu câu trả lời là "chưa, mình biết chỗ nào có thể tốt hơn" → chỗ đó phải fix trước khi launch.

---

## TÓM TẮT FILES CẦN DÙNG CHO AUDIT:

1. **LINGONA_SOUL_AUDIT_FINAL.md** (file này) — Đọc TRƯỚC TIÊN. Hiến pháp của Lingona.
2. **LINGONA_AUDIT_V3_BRAIN_AUDIT.md** — Technical + psychological audit. 19 phần, 190+ điểm.
3. **LINGONA_AUDIT_V3_EXECUTION_GUIDE.md** — Cách chạy: Playwright, chunking, extra commands.

Thứ tự: Soul Audit → Execution Guide → V3 Brain Audit (chia 6 sessions).
