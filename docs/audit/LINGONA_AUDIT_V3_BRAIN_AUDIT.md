# LINGONA — ULTIMATE SYSTEM AUDIT V3
# "THE BRAIN AUDIT"

# ═══════════════════════════════════════════════════════════════════
# BẠN LÀ 4 NGƯỜI TRONG 1:
#
# 🧠 BEHAVIORAL DESIGNER (Psychology + Product)
#    Bạn nghiên cứu habit loops, dopamine scheduling, cognitive biases.
#    Bạn đọc Nir Eyal, BJ Fogg, Daniel Kahneman, Robert Cialdini.
#    Câu hỏi của bạn: "App này có NGHIỆN được không?"
#
# 🔬 UX RESEARCHER (Psychology + Data)
#    Bạn chạy cognitive walkthroughs, đo Fitts's law, Hick's law.
#    Bạn đọc Don Norman, Jakob Nielsen, Susan Weinschenk.
#    Câu hỏi của bạn: "User có TỰ biết làm gì tiếp không?"
#
# 💰 GROWTH PM (Psychology + Money)
#    Bạn phân tích AARRR funnels, activation metrics, viral loops.
#    Bạn đọc Sean Ellis, Andrew Chen, Lenny Rachitsky.
#    Câu hỏi của bạn: "User có TRẢ TIỀN và RỦ BẠN BÈ không?"
#
# 🎨 PRODUCT DESIGNER (Psychology + UI)
#    Bạn áp dụng Gestalt, visual hierarchy, emotional design.
#    Bạn đọc Don Norman (Emotional Design), Refactoring UI, Dieter Rams.
#    Câu hỏi của bạn: "User có CẢM thấy gì khi nhìn vào?"
#
# ═══════════════════════════════════════════════════════════════════
#
# CONTEXT:
# - Lingona: AI IELTS learning app cho người Việt 18-25 tuổi
# - Stack: Next.js 14 + Tailwind + Node.js/Express + PostgreSQL
# - Competitors: Duolingo, Elsa Speak, IELTS Prep apps
# - Target user: Sinh viên VN, dùng iPhone Safari, 4G chập chờn
# - Monetization: Freemium (179k/month Pro)
# - Launch: July 9, 2026
#
# MINDSET:
# Bạn không audit "có bug không". Bạn audit "não người dùng 20 tuổi
# ở Việt Nam phản ứng thế nào với TỪNG PIXEL trên screen này".
#
# Mỗi element phải trả lời được: TẠI SAO nó ở đây?
# Nếu không trả lời được → XÓA hoặc REDESIGN.
#
# CHUẨN: Không phải "có lỗi không" mà "có đạt chuẩn NGHỆ THUẬT không"
# ═══════════════════════════════════════════════════════════════════

---

## PHẦN 0: RECONNAISSANCE — THU THẬP MỌI DỮ LIỆU TRƯỚC

> KHÔNG ĐƯỢC AUDIT BẤT CỨ THỨ GÌ cho đến khi chạy hết commands dưới đây.
> Paste output vào notes. Đây là "lab data" — mọi đánh giá sau phải dựa trên data này.

```bash
echo "=== 0.1 PROJECT STRUCTURE ==="
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | sort | head -300

echo "=== 0.2 ALL PAGE ROUTES ==="
find src/app -name "page.tsx" -o -name "layout.tsx" | sort

echo "=== 0.3 FONT SETUP ==="
grep -rn "font\|Font\|@font-face\|next/font\|fontFamily" src/ --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules | grep -v ".next"

echo "=== 0.4 COLOR REALITY (hex count) ==="
grep -roh '#[0-9a-fA-F]\{3,8\}' src/ --include="*.tsx" --include="*.css" | sort | uniq -c | sort -rn | head -50

echo "=== 0.5 COLOR REALITY (tailwind arbitrary) ==="
grep -roh 'bg-\[#[^]]*\]\|text-\[#[^]]*\]\|border-\[#[^]]*\]' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.6 COLOR REALITY (tailwind named) ==="
grep -roh 'bg-[a-z]*-[0-9]*\|text-[a-z]*-[0-9]*\|border-[a-z]*-[0-9]*' src/ --include="*.tsx" | sort | uniq -c | sort -rn | head -50

echo "=== 0.7 SPACING REALITY ==="
grep -roh 'p-\[[0-9]*px\]\|m-\[[0-9]*px\]\|gap-\[[0-9]*px\]\|pt-\[[0-9]*px\]\|pb-\[[0-9]*px\]\|pl-\[[0-9]*px\]\|pr-\[[0-9]*px\]\|mt-\[[0-9]*px\]\|mb-\[[0-9]*px\]\|ml-\[[0-9]*px\]\|mr-\[[0-9]*px\]' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.8 FONT SIZE REALITY ==="
grep -roh 'text-\[.*\]\|text-xs\|text-sm\|text-base\|text-lg\|text-xl\|text-2xl\|text-3xl\|text-4xl\|text-5xl' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.9 BORDER RADIUS REALITY ==="
grep -roh 'rounded-[a-z0-9]*\|rounded-\[.*\]' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.10 Z-INDEX CHAOS ==="
grep -roh 'z-[0-9]*\|z-\[.*\]' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.11 SHADOW REALITY ==="
grep -roh 'shadow-[a-z]*\|shadow-\[.*\]' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.12 ANIMATION/TRANSITION ==="
grep -roh 'transition-[a-z]*\|duration-[0-9]*\|animate-[a-z]*\|ease-[a-z]*' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.13 ICON LIBRARIES ==="
grep -roh 'from.*icon\|from.*Icon\|from.*lucide\|from.*heroicons\|from.*react-icons\|from.*phosphor' src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== 0.14 AI SMELL: console.log ==="
grep -rn "console\.\(log\|debug\|info\|warn\|error\)" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l

echo "=== 0.15 AI SMELL: any type ==="
grep -rn ": any\|as any\|<any>" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l

echo "=== 0.16 AI SMELL: eslint-disable ==="
grep -rn "eslint-disable" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l

echo "=== 0.17 AI SMELL: TODO/FIXME ==="
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|WORKAROUND" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules

echo "=== 0.18 AI SMELL: obvious comments ==="
grep -rn "// \(This\|Handle\|Get\|Set\|Function\|Component\|Render\|Return\|Initialize\|Create\|Update\|Delete\|Fetch\|Check\|Validate\)" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -40

echo "=== 0.19 COMPONENT SIZES ==="
find src -name "*.tsx" -exec wc -l {} \; | sort -rn | head -30

echo "=== 0.20 DEPENDENCIES ==="
cat package.json | grep -A 200 '"dependencies"'

echo "=== 0.21 TAILWIND CONFIG ==="
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null

echo "=== 0.22 GLOBALS CSS ==="
cat src/app/globals.css 2>/dev/null || cat src/styles/globals.css 2>/dev/null

echo "=== 0.23 ROOT LAYOUT ==="
cat src/app/layout.tsx

echo "=== 0.24 METADATA/SEO ==="
grep -rn "metadata\|title\|description\|og:\|twitter:" src/app/ --include="*.tsx" --include="*.ts" | head -40

echo "=== 0.25 100VH USAGE (Safari bug) ==="
grep -rn "100vh\|h-screen" src/ --include="*.tsx" --include="*.css" | grep -v node_modules

echo "=== 0.26 SAFE AREA ==="
grep -rn "safe-area\|env(safe" src/ --include="*.tsx" --include="*.css" | grep -v node_modules

echo "=== 0.27 INPUT FONT SIZE (Safari zoom) ==="
grep -rn "text-xs\|text-sm\|text-\[1[0-5]px\]\|text-\[1[0-5]\]" src/ --include="*.tsx" | grep -i "input\|Input\|field\|Field" | head -20

echo "=== 0.28 SOUND FILES ==="
find src public -name "*.mp3" -o -name "*.wav" -o -name "*.ogg" -o -name "*.m4a" 2>/dev/null

echo "=== 0.29 MANIFEST/PWA ==="
cat public/manifest.json 2>/dev/null || cat public/site.webmanifest 2>/dev/null

echo "=== 0.30 EMPTY STATE PATTERNS ==="
grep -rn "empty\|no data\|no result\|nothing\|không có\|chưa có\|trống" src/ --include="*.tsx" -i | head -30
```

GHI LẠI TẤT CẢ OUTPUT. Đây là baseline data cho mọi đánh giá phía sau.

---

## PHẦN 1: VISCERAL RESPONSE — 3 GIÂY ĐẦU TIÊN
### 🎨 Product Designer × 🧠 Behavioral Designer

> Don Norman's 3 levels of emotional design:
> **Visceral** (0-3s): Phản ứng bản năng, trước khi não kịp xử lý logic.
> "Đẹp" hay "rẻ tiền" — não quyết định trong 50 milliseconds.
> Aesthetic-Usability Effect: Users đánh giá app đẹp = app dễ dùng, dù thực tế không liên quan.

### 1.1 Landing Page — Visceral Impact Test
Mở landing page trên Safari iPhone 390px. KHÔNG scroll. Chỉ nhìn.

- [ ] **50ms test**: Screenshot above-the-fold. Thu nhỏ xuống 20% (blur mắt). Có focal point không? Hay mọi thứ cạnh tranh attention?
  - **Bằng chứng**: paste screenshot, vẽ visual hierarchy arrows
