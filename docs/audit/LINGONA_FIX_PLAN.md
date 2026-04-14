# LINGONA — POST-AUDIT FIX PLAN
# Dựa trên Final Audit Report (91/230, D-Tier → Target: B-Tier 170+)
# Mỗi phase là 1 Claude Code session. Copy-paste từng phase.

═══════════════════════════════════════════════════════════════
PHASE 1: TIER 0 — SAFARI & CRITICAL BUGS (8 fixes)
═══════════════════════════════════════════════════════════════

Đọc tất cả SKILL.md trong folder .claude/skills/ trước khi làm bất cứ thứ gì.
Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md để hiểu context.
Đọc /tmp/LINGONA_FINAL_AUDIT_REPORT.md — phần E, Tier 0.

Thực hiện 8 fixes theo đúng thứ tự:

FIX 1: Input font-size Safari zoom bug
- File: frontend/components/ui/Input.tsx
- Vấn đề: text-sm (14px) → Safari tự động zoom khi user tap vào input
- Fix: đổi text-sm thành text-base (16px) cho MỌI input variant
- Kiểm tra: grep tất cả input/textarea/select trong project, đảm bảo KHÔNG CÒN text-sm/text-xs trên bất kỳ form element nào
- Test: mở trên viewport 390px, tap input, KHÔNG được zoom

FIX 2: prefers-reduced-motion
- File: frontend/app/globals.css
- Vấn đề: WCAG violation, 5% users bị motion sickness
- Fix: thêm vào cuối globals.css:
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

FIX 3: min-h-screen → min-h-dvh
- Vấn đề: 100vh trên iOS Safari bao gồm thanh address bar → content bị che
- Fix: tìm TẤT CẢ instances của min-h-screen và h-screen trong project
  grep -rn "min-h-screen\|h-screen" frontend/ --include="*.tsx" --include="*.css"
  Thay bằng min-h-dvh / h-dvh
  Thêm vào globals.css fallback: 
  @supports not (min-height: 100dvh) { .min-h-dvh { min-height: -webkit-fill-available; } }

FIX 4: Remove gradient text from hero
- File: frontend/components/landing/HeroSection.tsx (line ~40)
- Vấn đề: gradient text = AI smell #1, absolute ban
- Fix: tìm span có bg-gradient-to-r + bg-clip-text + text-transparent
  Thay bằng solid color: text-white hoặc text-teal-400 (brand color)
  Giữ text content, chỉ đổi styling

FIX 5: viewport-fit=cover + safe-area-inset
- File 1: frontend/app/layout.tsx
  Trong <meta name="viewport">, thêm viewport-fit=cover:
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  
- File 2: frontend/components/navigation/BottomNav.tsx
  Thêm padding-bottom: env(safe-area-inset-bottom) để BottomNav không bị home indicator che
  className thêm: pb-[env(safe-area-inset-bottom)]
  Hoặc trong CSS: padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));

- File 3: frontend/app/globals.css
  Thêm:
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  }

FIX 6: Error boundaries
- Tạo frontend/app/error.tsx — React error boundary cho toàn app
  "use client";
  Hiển thị friendly error với Lintopus mascot
  Text tiếng Việt: "Ối, có lỗi xảy ra rồi! 🐙 Bạn thử tải lại trang nhé!"
  Có nút "Tải lại"
  
- Tạo frontend/app/not-found.tsx — 404 page
  Hiển thị Lintopus với text: "Trang này không tồn tại! 🐙 Để mình đưa bạn về trang chính nhé!"
  Có nút "Về trang chính"

- Tạo frontend/app/(app)/error.tsx — error boundary cho app routes
  Tương tự root error.tsx nhưng trong app layout

FIX 7: Remove redundant Google Fonts @import
- File: frontend/app/globals.css (line ~6)
- Vấn đề: đang import Google Fonts qua @import trong CSS, nhưng đã dùng next/font → duplicate request
- Fix: xóa dòng @import url('https://fonts.googleapis.com/...')

FIX 8: Tap highlight transparent
- File: frontend/app/globals.css
- Vấn đề: Safari hiện gray flash mỗi lần tap
- Fix: thêm vào globals.css:
  * { -webkit-tap-highlight-color: transparent; }

Sau khi fix xong 8 items:
- Chạy npm run build để verify không có errors
- Liệt kê tất cả changes đã làm
- Confirm mỗi fix đã applied đúng


═══════════════════════════════════════════════════════════════
PHASE 2: VIETNAMESE TRANSLATION SPRINT
═══════════════════════════════════════════════════════════════

