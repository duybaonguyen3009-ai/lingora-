# LINGONA AUDIT V3 — EXECUTION GUIDE
# Đọc file này TRƯỚC khi chạy V3. File này fix 3 lỗ hổng của prompt chính.

---

## FIX #1: VISUAL VERIFICATION — PLAYWRIGHT SCREENSHOTS

> V3 yêu cầu đánh giá visual nhưng bạn chỉ đọc code.
> KHÔNG ĐƯỢC đánh giá visual bằng cách đọc className. PHẢI chụp screenshot.

### Setup
```bash
# Install Playwright if not already
npm install -D playwright @playwright/test
npx playwright install chromium
```

### Screenshot Script — CHẠY TRƯỚC MỌI THỨ KHÁC
```bash
# Tạo file screenshot
cat > /tmp/audit-screenshots.ts << 'EOF'
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'reading', path: '/reading' },
  { name: 'speaking', path: '/speaking' },
  { name: 'writing', path: '/writing' },
  { name: 'battle', path: '/battle' },
  { name: 'profile', path: '/profile' },
  { name: 'settings', path: '/settings' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'achievements', path: '/achievements' },
  { name: 'pricing', path: '/pricing' },
  // Thêm mọi page routes tìm được từ Phần 0
];

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'iphone-14-pro-max', width: 430, height: 932 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function run() {
  const browser = await chromium.launch();
  
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2, // Retina
      // Simulate Safari user agent for Safari-specific rendering
      userAgent: viewport.width < 768 
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
        : undefined,
    });
    
    const page = await context.newPage();
    
    for (const p of PAGES) {
      try {
        await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1000); // Wait for animations
        
        // Full page screenshot
        await page.screenshot({
          path: `/tmp/audit/${viewport.name}/${p.name}-full.png`,
          fullPage: true,
        });
        
        // Above-the-fold only
        await page.screenshot({
          path: `/tmp/audit/${viewport.name}/${p.name}-above-fold.png`,
          fullPage: false,
        });
        
        console.log(`✅ ${viewport.name}/${p.name}`);
      } catch (e) {
        console.log(`❌ ${viewport.name}/${p.name}: ${e.message}`);
      }
    }
    
    await context.close();
  }
  
  await browser.close();
}

run();
EOF

# Start dev server in background
npm run dev &
sleep 5

# Create output dir
mkdir -p /tmp/audit/{iphone-se,iphone-14,iphone-14-pro-max,ipad,laptop,desktop}

# Run screenshots
npx ts-node /tmp/audit-screenshots.ts

# Kill dev server
kill %1
```

### Sử dụng screenshots trong audit:
- Phần 1 (Visceral Response): MỞ screenshots `iphone-14/*-above-fold.png` → nhìn thực tế
- Phần 3 (Gestalt): MỞ screenshots → annotate visual groups, hierarchy
- Phần 5 (Safari): MỞ screenshots với Safari user agent
- Phần 6 (Typography): ZOOM vào text → check rendering, sizes, weights
- Phần 7 (Color): MỞ screenshots → check color harmony, contrast visually
- Phần 15 (Consistency): MỞ 5 page screenshots side by side → compare

**RULE: Nếu bạn đánh giá bất kỳ thứ gì VISUAL mà không reference screenshot → đánh giá đó INVALID.**

---

## FIX #2: CHUNKING STRATEGY

> V3 quá dài cho 1 Claude Code session. PHẢI chia thành nhiều sessions.

### Session Plan:

**Session 1: "Data Collection" (Phần 0)**
```
Prompt: "Đọc file LINGONA_AUDIT_V3_BRAIN_AUDIT.md, chỉ thực hiện PHẦN 0: RECONNAISSANCE. 
Chạy TẤT CẢ 30 commands. Lưu toàn bộ output vào file /tmp/audit-data.md.
Sau đó chạy Playwright screenshot script. 
KHÔNG audit. KHÔNG đánh giá. Chỉ THU THẬP DATA."
```

**Session 2: "Visual & Psychology Audit" (Phần 1-3)**
```
Prompt: "Đọc file LINGONA_AUDIT_V3_BRAIN_AUDIT.md và file /tmp/audit-data.md.
Thực hiện Phần 1 (Visceral Response), Phần 2 (Behavioral Design), Phần 3 (Cognitive Psychology).
Nhìn screenshots trong /tmp/audit/ để đánh giá visual.
Output report vào /tmp/audit-report-visual.md.
Mỗi issue phải có evidence (code snippet, screenshot reference, measurement)."
```

**Session 3: "Growth & Mobile Audit" (Phần 4-5)**
```
Prompt: "Đọc file LINGONA_AUDIT_V3_BRAIN_AUDIT.md và file /tmp/audit-data.md.
Thực hiện Phần 4 (Growth AARRR Funnel) và Phần 5 (Mobile Safari).
Output report vào /tmp/audit-report-growth.md."
```