- [ ] **Emotional valence**: Cảm xúc NGAY LẬP TỨC là gì?
  - Warm & inviting? (Duolingo ✓)
  - Cold & clinical? (xấu)
  - Cluttered & chaotic? (xấu)
  - Empty & boring? (xấu)
  - **Bằng chứng**: mô tả cụ thể element nào gây cảm xúc đó
- [ ] **Color temperature**: Above-the-fold tạo feeling gì?
  - Navy = authority, trust → OK cho education
  - Teal = fresh, modern → OK cho young audience
  - Nhưng: quá nhiều navy = heavy, oppressive. Quá nhiều teal = lacks seriousness.
  - **Cân bằng đang đúng không?** Đo actual pixel ratio navy vs teal vs white vs other.
- [ ] **Visual density**: Bao nhiêu distinct visual elements trên first screen?
  - < 5 = clean, focused (Stripe level)
  - 5-8 = acceptable
  - > 8 = cluttered, overwhelming
  - **Đếm cụ thể và liệt kê từng element**
- [ ] **Lintopus mascot**: Có ở above-the-fold không?
  - Nếu có: chiếm bao nhiêu % screen? (10-15% = cute accent. > 25% = childish. < 5% = invisible)
  - Style: vector? flat? 3D? hand-drawn? Có phù hợp với overall design language?
  - Expression: inviting? friendly? Hay creepy/weird?
  - **Bằng chứng**: screenshot + pixel measurement

### 1.2 Dashboard — First Login Visceral
Giả sử user vừa signup và login lần đầu.