Đọc tất cả SKILL.md trong folder .claude/skills/ trước khi làm bất cứ thứ gì.
Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — phần V (Micro-Copy Bible) cho giọng văn.

QUAN TRỌNG: Giọng văn Lintopus = Doraemon. Thân thiện, warm, gen Z Vietnamese.
- "Bạn ơi" KHÔNG "Người dùng thân mến"
- "Sẵn sàng nói chưa?" KHÔNG "Ready to speak?"
- "Chưa có bài nào đâu! Bắt đầu luyện nào 🐙" KHÔNG "No items yet"
- Emoji OK nhưng vừa phải (1-2 per message max)

Tìm TẤT CẢ English UI text trong frontend/:
grep -rn '"[A-Z][a-z].*"' frontend/components/ --include="*.tsx" | grep -v import | grep -v className | grep -v node_modules | grep -v ".next"

Dịch TỪNG file, ưu tiên theo thứ tự:

BATCH 1 — Empty states (user thấy ngay khi chưa có data):
- Tất cả "No X yet" → "Chưa có [X] nào! 🐙" + CTA tiếng Việt
- "No chats yet" → "Chưa có tin nhắn nào! Nhắn cho bạn bè nhé 🐙"
- "No friends yet" → "Chưa có bạn bè! Mời bạn cùng luyện nhé 🐙"
- "No battle history" → "Chưa có trận đấu nào! Thử sức nhé 🐙"
- "No achievements yet" → "Chưa có thành tựu! Luyện thêm để mở khóa nhé 🐙"
- Tương tự cho MỌI empty state tìm được

BATCH 2 — Buttons & Actions:
- "Submit" → "Nộp bài"
- "Submit Answers" → "Nộp bài"
- "Continue" → "Tiếp tục"
- "Done" → "Hoàn thành"
- "Start" → "Bắt đầu"
- "Cancel" → "Hủy"
- "Save" → "Lưu"
- "Delete" → "Xóa"
- "Edit" → "Chỉnh sửa"
- "Back" → "Quay lại"
- "Next" → "Tiếp theo"
- "Try Again" → "Thử lại"
- "Give it a another try" → "Thử lại nhé" (fix typo luôn)
- "Loading..." → "Đang tải..."
- "Ready to speak?" → "Sẵn sàng nói chưa? 🐙"

BATCH 3 — Headers & Labels:
- "Practice" → "Luyện tập"
- "Speaking" → "Nói" hoặc giữ "Speaking" (IELTS term)
- "Writing" → "Viết" hoặc giữ "Writing"
- "Reading" → "Đọc" hoặc giữ "Reading"  
- "Listening" → "Nghe" hoặc giữ "Listening"
- "Battle" → "Đấu trường" hoặc giữ "Battle"
- "Profile" → "Hồ sơ"
- "Settings" → "Cài đặt"
- "Achievements" → "Thành tựu"
- "Leaderboard" → "Bảng xếp hạng"
- "Friends" → "Bạn bè"
- LƯU Ý: IELTS terms (Speaking, Writing, Reading, Listening, Band) GIỮ NGUYÊN tiếng Anh vì đó là thuật ngữ chuyên ngành

BATCH 4 — Feedback & Messages:
- Correct answer messages → theo Micro-Copy Bible: "Đúng rồi! 🐙" variations
- Wrong answer messages → "Chưa đúng — [lý do]. Lần sau bạn sẽ nhớ! 🐙"
- Success messages → celebratory Vietnamese
- Error messages → friendly Vietnamese + Lintopus

BATCH 5 — Monetization:
- UpgradeTrigger.tsx: thay copy thành:
  "Hết lượt cho hôm nay rồi! 🐙 Nếu bạn thấy app thật sự giúp ích, cùng mình đi tới Pro nhé! Mách nhỏ: rẻ hơn trung tâm ngoài kia nhiều lắm 😉"
- ProUpgradeModal.tsx: thêm soul-aligned copy
- PricingSection: giá hiện 179.000đ format đúng VN convention (dấu chấm ngàn)

BATCH 6 — Date & Number formats:
- Tìm mọi date formatting, đổi từ en-US sang vi-VN (DD/MM/YYYY)
- Tìm mọi number formatting, đổi sang VN convention (dấu chấm cho ngàn: 1.000)
- grep -rn "toLocaleDateString\|toLocaleString\|Intl\.\|en-US\|en_US" frontend/ --include="*.tsx" --include="*.ts"

Sau khi dịch xong:
- Chạy npm run build
- Liệt kê tổng số strings đã dịch
- Grep lại xem còn English UI text nào sót không


═══════════════════════════════════════════════════════════════
PHASE 3: LINTOPUS EVERYWHERE
═══════════════════════════════════════════════════════════════

