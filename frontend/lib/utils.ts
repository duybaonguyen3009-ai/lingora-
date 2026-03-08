import clsx, { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getLessonTypeConfig(type: string) {
  const configs: Record<string, { label: string; className: string; color: string }> = {
    vocabulary: {
      label: "Vocabulary",
      className: "bg-blue-500/10 text-blue-400",
      color: "#2DA8FF",
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
      className: "bg-[#2ED3C6]/10 text-[#2ED3C6]",
      color: "#2ED3C6",
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
    vocabulary: "bg-gradient-to-r from-[#2DA8FF] to-[#82CAFF]",
    grammar:    "bg-gradient-to-r from-[#FFA726] to-[#FFD54F]",
    listening:  "bg-gradient-to-r from-[#A064FF] to-[#C8A0FF]",
    speaking:   "bg-gradient-to-r from-[#2ED3C6] to-[#8BFFE8]",
    reading:    "bg-gradient-to-r from-[#64DC82] to-[#A0F0B0]",
  };
  return colors[type] ?? colors.vocabulary;
}

export function getStatColorConfig(color: string) {
  const configs: Record<string, { iconBg: string; barClass: string; trendClass?: string }> = {
    cyan:   { iconBg: "bg-[#2ED3C6]/10 text-[#2ED3C6]", barClass: "bg-gradient-to-r from-[#2ED3C6] to-[#8BFFE8]" },
    blue:   { iconBg: "bg-[#2DA8FF]/10 text-[#2DA8FF]", barClass: "bg-gradient-to-r from-[#2DA8FF] to-[#82CAFF]" },
    amber:  { iconBg: "bg-amber-500/10 text-amber-400",  barClass: "bg-gradient-to-r from-amber-400 to-yellow-300"  },
    purple: { iconBg: "bg-purple-500/10 text-purple-400", barClass: "bg-gradient-to-r from-purple-500 to-purple-300" },
  };
  return configs[color] ?? configs.cyan;
}