**Session 4: "Design System Audit" (Phần 6-9)**
```
Prompt: "Đọc file LINGONA_AUDIT_V3_BRAIN_AUDIT.md và file /tmp/audit-data.md.
Thực hiện Phần 6 (Typography), Phần 7 (Color), Phần 8 (Components), Phần 9 (Animation).
Reference screenshots cho visual evaluation.
Output report vào /tmp/audit-report-design.md."
```

**Session 5: "Quality & Polish Audit" (Phần 10-18)**
```
Prompt: "Đọc file LINGONA_AUDIT_V3_BRAIN_AUDIT.md và file /tmp/audit-data.md.
Thực hiện Phần 10-18 (Empty states, Performance, Security, SEO, Accessibility, Consistency, Visual Identity, Vietnam UX, AI Smell).
Output report vào /tmp/audit-report-quality.md."
```

**Session 6: "Final Scoring & Priority"**
```
Prompt: "Đọc 4 audit reports:
- /tmp/audit-report-visual.md
- /tmp/audit-report-growth.md
- /tmp/audit-report-design.md
- /tmp/audit-report-quality.md

Tổng hợp thành FINAL REPORT với:
1. Scoring table /190
2. AI Smell composite score /30
3. Priority fix list (Tier 0 → Tier 3)
4. Estimated total effort (hours)
5. Recommended fix order cho 2 tuần trước launch

Output: /tmp/LINGONA_FINAL_AUDIT_REPORT.md"
```

---

## FIX #3: MISSING TECHNICAL CHECKS

### Thêm vào Phần 0 (chạy cùng reconnaissance):

```bash
echo "=== 0.31 CACHING STRATEGY ==="
grep -rn "useSWR\|useQuery\|react-query\|@tanstack\|swr\|cache\|Cache\|stale\|revalidate" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20

echo "=== 0.32 WEBSOCKET/SOCKET.IO ==="
grep -rn "socket\|Socket\|io(\|useSocket\|disconnect\|reconnect\|on('connect" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20

echo "=== 0.33 ANALYTICS/TRACKING ==="
grep -rn "mixpanel\|posthog\|analytics\|gtag\|GA4\|track(\|identify(\|amplitude\|segment" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20

echo "=== 0.34 ERROR BOUNDARIES ==="
grep -rn "ErrorBoundary\|error\.tsx\|componentDidCatch\|onError" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules

echo "=== 0.35 TESTING COVERAGE ==="
find src -name "*.test.*" -o -name "*.spec.*" | wc -l
find src -name "*.test.*" -o -name "*.spec.*" | head -20

echo "=== 0.36 BUILD HEALTH ==="
npx next build 2>&1 | grep -i "error\|warning\|warn" | head -30

echo "=== 0.37 TYPESCRIPT STRICT MODE ==="
grep "strict" tsconfig.json

echo "=== 0.38 LIGHTHOUSE (requires Chrome) ==="
# Chỉ chạy nếu có lighthouse CLI
npx lighthouse http://localhost:3000 --output=json --output-path=/tmp/audit-lighthouse.json --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo 2>/dev/null
# Parse key scores
cat /tmp/audit-lighthouse.json 2>/dev/null | grep -A1 '"performance"\|"accessibility"\|"best-practices"\|"seo"' | head -20

echo "=== 0.39 CONTRAST RATIO CHECK ==="
# Install tool for contrast checking
npm install -g wcag-contrast 2>/dev/null
# Check most common color combos (fill in actual colors from 0.4 data)
# Example: wcag-contrast "#1a2744" "#ffffff"
# Run for each major text/bg combo found

echo "=== 0.40 BUNDLE ANALYSIS ==="
ANALYZE=true npx next build 2>/dev/null
# Or manually check
ls -la .next/static/chunks/*.js 2>/dev/null | sort -k5 -rn | head -15

echo "=== 0.41 UNUSED DEPENDENCIES ==="
npx depcheck 2>/dev/null | head -30

echo "=== 0.42 DUPLICATE CODE ==="
npx jscpd src/ --min-lines 10 --reporters console 2>/dev/null | head -30

echo "=== 0.43 STATE MANAGEMENT ==="
grep -rn "createContext\|useContext\|zustand\|redux\|jotai\|recoil\|useState" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -30

echo "=== 0.44 PROP DRILLING DEPTH ==="
# Find components that pass >5 props
grep -roh '<[A-Z][A-Za-z]* [^>]*>' src/ --include="*.tsx" | awk '{print NF}' | sort -rn | head -10

echo "=== 0.45 MEMORY LEAK RISKS ==="
grep -rn "addEventListener\|setInterval\|setTimeout\|subscribe" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20
# Check if cleanup exists
grep -rn "removeEventListener\|clearInterval\|clearTimeout\|unsubscribe\|cleanup\|return () =>" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20

echo "=== 0.46 LEGAL/COMPLIANCE ==="
find src public -name "*privacy*" -o -name "*terms*" -o -name "*policy*" -o -name "*legal*" 2>/dev/null

echo "=== 0.47 ENVIRONMENT VARIABLES ==="
cat .env.example 2>/dev/null || cat .env.local.example 2>/dev/null || echo "NO .env.example"
grep -rn "process.env\." src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort | uniq

echo "=== 0.48 URL STRUCTURE ==="
find src/app -name "page.tsx" | sed 's|src/app||;s|/page.tsx||' | sort
# Check for clean, SEO-friendly URLs vs ugly [id] patterns
```

