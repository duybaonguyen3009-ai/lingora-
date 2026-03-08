export type LessonStatus = "completed" | "in-progress" | "locked" | "recommended";
export type LessonType = "vocabulary" | "grammar" | "listening" | "speaking" | "reading";

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  status: LessonStatus;
  duration: number; // minutes
  level: string;
  progress: number; // 0-100
  detail: string;
}

export interface Skill {
  name: string;
  value: number; // 0-100
  color: string;
}

export interface StatCard {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  trend: string;
  color: "cyan" | "blue" | "amber" | "purple";
  barPercent: number;
}

export interface GoalTask {
  label: string;
  done: boolean;
}

export interface HeatmapDay {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  isToday?: boolean;
}