Đọc tất cả SKILL.md trong folder .claude/skills/ trước khi làm bất cứ thứ gì.
Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — phần II (Lintopus behavior), phần IV (Soul Decisions).

Lintopus cần xuất hiện ở 20+ locations. Hiện có 6. Thêm 14+.

TRƯỚC TIÊN: tìm Mascot/Lintopus component hiện có:
grep -rn "Mascot\|Lintopus\|lintopus\|mascot" frontend/ --include="*.tsx" | grep -v node_modules

Hiểu component API trước, rồi thêm vào các locations sau:

GROUP 1 — 14 Empty States (thêm Lintopus + CTA + illustration):
Mỗi empty state cần:
- Lintopus mascot image/component
- Text tiếng Việt soul-aligned (đã dịch ở Phase 2)
- CTA button dẫn user tới action
- Layout: centered, mascot trên, text giữa, CTA dưới

Tìm tất cả empty states:
grep -rn "empty\|no data\|no result\|nothing\|chưa có\|Chưa có" frontend/ --include="*.tsx" -i | grep -v node_modules

Cho MỖI empty state tìm được → thêm Lintopus component.

GROUP 2 — 5 Celebration/Reward moments:
1. Correct answer streak (5 đúng liên tiếp) → Lintopus: "Ủa giỏi dữ! 🐙🔥"
2. Level up / Rank up → Lintopus celebration animation
3. Achievement unlock → Lintopus: "Mở khóa thành tựu [tên]! 🐙🏆"
4. Battle win → Lintopus: "Trận hay! Bạn tiến bộ rất nhiều! 🐙🎉"
5. Band score tăng → Lintopus: "Tiến bộ rồi nè! 🐙"

Tìm reward/celebration components:
grep -rn "reward\|celebration\|level.?up\|rank.?up\|achievement\|badge\|congratul" frontend/ --include="*.tsx" -i | grep -v node_modules

GROUP 3 — Paywall/Monetization:
1. UpgradeTrigger.tsx → thêm Lintopus cạnh message
2. ProUpgradeModal.tsx → thêm Lintopus ở header
3. PricingSection → thêm Lintopus nhỏ cạnh pricing cards

GROUP 4 — Error states:
1. error.tsx (đã tạo Phase 1) — verify Lintopus có trong đó
2. not-found.tsx (đã tạo Phase 1) — verify Lintopus có trong đó
3. LeaderboardClient.tsx error state → thêm Lintopus + fix typo "Give it a another try" → "Thử lại nhé 🐙"
4. Mọi API error fallback → thêm Lintopus

GROUP 5 — Positive moments (70% appearances):
1. Daily login greeting → "Chào buổi sáng! 🐙" (vary mỗi ngày)
2. Session complete → Lintopus summary
3. Streak milestone (7, 30, 100 ngày) → special Lintopus celebration

Sau khi xong:
- Count: grep -rn "Mascot\|Lintopus\|lintopus\|mascot" frontend/ --include="*.tsx" | grep -v node_modules | wc -l
- Target: ≥ 20 locations (từ 6 hiện tại)
- npm run build verify


═══════════════════════════════════════════════════════════════
PHASE 4: ANALYTICS + PWA + INFRASTRUCTURE
═══════════════════════════════════════════════════════════════

Đọc tất cả SKILL.md trong folder .claude/skills/ trước khi làm bất cứ thứ gì.

TASK 1: PWA Manifest
- Tạo frontend/public/manifest.json:
  {
    "name": "Lingona - Luyện IELTS cùng AI",
    "short_name": "Lingona",
    "description": "Luyện IELTS Speaking, Writing, Reading cùng AI và Lintopus 🐙",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0f172a",
    "theme_color": "#00A896",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  
- Thêm vào frontend/app/layout.tsx <head>:
  <link rel="manifest" href="/manifest.json" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="theme-color" content="#00A896" />
  <link rel="apple-touch-icon" href="/icon-192.png" />

- Kiểm tra icon files tồn tại trong public/, nếu không có thì tạo placeholder

TASK 2: Analytics (PostHog hoặc custom)
- Nếu không muốn third-party: tạo simple analytics wrapper
  frontend/lib/analytics.ts:
  export function trackEvent(name: string, properties?: Record<string, any>) {
    // Log to console in dev, send to backend in prod
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', name, properties);
    }
    // TODO: send to backend endpoint /api/analytics/track
  }