- [ ] **Overwhelm test (Hick's Law)**: Bao nhiêu actions/choices visible ngay lập tức?
  - > 6 visible choices = decision paralysis. User KHÔNG biết bấm gì.
  - Duolingo first login: 1 choice — "Start lesson". Đó là genius.
  - **Lingona first login có bao nhiêu choices? Liệt kê từng cái.**
- [ ] **Value proposition immediate**: Trong 3 giây, user có thấy "ồ cái này sẽ giúp mình luyện IELTS" không?
  - Hay user thấy empty dashboard với nhiều tabs?
  - **Bằng chứng**: screenshot first-login state
- [ ] **Cognitive load (Miller's Law)**: Working memory = 7±2 chunks.
  - Trên dashboard, có > 7 distinct information groups không? → overload
  - **Đếm và liệt kê từng group**

### 1.3 "Would I Screenshot This?" Test
> 🔬 UX Research insight: Gen Z (18-25) share screenshots constantly.
> Nếu KHÔNG CÓ screen nào trong app đáng screenshot → app thiếu "share-worthy moments".

- [ ] Kiểm tra từng screen. Có screen nào user sẽ tự nhiên muốn chụp screenshot share lên Instagram/Facebook story?
  - Band score result? → có đủ visual để share không?
  - Rank badge? → có đẹp đủ để flex không?
  - Streak counter? → có impressive display không?
  - Battle win? → có celebration screen không?
  - **Nếu KHÔNG CÓ screen nào → thêm "share card" feature lên priority list**
- [ ] Screenshot đó có Lingona branding không? (logo, color, watermark nhẹ)
  - Khi người khác thấy screenshot → biết đó là app gì không?

---

## PHẦN 2: BEHAVIORAL DESIGN — HABIT FORMATION
### 🧠 Behavioral Designer (Core Section)

> **Hook Model (Nir Eyal)**: Trigger → Action → Variable Reward → Investment
> **Fogg Behavior Model**: Behavior = Motivation × Ability × Prompt (B = MAP)
> **Self-Determination Theory**: Autonomy, Competence, Relatedness

### 2.1 TRIGGER AUDIT — Cái gì kéo user MỞ APP?

**External Triggers:**
- [ ] Push notifications: có implement không?
  - Daily reminder: "Streak của bạn sắp mất! 🔥" (loss aversion)
  - Social trigger: "Bạn X vừa vượt bạn trên bảng xếp hạng!" (competition)
  - Progress trigger: "Bạn chỉ còn 2 bài nữa là đạt Band 6.5!" (goal gradient)
  - **Có bao nhiêu notification types? Liệt kê.**
  - 🔴 Không có push notifications = không có external trigger = không có habit loop
- [ ] Email: có drip campaign không?
  - Day 1: Welcome + how to start
  - Day 3: "Bạn đã thử Speaking chưa?"
  - Day 7: Weekly progress report
  - Day 30: Churn prevention
  - **Liệt kê tất cả email templates tìm được trong codebase**
- [ ] Social triggers: khi bạn bè invite → notification?

**Internal Triggers (advanced — app phải gắn với emotion):**
- [ ] App có gắn với emotional trigger nào không?
  - Duolingo → guilt (streak loss), pride (streak maintain)
  - Instagram → boredom, FOMO
  - Lingona nên gắn với → anxiety about IELTS score, hope for study abroad
  - **Onboarding có hỏi "Bạn cần IELTS để làm gì?" không?**
  - **App có reference lại goal đó regularly không?** ("Chỉ còn 2 band nữa là đủ điểm du học Úc!")
  - 🔴 App không biết user muốn gì = không thể trigger internal motivation

### 2.2 ACTION AUDIT — Hành động có ĐỦ DỄ không?

> **Fogg**: Behavior chỉ xảy ra khi Ability đủ cao (action đủ dễ).
> Simplicity = f(time, money, physical effort, brain cycles, social deviance, non-routine)

- [ ] **Time to first action**: Từ mở app → bắt đầu luyện = bao nhiêu taps?
  - 1 tap = Duolingo level (mở app → "Continue" → bắt đầu)
  - 2 taps = acceptable
  - 3+ taps = too much friction
  - **Đếm chính xác số taps từ app open → first learning action**
- [ ] **Cognitive load per action**: Mỗi screen yêu cầu user nghĩ bao nhiêu?
  - Quiz: chọn A/B/C/D → low cognitive load ✓
  - Nhưng: navigation giữa Reading/Speaking/Writing/Battle/Profile → nhiều choices
  - **Vẽ decision tree: từ dashboard, bao nhiêu paths? Bao nhiêu depth?**
- [ ] **Friction log**: Đi qua từng core flow, ghi lại MỌI moment of friction:
  - Signup flow: bao nhiêu fields? (>4 fields = quá nhiều)
  - Mỗi field có autofill support không?
  - Có social login không? (Google/Facebook — essential ở VN)
  - Mỗi page load: có chờ > 1s không?
  - Mỗi action: có feedback ngay không? Hay phải chờ?
  - **Format: [Screen] → [Action] → [Friction point] → [Severity]**

### 2.3 VARIABLE REWARD AUDIT — Dopamine Design

> **Variable Ratio Schedule** (slot machine effect): Reward không predictable → user engaged hơn.
> Fixed rewards (always same) → boring. Variable rewards → addictive.

- [ ] **Reward inventory**: Liệt kê MỌI reward trong app:
  - XP/points?
  - Streak count?
  - Band score?
  - Achievement badges?
  - Rank promotion?
  - Battle wins?
  - Leaderboard position?
  - **Với MỖI reward: có animation/celebration không? Fixed hay variable?**

- [ ] **Variable reward types** (Nir Eyal's 3 types):
  - **Tribe** (social): Leaderboard, battle results, friend activity → có không?
  - **Hunt** (resource): New content, new tips, personalized insights → có không?
  - **Self** (mastery): Band score improvement, skill unlocks, personal records → có không?
  - 🔴 Nếu chỉ có 1 type → reward system thiếu depth. Cần ít nhất 2/3 types.

- [ ] **Dopamine curve analysis**:
  - Sau khi hoàn thành 1 bài → reward gì? (confetti? sound? score reveal?)
  - Reward có ESCALATE theo effort không? (bài khó → reward lớn hơn?)
  - Có "bonus" rewards bất ngờ không? (unexpected = dopamine spike)
  - Có "near miss" feelings không? ("Chỉ thiếu 1 câu nữa là Band 7.0!" → try again)
  - 🔴 Reward = just text ("Hoàn thành! Band 6.5") → no dopamine. Cần visual + sound + animation.

### 2.4 INVESTMENT AUDIT — User có BỎ CÔNG SỨC vào app không?

> **IKEA Effect**: Con người đánh giá cao thứ mình bỏ công sức xây.
> **Stored Value**: Data user tạo trong app = switching cost.

- [ ] **Stored value inventory**: User để lại gì trong Lingona?
  - Practice history?
  - Vocabulary lists?
  - Personal progress data?
  - Social connections (friends)?
  - Custom settings?
  - **Mỗi stored value: có visible cho user không?** (User phải THẤY investment của mình)
- [ ] **Escalation of commitment**:
  - Week 1: user invest gì? (tạo account, set target)
  - Week 4: user invest thêm gì? (vocabulary list, friends, streak)
  - Week 12: user invest thêm gì? (history, rank, reputation)
  - **Càng dùng lâu → càng khó bỏ?** Hay dùng 1 tháng cũng = dùng 1 ngày?
  - 🔴 Nếu user có thể bỏ app mà không mất gì = zero switching cost = zero retention

### 2.5 LOSS AVERSION AUDIT

> **Kahneman & Tversky**: Mất 100đ đau gấp 2 lần vui khi được 100đ.
> Loss aversion là tool mạnh nhất của behavioral design.

- [ ] **Streak system**:
  - Streak mất khi miss 1 ngày? → có loss aversion
  - Nhưng: có streak freeze không? (1 ngày tha = giảm anxiety → better retention)
  - Streak display: có flame icon 🔥? Có calendar heatmap?
  - Streak milestone: 7 ngày, 30 ngày, 100 ngày → special reward?
  - **Streak notification**: "Streak 15 ngày của bạn sắp mất! Chỉ cần 1 bài 5 phút!" → có không?
  - 🔴 Streak system yếu hoặc không có = no daily hook

- [ ] **Rank loss**:
  - Có thể bị tụt rank không? (Từ Silver → Bronze nếu không active?)
  - Nếu có: có warning trước không?
  - 🟡 Rank chỉ đi lên, không đi xuống → no loss aversion → less engaging

- [ ] **Progress framing**:
  - "Bạn đã hoàn thành 60%" vs "Bạn còn 40% nữa" → loss frame vs gain frame
  - App đang dùng frame nào? Consistency?

### 2.6 ENDOWED PROGRESS EFFECT

> Cho user cảm giác đã bắt đầu rồi → họ có motivation hoàn thành hơn.
> Ví dụ: loyalty card 10 stamps, cho sẵn 2 stamps → completion rate tăng 82%.

- [ ] Onboarding có cho user "free progress" không?
  - Diagnostic test → "Bạn đang ở Band 5.5!" → progress bar đã ở 55%
  - Đây là endowed progress: user cảm thấy đã bắt đầu, chỉ cần tiếp tục
  - 🔴 Onboarding kết thúc với "Band 0" hoặc empty profile → zero endowed progress → motivation drop

- [ ] **Goal gradient effect**: User gần đạt goal → có tăng tốc không?
  - "Còn 2 bài nữa là lên Band 6.0!" → UI có highlight không?
  - Progress bar gần full → có color change/animation không?
  - 🔴 Progress chỉ là numbers, không visual → brain không register proximity

---

## PHẦN 3: COGNITIVE PSYCHOLOGY — BRAIN PROCESSING
### 🔬 UX Researcher (Core Section)

### 3.1 COGNITIVE LOAD ANALYSIS

> **Cognitive Load Theory (Sweller)**: Working memory xử lý ~4 chunks cùng lúc.
> Mỗi unnecessary element = tốn 1 chunk = giảm learning capacity.

Cho MỖI screen chính (dashboard, reading, speaking, writing, battle, profile, settings):
- [ ] **Information density score**:
  - Đếm số distinct information groups trên screen
  - Đếm số unique colors
  - Đếm số unique font sizes
  - Đếm số interactive elements
  - **Score**: (groups × 1) + (colors × 0.5) + (font sizes × 0.5) + (interactions × 1)
  - Target: < 15 per screen. > 20 = cognitive overload.
  - **Paste screenshot + annotated count cho mỗi screen**

- [ ] **Extraneous load** (thông tin không cần thiết cho task):
  - Khi user đang làm Reading quiz → có thông tin nào KHÔNG liên quan đến quiz visible?
  - Sidebar? Notifications? Ads for Pro? Other features?
  - 🔴 Bất kỳ extraneous element nào trong quiz/test screen = stealing cognitive capacity from learning

- [ ] **Germane load** (thông tin support learning):
  - Hints/tips có present khi cần không?
  - Vocabulary highlights trong passages?
  - Grammar explanations immediate or delayed?

### 3.2 GESTALT PRINCIPLES AUDIT
### 🎨 Product Designer Sub-section

Cho MỖI major screen, evaluate:

- [ ] **Proximity**: Elements thuộc cùng group có gần nhau không?
  - Related buttons grouped?
  - Form fields logically clustered?
  - Navigation items grouped by function?
  - 🔴 Unrelated elements too close = user thinks they're related

- [ ] **Similarity**: Similar elements look similar?
  - All primary buttons cùng style?
  - All cards cùng style?
  - All links cùng style?
  - 🔴 Inconsistent styling = user can't build mental model

- [ ] **Continuity**: Eye flow natural?
  - Content flows top→bottom, left→right?
  - Visual lines guide eye to important elements?
  - No jarring breaks in visual flow?

- [ ] **Closure**: Incomplete elements perceived as complete?
  - Progress bars suggest completion?
  - Card groups suggest more content below fold?

- [ ] **Figure-Ground**: Primary content clearly foreground?
  - Main content vs background clearly separated?
  - Modals clearly float above page?
  - Active vs inactive states clearly distinguished?

### 3.3 FITTS'S LAW AUDIT

> **Fitts's Law**: Time to tap = f(distance, size). Big + close = fast. Small + far = slow.
> EVERY interactive element MUST be evaluated.

- [ ] **Primary CTA sizing**:
  - Most important button on each screen → measure pixel dimensions
  - On mobile: ≥ 44×44px touch target (Apple HIG) — but PRIMARY CTAs should be LARGER (≥ 48×48px, ideally full-width on mobile)
  - **Measure actual pixel sizes for top 5 most important buttons**

- [ ] **Distance to action**:
  - Quiz answer buttons — trong thumb zone? (bottom 40% of screen cho one-handed use)
  - "Next" button — bottom right (natural thumb position)?
  - Submit button — not at top where user has to reach?
  - **Map thumb zone heatmap cho quiz/test screen**

- [ ] **Dangerous actions far from safe actions**:
  - "Delete" far from "Save"?
  - "Cancel" far from "Confirm"?
  - 🔴 Destructive button right next to constructive button → accidental taps

### 3.4 HICK'S LAW AUDIT

> **Hick's Law**: Decision time = log2(n+1). More choices = exponentially slower decisions.
> iPhone thành công vì home screen chỉ có 1 button.

- [ ] **Choice count per screen**:
  - Dashboard: bao nhiêu tappable elements visible?
  - BottomNav: 5 tabs → OK (industry standard)
  - Settings: bao nhiêu options visible? Có grouped không?
  - **Cho mỗi screen: đếm choices → nếu > 7 → redesign hoặc progressive disclosure**

- [ ] **Progressive disclosure**:
  - Settings có chia sections? Hay 1 long list?
  - Advanced options hidden by default?
  - Onboarding: 1 question per screen? Hay nhiều fields cùng lúc?
  - 🔴 Everything visible at once → overwhelming. Best apps reveal complexity gradually.

### 3.5 SERIAL POSITION EFFECT

> Users remember FIRST (primacy) and LAST (recency) items best.

- [ ] BottomNav: Most important tab ở vị trí nào? (First hoặc last = best recall)
- [ ] Feature lists: key features ở đầu hoặc cuối?
- [ ] Onboarding screens: first & last screen có strongest impact?
- [ ] Quiz results: most important info (Band score) ở đầu hay cuối?

### 3.6 VON RESTORFF EFFECT (Isolation Effect)

> Item nổi bật trong group sẽ được nhớ lâu hơn.

- [ ] CTA button có THẬT SỰ nổi bật? Hay blend in?
  - Measure color contrast vs surrounding elements
  - Measure size difference vs other buttons
  - Là element DUY NHẤT có màu đó trên screen?
- [ ] "Upgrade to Pro" prompt: có visually distinct không? Hay just another button?
- [ ] Achievement unlock: có break visual pattern không? (khác biệt enough để notice)

---

## PHẦN 4: GROWTH FRAMEWORK — AARRR FUNNEL
### 💰 Growth PM (Core Section)

> **AARRR**: Acquisition → Activation → Retention → Revenue → Referral
> Phân tích TỪNG stage. Một leak ở bất kỳ stage nào = kill growth.

### 4.1 ACQUISITION — User tìm thấy Lingona

- [ ] **SEO readiness**:
  - Search "luyện IELTS online" / "IELTS speaking AI" → Lingona có rank không? (check khi app live)
  - Mỗi page có unique title + description cho Vietnamese IELTS keywords?
  - Sitemap.xml correct?
  - Blog/content section cho SEO traffic?
  - 🔴 Không có content/blog strategy = no organic growth

- [ ] **Social sharing (viral acquisition)**:
  - Khi share link trên Facebook/Zalo/Messenger → preview card đẹp không?
  - **TEST THỰC TẾ**: paste URL vào Facebook Sharing Debugger (developers.facebook.com/tools/debug)
  - OG image 1200×630, clear text, branded?
  - Share card có compelling hook? ("Mình vừa đạt Band 7.0 trên Lingona!")
  - 🔴 Ugly share preview = zero viral coefficient

- [ ] **Referral mechanism**:
  - Có "Invite friends" feature không?
  - Incentive cho referrer? (thêm streak freeze? pro trial days?)
  - Incentive cho referee? (bonus content?)
  - Referral link easy to copy/share?
  - 🔴 Không có referral system = phụ thuộc hoàn toàn vào paid acquisition = expensive

### 4.2 ACTIVATION — "Aha Moment"

> **Activation = user trải nghiệm core value lần đầu tiên.**
> Facebook: thêm 7 friends trong 10 ngày.
> Duolingo: hoàn thành 1 lesson.
> Lingona: ??? → CẦN DEFINE RÕ RÀNG.

- [ ] **"Aha moment" definition**: Lingona's aha moment là gì?
  - Suggested: user hoàn thành 1 practice session + nhận AI feedback + thấy band score
  - **Time to aha moment: bao nhiêu phút từ signup?**
  - Target: < 5 phút. > 10 phút = quá lâu.
  - **Đếm chính xác: signup → onboarding → first practice → first feedback = ? steps, ? taps, ? minutes**

- [ ] **Onboarding → aha moment funnel**:
  - Step 1: Signup (email/social) → drop-off %?
  - Step 2: Onboarding questions → drop-off %?
  - Step 3: First practice → drop-off %?
  - Step 4: See AI feedback → activated!
  - **Có tracking/analytics cho mỗi step không?** (Mixpanel/PostHog/custom)
  - 🔴 Không có analytics = blind = không biết users bỏ ở đâu

- [ ] **Onboarding quality**:
  - Có hỏi user goal không? ("Bạn cần IELTS để làm gì?")
  - Có hỏi current level không? (diagnostic test hoặc self-assess)
  - Có hỏi target score không?
  - Có hỏi deadline không? ("Bạn thi IELTS khi nào?")
  - **4 câu hỏi trên = data cho personalization + motivation triggers**
  - 🔴 Onboarding chỉ hỏi email/password = missed opportunity

- [ ] **Personalized first experience**:
  - Sau onboarding, dashboard có personalized không?
  - "Dựa trên level Band 5.0 của bạn, hãy bắt đầu với..." → có không?
  - Hay generic dashboard cho mọi user?
  - 🔴 One-size-fits-all first experience → user không feel "app này hiểu mình"

### 4.3 RETENTION — User quay lại ngày mai?

- [ ] **D1/D7/D30 retention mechanisms**:
  - Day 1: streak bắt đầu, daily goal set → có không?
  - Day 7: weekly summary email, new content unlock → có không?
  - Day 30: monthly progress report, milestone celebration → có không?
  - **Liệt kê MỌI mechanism giữ user quay lại**

- [ ] **Habit loop completeness** (Trigger → Action → Reward → Investment):
  | Component | Present? | Quality (1-10) | Detail |
  |-----------|----------|----------------|--------|
  | External trigger (notification) | | | |
  | Internal trigger (anxiety/motivation) | | | |
  | Action (practice session) | | | |
  | Variable reward (score/achievement) | | | |
  | Investment (progress/data) | | | |
  
- [ ] **Session design**:
  - Minimum session length? (5 min? 2 min? → shorter = better for habit formation)
  - "Quick practice" option? (1 question, 30 seconds → great for building habit)
  - End of session: tease next session? ("Bài tiếp theo: Band 6.5 Reading about Climate Change")
  - 🔴 Minimum session = 15+ min → too long for daily habit → will churn

- [ ] **Re-engagement**:
  - User inactive 3 days → what happens?
  - User inactive 7 days → what happens?
  - User inactive 30 days → what happens?
  - **Có win-back email/notification flow không?**
  - 🔴 Không có re-engagement = lost users stay lost

### 4.4 REVENUE — Free → Pro conversion

> **Pricing Psychology**: Anchoring, decoy effect, loss aversion, endowment.

- [ ] **Paywall trigger points**:
  - Khi nào user gặp paywall lần đầu?
  - Paywall xuất hiện ở moment of HIGH motivation? (sau khi thấy AI feedback tốt → "muốn thêm!")
  - Hay moment of LOW motivation? (bị block khi đang frustrated → churning trigger)
  - **Liệt kê TẤT CẢ paywall trigger points**
  - Best practice: show paywall AFTER user receives value, not BEFORE

- [ ] **Pricing display**:
  - 179k/month vs 1,199k/year → annual is cheaper → CÓ highlight annual không?
  - **Anchoring**: show monthly price first (higher) → then annual (looks like deal)?
  - **Price framing**: "Chỉ 4.000đ/ngày" (daily price feels smaller)?
  - **Social proof**: "X người đã nâng cấp tuần này" → có không?
  - **Decoy effect**: có plan thứ 3 khiến Pro look like best value? (Optional nhưng powerful)
  - 🔴 Pricing page boring/plain = low conversion

- [ ] **Free trial psychology**:
  - 3-day trial → có countdown visible không? ("Còn 2 ngày dùng thử Pro")
  - Trial ending: loss aversion — "Bạn sẽ mất quyền truy cập Speaking AI không giới hạn"
  - Trial = full Pro features? Hay limited?
  - After trial ends: immediate downgrade or grace period?

- [ ] **Upgrade prompts UX**:
  - Prompt xuất hiện bao nhiêu lần/session?
  - Có annoying không? (> 2 prompts/session = annoying)
  - Prompt copy có compelling không? Hay generic "Upgrade to Pro"?
  - Dismiss easy? (phải dễ dismiss, trust building)
  - 🔴 Aggressive upsell → user feels manipulated → churn
  - 🔴 No upsell prompts → user doesn't know Pro exists → no conversion

### 4.5 REFERRAL — User rủ bạn bè

- [ ] **Viral features**:
  - Battle system: invite friend to battle → có invite flow không?
  - Score share: band score → share card → friend sees → downloads app?
  - Leaderboard: challenge friend → invite link?
  - **K-factor estimate**: mỗi user invite bao nhiêu người? (target: > 0.3)
  
- [ ] **Network effects**:
  - App có valuable hơn khi nhiều friends dùng? (battles, leaderboard, chat)
  - Hay dùng 1 mình cũng y vậy?
  - 🟡 No network effects = no viral growth = paid acquisition dependency

---

## PHẦN 5: MOBILE SAFARI — THE NIGHTMARE BROWSER
### 🔬 UX Researcher + 🎨 Product Designer

> 80%+ Vietnamese smartphone users = iPhone with Safari HOẶC Android Chrome.
> Safari trên iOS có NHIỀU bugs đặc trưng mà nếu không test riêng SẼ LỖI.
> Đây KHÔNG phải optional section. Đây là make-or-break.

### 5.1 The Killers — Bugs sẽ CHẮC CHẮN xảy ra

- [ ] **100vh bug**: `h-screen` hoặc `100vh` KHÔNG tính thanh address bar Safari.
  ```bash
  grep -rn "100vh\|h-screen\|min-h-screen" src/ --include="*.tsx" --include="*.css" | grep -v node_modules
  ```
  Mỗi instance tìm được → verify: content có bị che bởi Safari address bar không?
  Fix: `100dvh`, `min-h-[100dvh]`, hoặc `height: -webkit-fill-available`
  **Liệt kê TỪNG instance và status (fixed/broken)**

- [ ] **Input zoom bug**: Safari auto-zoom khi tap input có font-size < 16px.
  ```bash
  # Find all input/textarea components
  grep -rn "<input\|<Input\|<textarea\|<Textarea\|<select\|<Select" src/ --include="*.tsx" | grep -v node_modules
  ```
  Mỗi input → check font-size. Nếu dùng `text-sm` (14px) hoặc `text-xs` (12px) → 🔴 SAFARI SẼ ZOOM.
  **Liệt kê TỪNG input component + font size**

- [ ] **Safe area (notch + home indicator)**:
  ```bash
  grep -rn "safe-area\|env(safe\|pb-safe\|pt-safe" src/ --include="*.tsx" --include="*.css" | grep -v node_modules
  ```
  - BottomNav → PHẢI có `padding-bottom: env(safe-area-inset-bottom)` cho iPhone X+
  - Top header → cần `padding-top: env(safe-area-inset-top)` nếu fullscreen
  - `<meta name="viewport">` có `viewport-fit=cover` không?
  - **Test: trên iPhone có notch → BottomNav bị home indicator che không?**

- [ ] **position: fixed + keyboard**:
  - Khi keyboard mở → fixed bottom elements (BottomNav) có bị đẩy lên không?
  - Khi keyboard mở → input có bị che không? Có scroll into view không?
  - Safari keyboard behavior KHÁC Chrome. Must test separately.

- [ ] **Bounce/rubber-band scroll**:
  - Safari has elastic overscroll. Khi scroll past top/bottom → bounce effect.
  - Background color behind bounce visible → PHẢI là brand color, không white.
  - `overscroll-behavior: none` có được set cho main container không?

- [ ] **Tap highlight**:
  - Safari shows gray tap highlight by default. Có `-webkit-tap-highlight-color: transparent` không?
  - Hay mỗi lần tap → ugly gray flash?

### 5.2 Visual Rendering

- [ ] **Font rendering**: Safari renders fonts thinner than Chrome (subpixel antialiasing khác).
  - Body text có quá mỏng trên Safari không?
  - `-webkit-font-smoothing: antialiased` có được set không?
  
- [ ] **backdrop-filter**: `backdrop-blur` có fallback cho Safari < 15?
  - Prefix: `-webkit-backdrop-filter` cần thiết cho older Safari
  ```bash
  grep -rn "backdrop" src/ --include="*.tsx" --include="*.css" | grep -v node_modules
  ```

- [ ] **Smooth scroll**: `scroll-behavior: smooth` có hoạt động trên Safari không?
  - Safari support từ 15.4+ — older versions cần JS polyfill

- [ ] **Sticky position**: Hoạt động trong scroll container?
  - Safari sticky + overflow parent = broken. Common bug.

### 5.3 PWA & Home Screen

- [ ] `manifest.json` tồn tại? Contents:
  - `name`: "Lingona" ✓
  - `short_name`: ≤ 12 chars
  - `icons`: 192×192 + 512×512 PNG
  - `theme_color`: matches app
  - `background_color`: matches splash screen
  - `display`: "standalone"
  - `start_url`: "/"
- [ ] Apple-specific meta tags:
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
  - `<link rel="apple-touch-icon" href="/icon-180.png">`
  - Splash screen images for different iPhone sizes?
- [ ] **"Add to Home Screen" test**: thêm vào home screen → icon đẹp? Tên đúng? Mở lên không bị white flash?

---

## PHẦN 6: TYPOGRAPHY — PHÂN BIỆT HUMAN VS AI
### 🎨 Product Designer + 🧠 Behavioral Designer

> Typography là DNA của design. AI-generated apps có "AI typography fingerprint":
> 1. Default system/framework fonts (Inter, system-ui)
> 2. No letter-spacing customization ANYWHERE
> 3. Same line-height everywhere (1.5 or Tailwind default)
> 4. Only 2 weights: normal + bold (no medium, semibold)
> 5. No responsive font scaling
> 6. No optical adjustments (tracking, leading per context)
> Human designers OBSESS over typography. AI just picks defaults.

### 6.1 Font DNA — The Smell Test
Run all commands from Phần 0.3 and 0.8. Then:

- [ ] **Primary body font**: ____________________
  - Is it Inter? → 🔴 AI SMELL. Change immediately.
  - Is it system-ui/sans-serif? → 🔴 AI SMELL. No identity.
  - Is it DM Sans? → ✅ Good, matches brand spec.
  - Is it something else? → evaluate if intentional or accidental.

- [ ] **Heading font**: ____________________
  - Is it same as body? → 🟡 Missed opportunity for contrast.
  - Is it Playfair Display? → ✅ Good, matches brand spec.
  - **Playfair Display Vietnamese test**: type "Luyện IELTS cùng Lingona" in Playfair Display → diacritics render correctly? No clipping? No ugly spacing?
  - 🔴 If Playfair doesn't support Vietnamese well → need alternative serif (Lora, Merriweather, Noto Serif — all have Vietnamese support)

- [ ] **Monospace font** (for code/scores): ____________________
  - Used for: band scores, timer, statistics?
  - Should be clean mono: JetBrains Mono, Fira Code, Source Code Pro

- [ ] **Font loading method**:
  ```bash
  grep -rn "next/font" src/ --include="*.ts" --include="*.tsx"
  ```
  - Using `next/font/google`? → ✅ Best practice (self-hosted, no layout shift)
  - Using `<link>` to Google Fonts CDN? → 🟡 Works but slower, layout shift risk
  - Not using next/font at all? → 🔴 AI code pattern: just puts font name in CSS and hopes

### 6.2 Type Scale — Mathematical Precision

- [ ] Extract ALL font sizes (from 0.8 data). Count unique sizes.
  - ≤ 7 unique sizes → ✅ Disciplined system
  - 8-10 unique sizes → 🟡 Slightly messy
  - > 10 unique sizes → 🔴 No system. AI generated sizes randomly.

- [ ] **Scale ratio**: Do sizes follow a ratio?
  - Major Third (1.25): 12 → 15 → 19 → 24 → 30 → 37
  - Minor Third (1.2): 12 → 14 → 17 → 20 → 24 → 29
  - Or random: 13, 15, 18, 22, 28 → 🔴 No system
  - **Calculate actual ratios between consecutive sizes**

- [ ] **Mobile sizes**:
  - Body: ≥ 16px on mobile (NON-NEGOTIABLE — readability + Safari zoom)
  - H1: 28-36px on mobile (not 48px desktop size)
  - H2: 22-28px on mobile
  - Small/caption: ≥ 12px (anything smaller unreadable on mobile)
  - **Responsive scaling**: `clamp()` or `text-base md:text-lg lg:text-xl`?

### 6.3 Optical Adjustments — What Separates Pros from AI

- [ ] **Letter-spacing** (tracking):
  ```bash
  grep -roh 'tracking-[a-z]*\|letter-spacing' src/ --include="*.tsx" --include="*.css" | sort | uniq -c
  ```
  - Large headings (>24px): tracking-tight or -0.02em? → tighter = more polished
  - Body text: default tracking (0) → ✅
  - Small caps / labels: tracking-wide or +0.05em? → wider = more readable
  - ALL CAPS text: MUST have increased tracking (+0.05 to +0.1em)
  - **Count of letter-spacing customizations found: _____**
  - 🔴 Zero letter-spacing customizations = 100% AI generated. Human designers ALWAYS adjust tracking.

- [ ] **Line-height** (leading):
  ```bash
  grep -roh 'leading-[a-z0-9]*\|line-height' src/ --include="*.tsx" --include="*.css" | sort | uniq -c
  ```
  - Body: 1.5-1.7 (1.6 ideal for Vietnamese with diacritics)
  - Headings: 1.1-1.3 (tight — looks professional)
  - Lists: slightly more than body (1.6-1.8)
  - **Different line-heights used: _____**
  - 🔴 Same line-height everywhere → AI. Need at least 3 distinct values.

- [ ] **Paragraph max-width**:
  - Reading passages: 60-75ch (measure → optimal for comprehension per research)
  - Body text in UI: 50-65ch
  - Full-width text on desktop → 🔴 UNREADABLE. Must constrain.
  - **Actual max-width of longest text block: _____ characters per line**

- [ ] **Font weight nuance**:
  - Count unique weights from 0.18 data
  - Using only normal (400) + bold (700)? → 🟡 Minimum viable, but lacks nuance
  - Ideal: Regular (400) for body, Medium (500) for UI labels/nav, Semibold (600) for subheadings, Bold (700) for headings only
  - `font-bold` count vs `font-semibold` count vs `font-medium` count:
  ```bash
  grep -roh 'font-bold\|font-semibold\|font-medium\|font-normal\|font-light' src/ --include="*.tsx" | sort | uniq -c
  ```
  - 🔴 `font-bold` is 80%+ of all weight usage → AI pattern: everything is either normal or BOLD with nothing in between

---

## PHẦN 7: COLOR PSYCHOLOGY & SYSTEM
### 🎨 Product Designer + 🧠 Behavioral Designer

> Color triggers emotion before cognition. Wrong colors = wrong feelings.
> Navy blue = trust, authority, stability (banks, education) ✓
> Teal = freshness, growth, modernity (health, tech) ✓
> Combined: trustworthy innovation for learning. GOOD foundation.
> BUT: execution matters more than theory.

### 7.1 Color Inventory Analysis
From Phần 0 data (0.4, 0.5, 0.6):

- [ ] **Total unique colors used**: _____
  - ≤ 12 = tight, disciplined ✅
  - 13-20 = messy but manageable 🟡
  - > 20 = chaos, no system 🔴
  
- [ ] **Hardcoded vs tokenized**:
  - Count of `bg-[#xxx]` arbitrary colors: _____
  - Count of design-token colors (via tailwind config): _____
  - Ratio arbitrary/token > 0.3 → 🔴 No design system. AI pattern.

- [ ] **Default Tailwind palette usage**:
  - `blue-500`, `gray-100`, `red-500` etc. used raw → 🔴 AI SMELL
  - These are FRAMEWORK defaults. Every AI app looks the same because they all use same defaults.
  - Brand colors should be in tailwind.config as custom named colors: `lingona-navy`, `lingona-teal`

### 7.2 Emotional Color Mapping
- [ ] **Positive actions** (start, continue, complete): what color? Should be teal/primary.
- [ ] **Negative actions** (delete, cancel, quit): what color? Should be red/destructive.
- [ ] **Neutral actions** (back, close, settings): what color? Should be gray/subtle.
- [ ] **Success states**: green? (conventional) or teal? (branded) — but CONSISTENT.
- [ ] **Error states**: red — is it the SAME red everywhere?
- [ ] **Warning states**: amber/orange — present?
- [ ] **Correct answer**: green + ✓ animation?
- [ ] **Wrong answer**: red + ✗ shake? Or something more encouraging?
  - 🧠 **Behavioral note**: pure red "WRONG" → triggers shame → demotivation.
  - Better: warm orange + "Gần đúng rồi!" or "Đáp án đúng là B — vì..."
  - Duolingo uses soft red + explanation + "Keep going!" → no shame.

### 7.3 Contrast — Hard Requirements
- [ ] Run every text/background combination through contrast checker.
  - Body text on white: ≥ 4.5:1
  - Heading on white: ≥ 4.5:1
  - Button text on button background: ≥ 4.5:1
  - Placeholder text: ≥ 3:1 (often fails!)
  - **Actual contrast ratios for top 10 most common combos**: list each one.
  - 🔴 ANY failure = accessibility violation + potentially illegal in some markets

---

## PHẦN 8: COMPONENT SYSTEM — PIXEL-LEVEL
### 🎨 Product Designer

### 8.1 Design Token Consistency

Run from Phần 0 data (0.9, 0.10, 0.11). For each:

**Border Radius:**
- [ ] Unique values found: _____ (list them)
- [ ] ≤ 3 values (sm/md/lg) = ✅
- [ ] > 5 values = 🔴 no system
- [ ] Mix of `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` on same page = 🔴

**Shadows:**
- [ ] Unique values found: _____ (list them)
- [ ] ≤ 3 levels (sm/md/lg) = ✅
- [ ] Mix shadow AND border for cards = 🔴 pick ONE approach
- [ ] Colored shadows matching brand? (subtle teal shadow = premium feel)

**Z-index:**
- [ ] Unique values found: _____ (list them)
- [ ] Is there a z-index scale? (10: dropdown, 20: sticky, 30: modal, 40: toast, 50: tooltip)
- [ ] `z-[9999]` or `z-[999]` anywhere? → 🔴 AI panic z-index
- [ ] Modal z-index > toast z-index? (toast should be on top)
- [ ] Any z-index conflicts? (elements overlapping wrong)

### 8.2 Icon System
```bash
echo "=== ICON LIBRARIES ==="
grep -roh "from '[^']*icon[^']*'\|from \"[^\"]*icon[^\"]*\"\|from '[^']*lucide[^']*'\|from '[^']*heroicons[^']*'\|from '[^']*react-icons[^']*'" src/ --include="*.tsx" | sort | uniq -c | sort -rn

echo "=== ICON SIZES ==="
grep -roh 'size={[0-9]*}\|w-[0-9]*\s*h-[0-9]*\|className="[^"]*w-[0-9]' src/ --include="*.tsx" | sort | uniq -c | sort -rn | head -20

echo "=== EMOJI USAGE ==="
grep -rPoh '[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F1E0}-\x{1F1FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]' src/ --include="*.tsx" 2>/dev/null | sort | uniq -c | sort -rn
```

- [ ] **Single icon library?** (Lucide OR Heroicons OR Phosphor — NOT mixed)
  - 🔴 Mixing icon libraries = different visual weights, different styles = instant AI smell
  - Using emoji instead of proper icons in some places? → 🟡 OK sparingly, 🔴 if systemic
  
- [ ] **Consistent icon sizes?**
  - Navigation: all same size (20-24px)
  - Inline with text: matching text size
  - Feature icons: all same size
  - 🔴 Random sizes (16, 18, 20, 24, 28 mixed) → no system

- [ ] **Icon style consistency**:
  - ALL outline? ALL filled? Mixed?
  - 🔴 Same page with outline AND filled icons = AI randomly picked
  - Active state: filled. Inactive state: outline. → This is intentional → ✅
  
- [ ] **Stroke width consistency** (for outline icons):
  - All 1.5px? All 2px? Mixed?
  - 🔴 Mixed stroke widths = visual noise. Must be uniform.

### 8.3 Button System — Complete Audit
```bash
grep -rn "button\|Button\|btn\|Btn" src/ --include="*.tsx" | grep -v node_modules | grep -v "import" | head -50
```

For EVERY button variant found:
| Variant | bg color | text color | border | radius | padding | hover | active | disabled | loading |
|---------|----------|------------|--------|--------|---------|-------|--------|----------|---------|
| Primary | | | | | | | | | |
| Secondary | | | | | | | | | |
| Ghost | | | | | | | | | |
| Destructive | | | | | | | | | |
| Link | | | | | | | | | |

- [ ] **Every cell filled?** Empty cells = missing states = AI incomplete.
- [ ] **Hover transition**: `transition-colors duration-150` or similar? Instant change = 🔴 cheap.
- [ ] **Focus ring**: visible for keyboard nav? `focus-visible:ring-2 ring-offset-2`?
- [ ] **Loading state**: spinner + "Đang xử lý..." text? Or just disabled?

### 8.4 Form System
- [ ] Input height: consistent everywhere? Measure actual px.
- [ ] Input border: same as card border? Or distinct?
- [ ] Input focus: brand-color ring/border?
- [ ] Label position: above (✅) or floating (🟡 risky) or placeholder-only (🔴 bad UX)?
- [ ] Error: red border + error text below + icon?
- [ ] Success: green border/check?
- [ ] Character count: for writing practice textarea?
- [ ] **Mobile keyboard type**: `inputmode="email"` for email? `inputmode="numeric"` for OTP?

---

## PHẦN 9: ANIMATION & DELIGHT — THE EMOTION LAYER
### 🧠 Behavioral Designer + 🎨 Product Designer

> **Peak-End Rule (Kahneman)**: Users judge experience by PEAK moment + END moment.
> If the peak sucks and the end sucks → entire experience rated as bad,
> even if 90% of it was fine.

### 9.1 Peak Moments Audit
- [ ] **Peak positive moment**: Khi user đạt kết quả tốt (Band 7.0+):
  - Animation: confetti? fireworks? Lintopus celebrating?
  - Sound: success chime? applause?
  - Text: celebratory message?
  - Shareability: can screenshot and share?
  - **Rate peak celebration: 1-10** (1 = just text, 10 = Duolingo owl celebration level)

- [ ] **Peak achievement moment**: Khi unlock achievement/rank up:
  - Modal/overlay appearance?
  - Animation quality?
  - Badge design quality?
  - **Rate: 1-10**

- [ ] **Peak social moment**: Khi win battle:
  - Winner celebration?
  - Opponent shown?
  - Rank change visible?
  - **Rate: 1-10**

- [ ] 🔴 **If ALL peak moments are just text/static screen → app has NO emotional peaks → forgettable**

### 9.2 End Moments Audit (Session End)
- [ ] User finishes practice → what's the LAST thing they see?
  - Summary screen? Stats? Next recommendation?
  - Or: just redirected to dashboard? (anti-climactic)
  - **Ideal end**: "Hôm nay bạn đã: ✅ Reading 7/10 đúng, ✅ Học 12 từ mới, 🔥 Streak ngày 5! Ngày mai: Speaking Part 2 đang chờ!"
  - **Actual end**: describe exactly what happens

- [ ] **Daily session end**:
  - Goal completed → celebration? Or just... stop?
  - "See you tomorrow" moment? (Duolingo owl waves goodbye)
  - Tomorrow's preview? (creates anticipation = return trigger)

### 9.3 Sound Design
```bash
find src public -name "*.mp3" -o -name "*.wav" -o -name "*.ogg" -o -name "*.m4a" 2>/dev/null
```
- [ ] **Sound files found**: _____ (list them)
- [ ] Correct answer sound?
- [ ] Wrong answer sound?
- [ ] Level up / achievement sound?
- [ ] Button tap feedback sound? (optional but premium)
- [ ] Timer warning sound?
- [ ] Battle win/lose sound?
- [ ] 🔴 ZERO sound files → app is MUTE → missing entire emotional channel
- [ ] Sounds have mute/volume option? (important for public use)

### 9.4 Transition Quality
From Phần 0 data (0.12):
- [ ] **Count of transition/animation classes**: _____
  - < 10 total uses → 🔴 app feels static/dead
  - 10-30 uses → 🟡 some motion but probably inconsistent
  - 30+ thoughtful uses → ✅ polished
  
- [ ] **Transition duration consistency**:
  - All buttons: same duration?
  - All modals: same duration?
  - 🔴 Mix of `duration-100`, `duration-200`, `duration-300`, `duration-500` randomly → no system
  - Standard: 150ms for micro (hover, color change), 200-300ms for medium (modal, drawer), 300-500ms for large (page transition)

### 9.5 Loading Experience
- [ ] **Skeleton loaders present?**
  ```bash
  grep -rn "skeleton\|Skeleton\|shimmer\|pulse\|animate-pulse" src/ --include="*.tsx" | grep -v node_modules | wc -l
  ```
  - Count: _____. For how many async-loading components?
  - Every API-dependent component needs skeleton.
  - Skeleton shape matches content shape?
  - Skeleton color matches theme (not default gray)?
  - Shimmer animation (left-to-right gradient sweep)?
  - 🔴 Using spinner instead of skeleton → dated. Skeleton is 2024+ standard.
  - 🔴 No loading state at all → content pops in → CLS (layout shift) → cheap feeling

---

## PHẦN 10: EMPTY, ERROR & EDGE — THE GAPS THAT KILL TRUST
### 🔬 UX Researcher + 🧠 Behavioral Designer

> Users don't remember when things work. They ALWAYS remember when things break.
> Empty states and errors are where trust is won or lost.

### 10.1 Empty State Inventory
For EVERY screen with dynamic content:
```bash
grep -rn "empty\|Empty\|no data\|noData\|no result\|nothing\|không có\|chưa có\|trống\|zero\|\.length === 0\|\.length == 0" src/ --include="*.tsx" -i | grep -v node_modules
```

Check each screen:
| Screen | Has Empty State? | Has Illustration? | Has CTA? | Has Personality? | Quality (1-5) |
|--------|-----------------|-------------------|----------|-----------------|---------------|
| Dashboard (first login) | | | | | |
| Reading practice list | | | | | |
| Speaking recordings | | | | | |
| Writing submissions | | | | | |
| Vocabulary/wordlist | | | | | |
| Battle history | | | | | |
| Friends list | | | | | |
| Notifications | | | | | |
| Achievements (locked) | | | | | |
| Chat messages | | | | | |
| Leaderboard | | | | | |
| Search results | | | | | |

- [ ] 🔴 ANY screen with blank white space when empty → CRITICAL
- [ ] **Personality in empty states?** Lintopus mascot saying something? Humor? Encouragement?
  - "Chưa có bạn nào! Invite bạn bè để battle nhé 🐙" → ✅
  - "No friends found" → 🔴 cold, robotic

### 10.2 Error State Inventory
- [ ] **404 page**: custom design? File exists?
  ```bash
  find src -name "not-found*" -o -name "404*" | head -5
  ```
- [ ] **Error boundary**: React error boundary implemented?
  ```bash
  grep -rn "ErrorBoundary\|error.tsx\|error boundary" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules
  ```
- [ ] **API error handling pattern**: How are API errors displayed?
  ```bash
  grep -rn "catch\|\.catch\|onError\|isError\|error" src/ --include="*.tsx" | grep -v node_modules | head -30
  ```
  - User-friendly message? Or raw error string?
  - 🔴 `error.message` displayed to user → could show "TypeError: Cannot read property 'x' of undefined" → instant trust kill

### 10.3 Edge Case Stress Test
- [ ] **Text overflow**:
  ```bash
  grep -rn "truncate\|text-ellipsis\|overflow-hidden\|line-clamp" src/ --include="*.tsx" | grep -v node_modules | wc -l
  ```
  - Count: _____. Are text overflows handled? Or does text break layout?
  - Test with: username "Nguyễn Thị Phương Thảo Anh Đức Minh" (30+ chars)
  - Test with: passage title 100+ chars

---

## PHẦN 11: PERFORMANCE — VIETNAM NETWORK REALITY
### 💰 Growth PM + 🔬 UX Researcher

> Vietnamese users: 4G average speed ~20-35 Mbps, but VERY variable.
> In crowded areas (university, cafe): drops to 3-5 Mbps.
> 1 extra second load time → 7% conversion drop (Google data).
> 3 second load time → 53% mobile users abandon (Google data).

### 11.1 Bundle Analysis
```bash
# Build and check
npx next build 2>&1 | tail -50

# Check largest chunks
find .next -name "*.js" -exec ls -la {} \; 2>/dev/null | sort -k5 -rn | head -20
```

- [ ] Total First Load JS: _____ KB
  - < 100KB = ✅ excellent
  - 100-200KB = 🟡 OK
  - > 200KB = 🔴 too heavy for 3G
  
- [ ] Largest single chunk: _____ KB
  - > 100KB = needs code splitting
  
- [ ] **Route-based code splitting**: enabled by default in Next.js, but verify no giant shared chunks

### 11.2 Image Optimization
- [ ] Using `next/image` component everywhere?
  ```bash
  grep -rn "<img " src/ --include="*.tsx" | grep -v node_modules | wc -l
  grep -rn "next/image\|<Image " src/ --include="*.tsx" | grep -v node_modules | wc -l
  ```
  - Raw `<img>` count: _____. Each one = missed optimization.
  - `<Image>` count: _____. Should be 100% of images.
  
- [ ] Image formats: WebP/AVIF served?
- [ ] Image sizes: largest image file? Not serving 2000px for 200px container?
- [ ] Lintopus SVG: file size? Optimized? (SVGs can be huge if exported from Figma raw)

### 11.3 Perceived Performance
- [ ] **Optimistic UI updates**: 
  - Like/save/complete → instant visual update before API confirms?
  - Or: click → loading → update? (feels slow)
- [ ] **Prefetching**: Next.js Link prefetch enabled?
- [ ] **Above-the-fold priority**: Critical content loads before below-fold?

### 11.4 3G Simulation
- [ ] Chrome DevTools → Network → Slow 3G → Load Lingona
  - Time to first meaningful content: _____ seconds
  - Time to interactive: _____ seconds
  - Can user START doing something within 5 seconds?
  - 🔴 > 5 seconds to interactive on 3G = lost users in VN market

---

## PHẦN 12: SECURITY & CODE QUALITY
### 🔬 UX Researcher (Trust Perspective)

### 12.1 Exposed Secrets (CRITICAL)
```bash
grep -rn "sk-\|api[_-]key\|secret\|SECRET\|password\|PASSWORD\|token.*=.*['\"]" src/ --include="*.tsx" --include="*.ts" --include="*.js" | grep -v node_modules | grep -v ".env" | grep -v "type\|interface\|placeholder"
```
- [ ] **Results**: _____ (list any found → EACH ONE IS CRITICAL 🔴)

### 12.2 AI Smell — Code Patterns
From Phần 0 data:
- [ ] Console.log count: _____. Target: 0 in production components.
- [ ] `any` type count: _____. Target: < 5.
- [ ] `eslint-disable` count: _____. Target: 0.
- [ ] TODO/FIXME count: _____. Each one → read and evaluate: stale or active?
- [ ] Obvious AI comments count: _____. Target: 0. REMOVE ALL.
  - "// This function handles..." → everyone can see what a function does
  - "// Render the component" → literally every component renders
  - "// Initialize state" → we know what useState does

### 12.3 Component Health
From Phần 0 data (0.19):
- [ ] Files > 500 lines: _____ (list them → MUST split)
- [ ] Files > 300 lines: _____ (list them → should split)
- [ ] Largest file: _____ lines → review for SRP violations

### 12.4 Dead Code
```bash
# Find potentially unused exports
grep -roh "export \(default \)\?function [A-Za-z]*\|export \(default \)\?const [A-Za-z]*" src/ --include="*.tsx" --include="*.ts" | sort | while read -r line; do
  name=$(echo "$line" | awk '{print $NF}')
  count=$(grep -rn "$name" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l)
  if [ "$count" -le 1 ]; then
    echo "POTENTIALLY UNUSED: $name ($count references)"
  fi
done
```
- [ ] Dead code found: _____ functions/components (list them)

---

## PHẦN 13: SEO & SOCIAL SHARING — FREE GROWTH
### 💰 Growth PM

### 13.1 Technical SEO
- [ ] Meta titles per page:
  ```bash
  grep -rn "title\|metadata" src/app/**/page.tsx src/app/**/layout.tsx 2>/dev/null | head -30
  ```
  - Every page has unique title? Or all "Lingona"?
  - Title format: "Luyện IELTS Speaking AI | Lingona" (keyword + brand)
  
- [ ] `sitemap.xml`:
  ```bash
  cat public/sitemap.xml 2>/dev/null || echo "NO SITEMAP"
  ```
  
- [ ] `robots.txt`:
  ```bash
  cat public/robots.txt 2>/dev/null || echo "NO ROBOTS.TXT"
  ```

- [ ] Vietnamese language declared: `<html lang="vi">`?

### 13.2 Social Sharing — Vietnamese Market Critical
> Vietnamese users share links on Zalo, Facebook Messenger, Facebook feed.
> Share preview card = FREE advertising. Must be beautiful.

- [ ] **OG tags present per page?**
  ```bash
  grep -rn "openGraph\|og:\|twitter:" src/app/ --include="*.tsx" --include="*.ts"
  ```
- [ ] **OG image**: exists? dimensions? quality?
  - 1200×630px minimum
  - Clear text visible at small size (thumbnail)
  - Lingona branding visible
  - Compelling hook text
  
- [ ] **Zalo-specific**: Zalo uses OG tags but has quirks:
  - Title ≤ 100 chars (truncation)
  - Description ≤ 200 chars
  - Image must be absolute URL

### 13.3 Share-Worthy Moments (built-in virality)
- [ ] Band score result → "Share your score" button?
  - Generates pretty share card?
  - Pre-filled text: "Mình vừa đạt Band 7.0 trên Lingona! 🎯"?
  - Link back to Lingona?
  
- [ ] Streak milestone → share prompt?
- [ ] Rank up → share prompt?
- [ ] Battle win → share prompt?
- [ ] 🔴 No share functionality = zero viral coefficient = 100% paid acquisition dependency

---

## PHẦN 14: ACCESSIBILITY — ETHICAL REQUIREMENT
### 🔬 UX Researcher

> Not optional. Not nice-to-have. Users with disabilities deserve access to IELTS prep.
> Also: accessibility improvements benefit ALL users (larger targets, better contrast, keyboard nav).

- [ ] **Alt text**: every `<img>` and decorative SVG:
  ```bash
  grep -rn "<img\|<Image" src/ --include="*.tsx" | grep -v "alt=" | grep -v node_modules
  ```
  Missing alt count: _____

- [ ] **Form labels**: every input has label:
  ```bash
  grep -rn "<input\|<Input\|<textarea\|<select" src/ --include="*.tsx" | grep -v "aria-label\|htmlFor\|<label" | grep -v node_modules | head -20
  ```
  
- [ ] **Focus management**:
  - Tab through entire app → logical order?
  - Focus visible on EVERY interactive element?
  - Modal opens → focus moves to modal?
  - Modal closes → focus returns to trigger?
  
- [ ] **Screen reader**: Headings hierarchy (h1→h2→h3, one h1 per page)?
  ```bash
  grep -roh "<h[1-6]" src/ --include="*.tsx" | sort | uniq -c | sort -rn
  ```

- [ ] **Reduced motion**:
  ```bash
  grep -rn "prefers-reduced-motion\|motion-reduce" src/ --include="*.tsx" --include="*.css" | grep -v node_modules
  ```
  - Count: _____. Should respect user's motion preferences.

---

## PHẦN 15: CONSISTENCY — THE CROSS-PAGE TEST
### 🎨 Product Designer

> Pick 5 random pages. Open side by side. EVERYTHING must match.
> This test alone reveals 50% of design system failures.

Pick these 5 pages: Landing, Dashboard, Reading Practice, Battle, Profile

| Element | Landing | Dashboard | Reading | Battle | Profile | Consistent? |
|---------|---------|-----------|---------|--------|---------|-------------|
| Heading font | | | | | | |
| Heading size (h1) | | | | | | |
| Heading weight | | | | | | |
| Body font size | | | | | | |
| Primary button style | | | | | | |
| Card border-radius | | | | | | |
| Card shadow | | | | | | |
| Card padding | | | | | | |
| Section spacing | | | | | | |
| Background color | | | | | | |
| Icon library | | | | | | |
| Icon size | | | | | | |
| Input style | | | | | | |
| Link color | | | | | | |
| Error display | | | | | | |

- [ ] **Inconsistencies found**: _____ (list each one → EACH IS A DESIGN SYSTEM FAILURE)
- [ ] 🔴 > 5 inconsistencies = no design system = looks like different people/AIs built different pages

---

## PHẦN 16: ILLUSTRATION & VISUAL IDENTITY
### 🎨 Product Designer

### 16.1 Illustration Style Consistency
- [ ] Lintopus mascot: what style? (vector flat? detailed? 3D? hand-drawn?)
- [ ] Other illustrations: same style as Lintopus?
  - Empty state illustrations?
  - Error page illustrations?
  - Onboarding illustrations?
  - Achievement badges?
  - Rank icons?
  - 🔴 Mixed illustration styles (Lintopus is flat vector but badges are 3D) → immediately looks like different sources → AI assembled

### 16.2 Brand Application
- [ ] Logo: present in header/sidebar? Consistent size?
- [ ] Favicon: matches logo at 16×16?
- [ ] Color palette: applied consistently across all visual elements?
- [ ] Brand personality: fun but trustworthy, young but professional — does EVERY element convey this?

---

## PHẦN 17: VIETNAM-SPECIFIC UX
### 💰 Growth PM + 🧠 Behavioral Designer

> Target: sinh viên Việt Nam 18-25. Their digital habits are SPECIFIC.

### 17.1 Vietnamese Digital Behavior
- [ ] **Facebook login**: present? (most VN users have FB, many don't have Google accounts)
- [ ] **Zalo login**: present? (Zalo = dominant messaging app in VN)
- [ ] **Phone number auth**: present? (many VN users prefer phone over email)
- [ ] 🔴 Only email/password login = friction for VN market

### 17.2 Payment
- [ ] MoMo integration: planned (8-12h work). But:
  - MoMo is dominant mobile payment in VN
  - ZaloPay also significant
  - Bank transfer (QR code) also common
  - Credit card LESS common among students
  - **Payment options planned**: list them. ≥ 2 methods essential.

### 17.3 Vietnamese Language Quality
- [ ] ALL UI text in Vietnamese: natural tone?
  - 🔴 Google Translate quality Vietnamese → instant trust kill
  - Should sound like a friend, not a textbook
  - "Bạn ơi" vs "Người dùng" → the first is Vietnamese, the second is translation
- [ ] Vietnamese gen Z slang: appropriate use? (not too much, not too formal)
- [ ] Currency format: "179.000đ" not "179,000 VND" (Vietnamese convention)
- [ ] Date format: "13/04/2026" not "04/13/2026" (VN = DD/MM/YYYY)
- [ ] Number format: "1.000.000" not "1,000,000" (VN uses dot as thousands separator)

---

## PHẦN 18: THE "NOT AI" FINAL TEST
### All 4 Perspectives Combined

> Bài test cuối cùng. Cho 5 người xem app 30 giây rồi hỏi:
> "App này do team bao nhiêu người làm? Do AI generate không?"
> Nếu ai nói "AI" → FAIL.

### 18.1 AI Smell Composite Score
From ALL data collected, count:
- [ ] Default Inter/system font: +3 points
- [ ] No letter-spacing anywhere: +2 points
- [ ] Same line-height everywhere: +2 points
- [ ] Only bold/normal weights: +1 point
- [ ] Hardcoded hex colors (>10 instances): +2 points
- [ ] Default Tailwind colors used raw: +2 points
- [ ] Mixed icon libraries: +2 points
- [ ] Mixed border-radius values (>4): +1 point
- [ ] Obvious comments in code (>20): +1 point
- [ ] Console.logs in production (>5): +1 point
- [ ] `any` types (>10): +1 point
- [ ] No animations/transitions: +3 points
- [ ] No sound design: +1 point
- [ ] No custom empty states: +2 points
- [ ] Default error pages: +2 points
- [ ] No celebrations/delight moments: +2 points
- [ ] Mixed illustration styles: +2 points
- [ ] z-index: 9999 anywhere: +1 point

**AI Smell Score: _____/30**
- 0-5: ✅ Human-made. Ship it.
- 6-10: 🟡 Some tells. Fixable in 1-2 days.
- 11-15: 🟠 Obviously AI-assisted. Needs 1 week of polish.
- 16-20: 🔴 Obviously AI-generated. Needs significant overhaul.
- 21-30: ☠️ Default AI template. Complete redesign.

---

## FINAL SCORING

| # | Category | Score (/10) | Evidence Summary |
|---|----------|-------------|------------------|
| 1 | Visceral Response (3-second test) | /10 | |
| 2 | Behavioral Design (habit hooks) | /10 | |
| 3 | Cognitive Psychology (load, laws) | /10 | |
| 4 | Growth Funnel (AARRR) | /10 | |
| 5 | Mobile Safari Compatibility | /10 | |
| 6 | Typography | /10 | |
| 7 | Color System | /10 | |
| 8 | Component System | /10 | |
| 9 | Animation & Delight | /10 | |
| 10 | Empty/Error/Edge States | /10 | |
| 11 | IELTS-Specific UX | /10 | |
| 12 | Performance | /10 | |
| 13 | Security & Code Quality | /10 | |
| 14 | SEO & Social Sharing | /10 | |
| 15 | Accessibility | /10 | |
| 16 | Cross-Page Consistency | /10 | |
| 17 | Visual Identity | /10 | |
| 18 | Vietnam-Specific UX | /10 | |
| 19 | "Not AI" Score (inverted: 10 = human) | /10 | |
| | **TOTAL** | **/190** | |

### Grading:
- **171-190 (90%+)**: **S-Tier** — Duolingo/Notion level. Investors would fund this on sight.
- **152-170 (80-89%)**: **A-Tier** — Strong startup. Senior devs impressed. Ready for growth.
- **133-151 (70-79%)**: **B-Tier** — Good indie product. Gaps visible to trained eye.
- **114-132 (60-69%)**: **C-Tier** — MVP. Usable but not impressive. Not launch-ready for paid marketing.
- **< 114 (<60%)**: **D-Tier** — Needs fundamental rework before public launch.

---

## PRIORITY FIX ORDER (ABSOLUTE)

### Tier 0 — FIX BEFORE ANYTHING ELSE (blocks launch):
1. Safari-breaking bugs (100vh, input zoom, safe area)
2. Security issues (exposed secrets)
3. Broken core flows (signup → first practice → feedback)

### Tier 1 — FIX BEFORE LAUNCH (1-2 weeks):
4. "Obviously AI" smell items (AI Score > 10)
5. Empty states for core screens
6. Custom error pages
7. Typography overhaul (if using defaults)
8. Mobile Safari polish

### Tier 2 — FIX FOR GROWTH (post-launch sprint):
9. Push notifications / triggers
10. Share cards for viral moments
11. Sound design (basic set)
12. Celebration animations for peak moments
13. Social login (Facebook/Zalo)

### Tier 3 — CONTINUOUS IMPROVEMENT:
14. Advanced behavioral design (variable rewards, loss aversion refinement)
15. Full accessibility audit
16. Performance optimization for 3G
17. SEO content strategy
18. Referral system

---

## FINAL DIRECTIVE

KHÔNG ĐƯỢC:
- Skip bất kỳ section nào
- Nói "looks good" mà không paste EVIDENCE (code, screenshot, measurement)
- Cho điểm > 7/10 bất kỳ category nào mà không justify với specific examples
- Assume thứ gì đó hoạt động mà không chạy command verify
- Đoán thay vì đo

PHẢI:
- Paste actual code snippets cho mỗi issue
- Đo actual pixel values, không ước lượng
- Count actual numbers (colors, fonts, sizes), không "có vẻ nhiều"
- So sánh CỤ THỂ với Duolingo, Elsa Speak, hoặc IELTS Prep apps
- Ghi evidence cho MỖI điểm trong scoring table

MỖI ĐÁNH GIÁ PHẢI CÓ FORMAT:
```
### [🔴|🟡|🟢|💡] [CATEGORY] > [SUBCATEGORY]
**Lens**: 🧠 Behavioral | 🔬 UX Research | 💰 Growth | 🎨 Design
**File**: `src/path/file.tsx:42`
**Issue**: [MÔ TẢ CỤ THỂ]
**Psychology**: [TẠI SAO đây là vấn đề theo tâm lý học]
**Current**: [CODE/BEHAVIOR HIỆN TẠI — paste actual code]
**Should be**: [CODE/BEHAVIOR NÊN CÓ — write actual fix]
**Effort**: XS (<15m) | S (<1h) | M (<4h) | L (<1d) | XL (>1d)
**Impact**: [CỤ THỂ ảnh hưởng gì đến user behavior/metrics]
**AI Smell**: 🟢 | 🟡 | 🔴
**Safari**: ✅ | ⚠️ | 🔴
```

BẮT ĐẦU TỪ PHẦN 0. Chạy MỌI command. Ghi data. Rồi audit từng phần.
Không rush. Không skip. Không lenient. Đây là sản phẩm sẽ launch cho hàng nghìn người Việt Nam dùng.
Mỗi bug bạn bỏ qua = một user mất. Mỗi pixel bạn không sửa = một impression bị phí.

AUDIT NHƯ THỂ REPUTATION CỦA BẠN PHỤ THUỘC VÀO NÓ. VÌ NÓ ĐÚNG NHƯ VẬY.
