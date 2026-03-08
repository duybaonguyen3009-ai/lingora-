import type { Lesson, Skill, StatCard, GoalTask, HeatmapDay } from "./types";

export const mockLessons: Lesson[] = [
  {
    id: "1",
    title: "Office Expressions & Idioms",
    type: "vocabulary",
    status: "completed",
    duration: 8,
    level: "B2",
    progress: 100,
    detail: "20 words",
  },
  {
    id: "2",
    title: "Present Perfect in Context",
    type: "grammar",
    status: "recommended",
    duration: 12,
    level: "B2",
    progress: 40,
    detail: "3 exercises",
  },
  {
    id: "3",
    title: "Business Meeting Audio",
    type: "listening",
    status: "in-progress",
    duration: 10,
    level: "B2",
    progress: 0,
    detail: "Podcast format",
  },
  {
    id: "4",
    title: "AI Role Play: Job Interview",
    type: "speaking",
    status: "locked",
    duration: 15,
    level: "C1",
    progress: 0,
    detail: "AI Conversation",
  },
  {
    id: "5",
    title: "Common English Phrasal Verbs",
    type: "vocabulary",
    status: "in-progress",
    duration: 10,
    level: "B1",
    progress: 60,
    detail: "30 phrases",
  },
  {
    id: "6",
    title: "IELTS Listening Strategies",
    type: "listening",
    status: "recommended",
    duration: 18,
    level: "C1",
    progress: 30,
    detail: "4 exercises",
  },
];

export const mockStats: StatCard[] = [
  {
    id: "streak",
    label: "Current Streak",
    value: 18,
    unit: "days",
    trend: "↑ +3",
    color: "amber",
    barPercent: 72,
  },
  {
    id: "vocab",
    label: "Vocabulary Learned",
    value: 1240,
    unit: "words",
    trend: "↑ +42",
    color: "blue",
    barPercent: 55,
  },
  {
    id: "rank",
    label: "Weekly Rank",
    value: "#4",
    unit: "rank",
    trend: "↑ +2",
    color: "cyan",
    barPercent: 84,
  },
  {
    id: "time",
    label: "Total Study Time",
    value: 47,
    unit: "hrs",
    trend: "↑ +1.2h",
    color: "purple",
    barPercent: 68,
  },
];

export const mockSkills: Skill[] = [
  { name: "Vocabulary", value: 82, color: "from-[#2DA8FF] to-[#82CAFF]" },
  { name: "Grammar",    value: 65, color: "from-[#FFA726] to-[#FFD54F]" },
  { name: "Reading",    value: 71, color: "from-[#64DC82] to-[#A0F0B0]" },
  { name: "Listening",  value: 58, color: "from-[#A064FF] to-[#C8A0FF]" },
  { name: "Speaking",   value: 44, color: "from-[#2ED3C6] to-[#8BFFE8]" },
];

export const mockGoalTasks: GoalTask[] = [
  { label: "Vocabulary practice",   done: true  },
  { label: "5-minute reading",      done: true  },
  { label: "Grammar exercise",      done: false },
  { label: "Listening quiz",        done: false },
];

export const mockHeatmap: HeatmapDay[] = (() => {
  const days: HeatmapDay[] = [];
  const levels = [0, 1, 2, 3, 4] as const;
  const total = 28;
  for (let i = 0; i < total; i++) {
    const daysAgo = total - 1 - i;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (daysAgo === 0) level = 2;
    else if (daysAgo <= 5) level = (Math.random() > 0.3 ? Math.min(4, Math.floor(Math.random() * 3) + 2) : 1) as 0|1|2|3|4;
    else if (daysAgo <= 14) level = Math.floor(Math.random() * 4) as 0|1|2|3|4;
    else level = (Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0) as 0|1|2|3|4;
    days.push({ date: `day-${i}`, level, isToday: daysAgo === 0 });
  }
  return days;
})();

export const mockUser = {
  name: "Anh Nguyễn",
  initials: "AN",
  level: "Level 10 · Intermediate",
};

export const mockCourse = {
  name: "Business English – Unit 4",
  difficulty: "Advanced",
  currentLesson: 7,
  totalLessons: 10,
  unitProgress: 70,
};
