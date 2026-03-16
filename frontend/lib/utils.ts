import clsx, { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getLessonTypeConfig(type: string) {
  const configs: Record<string, { label: string; className: string; color: string }> = {
    vocabulary: {
      label: "Vocabulary",
      className: "bg-blue-500/10 text-blue-400",
      color: "var(--color-accent)",
    },
    grammar: {
      label: "Grammar",
      className: "bg-amber-500/10 text-amber-400",
      color: "#FFA726",
    },
    listening: {
      label: "Listening",
      className: "bg-purple-500/10 text-purple-400",
      color: "#A064FF",
    },
    speaking: {
      label: "Speaking",
      className: "bg-emerald-500/10 text-emerald-400",
      color: "var(--color-success)",
    },
    reading: {
      label: "Reading",
      className: "bg-green-500/10 text-green-400",
      color: "#64DC82",
    },
  };
  return configs[type] ?? configs.vocabulary;
}

export function getLessonProgressColor(type: string): string {
  const colors: Record<string, string> = {
    vocabulary: "bg-gradient-to-r from-blue-400 to-blue-300",
    grammar:    "bg-gradient-to-r from-amber-400 to-yellow-300",
    listening:  "bg-gradient-to-r from-purple-500 to-purple-300",
    speaking:   "bg-gradient-to-r from-emerald-400 to-emerald-300",
    reading:    "bg-gradient-to-r from-green-400 to-green-300",
  };
  return colors[type] ?? colors.vocabulary;
}

export function getStatColorConfig(color: string) {
  const configs: Record<string, { iconBg: string; barClass: string; trendClass?: string }> = {
    cyan:   { iconBg: "bg-emerald-500/10 text-emerald-400", barClass: "bg-gradient-to-r from-emerald-400 to-emerald-300" },
    blue:   { iconBg: "bg-blue-500/10 text-blue-400", barClass: "bg-gradient-to-r from-blue-400 to-blue-300" },
    amber:  { iconBg: "bg-amber-500/10 text-amber-400",  barClass: "bg-gradient-to-r from-amber-400 to-yellow-300"  },
    purple: { iconBg: "bg-purple-500/10 text-purple-400", barClass: "bg-gradient-to-r from-purple-500 to-purple-300" },
  };
  return configs[color] ?? configs.cyan;
}