---

## THÊM: PHẦN 19 — COMPETITIVE SCREENSHOT COMPARISON

> Đừng chỉ nói "so sánh với Duolingo". SO SÁNH CỤ THỂ.

### Chụp competitor screenshots:
```bash
# Playwright script cho competitors
cat > /tmp/competitor-screenshots.ts << 'EOF'
import { chromium } from 'playwright';

const COMPETITORS = [
  { name: 'duolingo', url: 'https://www.duolingo.com' },
  { name: 'elsa', url: 'https://elsaspeak.com' },
  { name: 'grammarly', url: 'https://www.grammarly.com' },
  { name: 'ielts-prep', url: 'https://ieltsliz.com' },
  { name: 'cambly', url: 'https://www.cambly.com' },
];

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  
  for (const comp of COMPETITORS) {
    try {
      await page.goto(comp.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `/tmp/audit/competitors/${comp.name}-mobile.png`,
        fullPage: false,
      });
      console.log(`✅ ${comp.name}`);
    } catch (e) {
      console.log(`❌ ${comp.name}: ${e.message}`);
    }
  }
  
  await browser.close();
}

run();
EOF

mkdir -p /tmp/audit/competitors
npx ts-node /tmp/competitor-screenshots.ts
```

### Comparison checklist (nhìn Lingona screenshot cạnh competitor screenshot):

| Element | Duolingo | Elsa Speak | Lingona | Winner | Gap |
|---------|----------|------------|---------|--------|-----|
| Hero clarity (3s test) | | | | | |
| Color sophistication | | | | | |
| Typography quality | | | | | |
| CTA prominence | | | | | |
| Whitespace usage | | | | | |
| Visual personality | | | | | |
| Trust signals | | | | | |
| Mobile polish | | | | | |

Mỗi ô điền: 1-10 score + 1 dòng mô tả cụ thể.

---

## THÊM: PHẦN 20 — USER FLOW RECORDING

> Đừng audit từng component riêng lẻ. Audit FLOW.

### Record 5 critical user journeys:

**Journey 1: "Sinh viên thấy quảng cáo FB → tải app"**
```
Landing page → CTA → Register → Onboarding → First lesson → First result
Record: mỗi bước bao nhiêu giây? Bao nhiêu taps? Friction ở đâu?
```

**Journey 2: "Daily return user"**
```
Open app → See dashboard → Continue practice → Complete session → Session end
Record: time to first action? Streaks visible? Today's recommendation clear?
```

**Journey 3: "Free user hits limit"**
```
Practice → Hit daily limit → See upgrade prompt → Explore pricing → Decide
Record: upgrade prompt timing? Tone? Easy to dismiss? Compelling?
```

**Journey 4: "User wants to battle friend"**
```
Dashboard → Battle → Find/invite friend → Match → Play → Result
Record: how many steps? Can find friend easily? Battle exciting?
```

**Journey 5: "User checks progress"**
```
Dashboard → Profile/Progress → View stats → View achievements → Set new goal
Record: progress visualized well? Motivating? Actionable insights?
```

Cho mỗi journey, dùng Playwright trace:
```javascript
// Enable tracing for detailed timeline
await context.tracing.start({ screenshots: true, snapshots: true });
// ... perform journey ...
await context.tracing.stop({ path: `/tmp/audit/traces/journey-1.zip` });
// View with: npx playwright show-trace /tmp/audit/traces/journey-1.zip
```

---

## CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Dev server đang chạy (`npm run dev`)
- [ ] Playwright installed + chromium downloaded
- [ ] Screenshots đã chụp (mọi page × mọi viewport)
- [ ] Competitor screenshots đã chụp
- [ ] Phần 0 commands đã chạy hết (0.1 → 0.48)
- [ ] Tất cả data lưu trong /tmp/audit-data.md
- [ ] Audit plan: 6 sessions, mỗi session focus 2-4 phần

Bây giờ mới bắt đầu audit.
