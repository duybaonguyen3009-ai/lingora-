import { cn } from "@/lib/utils";
import { IconFire } from "../Icons";

const STREAK_MILESTONES = [3, 7, 14, 30];

export function StreakMilestones({ streak }: { streak: number }) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-primary-soft)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <IconFire size={16} className="text-amber-400" />
        <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Streak Milestones</h3>
        <span className="ml-auto text-xs font-bold text-amber-400">{streak} days</span>
      </div>
      <div className="flex items-center gap-2">
        {STREAK_MILESTONES.map((m) => {
          const achieved = streak >= m;
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition", achieved && "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20")}
                style={
                  achieved
                    ? { color: "var(--color-bg)" }
                    : { backgroundColor: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "rgba(166,179,194,0.4)" }
                }
              >
                {achieved ? "\u{1F525}" : m}
              </div>
              <span className={cn("text-xs font-semibold", achieved ? "text-amber-400" : "")} style={!achieved ? { color: "rgba(166,179,194,0.4)" } : {}}>{m} days</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