- Thêm tracking events vào critical points:
  1. Signup complete → trackEvent('signup_complete')
  2. Onboarding complete → trackEvent('onboarding_complete', { band: score })
  3. First practice complete → trackEvent('first_practice_complete', { skill: type })
  4. Daily limit hit → trackEvent('daily_limit_hit', { skill: type })
  5. Pro upgrade click → trackEvent('pro_upgrade_click', { source: location })
  6. Battle complete → trackEvent('battle_complete', { result: win/lose })
  7. Session start → trackEvent('session_start')
  8. Session end → trackEvent('session_end', { duration: seconds })

TASK 3: Session End Teaser
- File: tìm completion/result screen component
- Thêm "next session" teaser ở cuối:
  "Hôm nay bạn đã: ✅ [summary]. 
   Ngày mai: [next recommended practice] đang chờ bạn! 🐙"
- Tạo open loop cho D1 return

TASK 4: Leaderboard Error Fix
- File: LeaderboardClient.tsx
- Fix typo: "Give it a another try" → "Thử lại nhé 🐙"
- Thêm Lintopus + retry button
- Thêm proper error message tiếng Việt

Sau khi xong: npm run build verify


═══════════════════════════════════════════════════════════════
PHASE 5: DESIGN SYSTEM CLEANUP
═══════════════════════════════════════════════════════════════

Đọc tất cả SKILL.md trong folder .claude/skills/ trước khi làm bất cứ thứ gì.

TASK 1: Z-index Scale
- Định nghĩa z-index scale trong tailwind.config.ts:
  zIndex: {
    'dropdown': '10',
    'sticky': '20', 
    'fixed': '30',
    'modal-backdrop': '40',
    'modal': '50',
    'toast': '60',
    'tooltip': '70',
  }
- Tìm tất cả z-index usage:
  grep -rn "z-\[" frontend/ --include="*.tsx" | grep -v node_modules
  grep -rn "z-[0-9]" frontend/ --include="*.tsx" | grep -v node_modules
- Thay tất cả arbitrary z-index (z-[9999], z-[100], etc.) bằng named values
- Đặc biệt: z-[9999] → z-tooltip hoặc z-modal

TASK 2: WCAG Contrast Fix
- File: frontend/app/globals.css
- Tìm gray-500 và text-tertiary CSS variables → verify contrast ratio ≥ 4.5:1
- Nếu fail: darken text color hoặc lighten background
- Test tool: paste actual hex values vào contrast checker logic

TASK 3: Focus-visible on Inputs
- File: frontend/components/ui/Input.tsx
- Thêm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2
- Apply cho MỌI interactive elements (buttons đã có, inputs chưa có)

TASK 4: Color Consolidation (115 → ≤20)
- Chạy: grep -roh '#[0-9a-fA-F]\{3,8\}' frontend/ --include="*.tsx" --include="*.css" | sort | uniq -c | sort -rn
- Identify colors dùng < 3 lần → replace bằng nearest CSS variable
- Group similar shades → merge into 1 token
- Target: ≤ 20 unique hex colors + CSS variables cho phần còn lại

TASK 5: Type Scale Cleanup
- Tìm: grep -roh 'text-\[[0-9]*px\]' frontend/ --include="*.tsx" | sort | uniq -c | sort -rn
- Arbitrary sizes (text-[8px], text-[9px], text-[11px]) → thay bằng nearest Tailwind class
- text-[8px] → text-xs (12px) hoặc xóa nếu không cần thiết
- Target: ≤ 7 unique font sizes

TASK 6: transition-all → specific
- Tìm: grep -rn "transition-all" frontend/ --include="*.tsx" | grep -v node_modules
- Thay transition-all bằng transition-colors, transition-opacity, transition-transform tùy context
- transition-all force browser repaint mọi property → performance hit trên low-end devices

Sau khi xong: npm run build verify


═══════════════════════════════════════════════════════════════
PHASE 6: GROWTH FEATURES
═══════════════════════════════════════════════════════════════

Đọc tất cả SKILL.md trong folder .claude/skills/ trước khi làm bất cứ thứ gì.
Đọc docs/audit/LINGONA_SOUL_AUDIT_FINAL.md — phần IV (Growth decisions).

TASK 1: Share Cards Vietnamese + Lintopus
- Tìm: ShareCardModal hoặc share-related components
- Redesign share card:
  - Background: brand navy, không gradient
  - Text: tiếng Việt: "Mình vừa đạt Band [X] trên Lingona! 🐙"
  - Lintopus mascot visible
  - Lingona logo + URL
  - Kích thước: 1080x1080 (Instagram/Facebook optimal)

TASK 2: Registration Simplification
- File: frontend/app/(auth)/register/page.tsx
- Hiện tại: 4 fields (name, email, password, confirm?)
- Giảm còn: 2 fields (email + password) hoặc chỉ Google OAuth
- Name có thể hỏi sau trong onboarding
- Mỗi field bỏ = +10-15% conversion

