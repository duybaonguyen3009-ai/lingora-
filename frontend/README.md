# Lingora Frontend

> Premium English learning dashboard — Next.js 14 + TypeScript + TailwindCSS

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | TailwindCSS 3 |
| Icons | Custom inline SVG (no external lib) |
| Data | Mock data (ready for API integration) |

---

## Project Structure

```
lingora-frontend/
├── app/
│   ├── globals.css          # Global styles + Tailwind
│   ├── layout.tsx           # Root layout (metadata, fonts)
│   └── page.tsx             # Dashboard page (main entry)
│
├── components/
│   ├── Icons.tsx            # All SVG icon components
│   ├── Sidebar.tsx          # Collapsible sidebar with nav
│   ├── Topbar.tsx           # Top navigation bar
│   ├── Hero.tsx             # Hero section with progress ring
│   ├── StatsRow.tsx         # 4 stat cards with animated counters
│   ├── LessonCard.tsx       # Individual lesson card
│   ├── LessonsSection.tsx   # Filterable lessons grid
│   ├── AiTutorCard.tsx      # AI tutor CTA card
│   ├── WeeklyChallenge.tsx  # Weekly challenge progress card
│   └── RightPanel.tsx       # Daily goal + skills + heatmap
│
├── lib/
│   ├── types.ts             # TypeScript interfaces
│   ├── mockData.ts          # All mock data
│   └── utils.ts             # cn(), color helpers
│
└── public/
    └── lingora-logo.png     # Brand logo
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Build for production

```bash
npm run build
npm start
```

---

## Features Implemented

### UI Components
- ✅ **Sidebar** — collapsible, nav sections, active state, hover effects, user card
- ✅ **Topbar** — search bar, streak badge, XP badge, notification bell with pulse, avatar
- ✅ **Hero** — animated SVG progress ring, course info, CTA button
- ✅ **Stats Row** — 4 animated counter cards with progress bars
- ✅ **Lessons Section** — filterable tabs (All / Recommended / Completed)
- ✅ **Lesson Cards** — type tags, status icons, progress bars, level badges
- ✅ **AI Tutor Card** — CTA card with glow effect
- ✅ **Weekly Challenge** — animated progress bar
- ✅ **Right Panel** — daily goal ring, skill progress bars, study activity heatmap

### Interactions
- ✅ Sidebar collapse/expand (desktop toggle button)
- ✅ Mobile drawer sidebar with overlay
- ✅ Lesson tab filtering (All / Recommended / Completed)
- ✅ Animated progress bars on load
- ✅ Animated SVG rings (hero progress + daily goal)
- ✅ Animated counter numbers (streak, vocab, rank, time)
- ✅ Hover micro-interactions (lift, glow, border)
- ✅ Active nav state with glow indicator

### Design
- ✅ Premium dark theme matching Lingora brand
- ✅ Ambient background radial gradients
- ✅ Sora + DM Sans font pairing
- ✅ Consistent color system via CSS variables + Tailwind
- ✅ Responsive layout (mobile, tablet, desktop)
- ✅ Staggered entrance animations

---

## Connecting to Backend API

The app uses mock data in `lib/mockData.ts`. To connect to the real backend:

### 1. Create API utility

```ts
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchLessons() {
  const res = await fetch(`${BASE_URL}/api/lessons`);
  if (!res.ok) throw new Error('Failed to fetch lessons');
  return res.json();
}
```

### 2. Add environment variable

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Replace mock data in components

```tsx
// In LessonsSection.tsx — replace mockLessons with:
import { fetchLessons } from '@/lib/api';

// Using React Server Components (App Router):
const lessons = await fetchLessons();

// Or using client-side fetching:
const [lessons, setLessons] = useState([]);
useEffect(() => { fetchLessons().then(setLessons); }, []);
```

---

## Extending Components

### Adding a new nav item
Edit `components/Sidebar.tsx`:
```ts
const NAV_ITEMS = [
  // ... existing items
  { id: "ai-chat", label: "AI Chat", icon: <IconChat />, section: "Tools" },
];
```

### Adding a new lesson type
Edit `lib/utils.ts` → `getLessonTypeConfig()`:
```ts
"writing": {
  label: "Writing",
  className: "bg-pink-500/10 text-pink-400",
  color: "#FF6B9D",
},
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:4000` |

---

## Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `bg` | `#071A2F` | Page background |
| `bg-2` | `#0B2239` | Card / sidebar background |
| `bg-3` | `#102A43` | Elevated cards |
| `accent-cyan` | `#2ED3C6` | Primary accent, active states |
| `accent-blue` | `#2DA8FF` | Secondary accent, links |
| `primary` | `#E6EDF3` | Primary text |
| `secondary` | `#A6B3C2` | Secondary / muted text |