TASK 3: Landing Page Light Mode
- Tìm tất cả landing components
- Thêm light mode variants (bg-white thay vì bg-dark)
- Test: ban ngày, ngoài trời, trên điện thoại → phải đọc được
- Navigation: dark header trên light content OK

TASK 4: Dead Code Removal
- Xóa IeltsConversation V1 (1,163 lines dead code):
  grep -rn "IeltsConversation[^V]" frontend/ --include="*.tsx"
  Nếu không reference nào → xóa file
  
- Xóa socket.io-client dependency:
  Kiểm tra: grep -rn "socket\.io-client\|io(" frontend/ --include="*.tsx" --include="*.ts"
  Nếu không dùng → npm uninstall socket.io-client

- Xóa animated background blobs (nếu có):
  Tìm gradient circles với infinite animation
  Thay bằng clean background

TASK 5: Remove AI Smell — Gradient Blobs & Glows
- Tìm: grep -rn "blob\|glow\|blur.*circle\|radial-gradient.*circle" frontend/ --include="*.tsx"
- Landing page hero: 2 blurred circles (800px, 500px) → XÓA
- Để white space / clean background thay thế
- "White space is not emptiness — it's confidence"

Sau khi xong: npm run build verify


═══════════════════════════════════════════════════════════════
PHASE 7: FINAL VERIFICATION
═══════════════════════════════════════════════════════════════

Đọc tất cả SKILL.md trong folder .claude/skills/ trước khi làm bất cứ thứ gì.

TASK 1: Re-run key audit checks
Chạy lại các commands từ audit và so sánh:

# Color count (target: ≤ 20)
grep -roh '#[0-9a-fA-F]\{3,8\}' frontend/ --include="*.tsx" --include="*.css" | sort -u | wc -l

# English UI text remaining
grep -rn '"[A-Z][a-z].*"' frontend/components/ --include="*.tsx" | grep -v import | grep -v className | grep -v node_modules | wc -l

# Lintopus appearances (target: ≥ 20)  
grep -rn "Mascot\|Lintopus\|lintopus\|mascot" frontend/ --include="*.tsx" | grep -v node_modules | wc -l

# Z-index chaos (target: 0 arbitrary values)
grep -rn "z-\[" frontend/ --include="*.tsx" | grep -v node_modules | wc -l

# min-h-screen remaining (target: 0)
grep -rn "min-h-screen\|h-screen" frontend/ --include="*.tsx" | grep -v node_modules | wc -l

# transition-all remaining
grep -rn "transition-all" frontend/ --include="*.tsx" | grep -v node_modules | wc -l

# Console.log remaining
grep -rn "console\.\(log\|debug\|info\)" frontend/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next" | wc -l

# AI smell: gradient text
grep -rn "bg-clip-text\|text-transparent.*gradient\|gradient.*text-transparent" frontend/ --include="*.tsx" | grep -v node_modules | wc -l

# Error boundaries exist
find frontend/app -name "error.tsx" -o -name "not-found.tsx" | wc -l

# Safe area
grep -rn "safe-area\|env(safe" frontend/ --include="*.tsx" --include="*.css" | grep -v node_modules | wc -l

# PWA manifest
cat frontend/public/manifest.json 2>/dev/null | head -5

TASK 2: Chụp lại screenshots
Chạy lại Playwright screenshot script từ audit:
- So sánh before/after cho mỗi page
- Verify: gradient text gone, Lintopus visible, Vietnamese text, safe-area working

TASK 3: Build & Type Check
npm run build
- Target: 0 errors, 0 warnings

TASK 4: Report kết quả
Tạo file /tmp/LINGONA_POST_FIX_REPORT.md với format:

| Metric | Before (Audit) | After (Fixed) | Target | Status |
|--------|---------------|---------------|--------|--------|
| Unique hex colors | 115 | ? | ≤ 20 | |
| English UI strings | ~100+ | ? | 0 | |
| Lintopus locations | 6 | ? | ≥ 20 | |
| Z-index arbitrary | 12+ | ? | 0 | |
| min-h-screen | 10+ | ? | 0 | |
| transition-all | 79 | ? | 0 | |
| Gradient text | 1+ | ? | 0 | |
| Error boundaries | 0 | ? | ≥ 3 | |
| Safe area support | 0 | ? | ≥ 3 | |
| PWA manifest | No | ? | Yes | |
| prefers-reduced-motion | No | ? | Yes | |

Estimated new score: ___ /230 (target: ≥ 170, B-Tier)
