import { cn } from "@/lib/utils";
import type { UnitData } from "@/hooks/useCourses";
import { IconCheck } from "../Icons";
import { PathNodeItem, ZIGZAG } from "./PathNode";

export function UnitSection({ unit, onOpen }: { unit: UnitData; onOpen: (id: string) => void }) {
  const completedCount = unit.nodes.filter((n) => n.status === "completed").length;
  const totalCount     = unit.nodes.length;
  const pct            = Math.round((completedCount / totalCount) * 100);
  const hasCurrent     = unit.nodes.some((n) => n.status === "current");
  const allLocked      = unit.nodes.every((n) => n.status === "locked");

  return (
    <div className={cn("relative", allLocked && "opacity-50")}>
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-bold border",
            pct === 100 ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-500" : ""
          )}
          style={
            hasCurrent
              ? { backgroundColor: "rgba(0,168,150,0.12)", color: "#00A896", borderColor: "rgba(0,168,150,0.25)" }
              : pct !== 100
                ? { backgroundColor: "var(--color-primary-soft)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }
                : {}
          }
        >
          {pct === 100 && <IconCheck size={10} />}
          {unit.title}
        </div>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", unit.level === "B1" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : unit.level === "B2" ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : "bg-violet-500/10 border-violet-500/20 text-violet-500")}>
          {unit.level}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{completedCount}/{totalCount}</span>
      </div>

      {unit.description && (
        <p className="text-xs text-center mb-6" style={{ color: "var(--color-text-tertiary)" }}>{unit.description}</p>
      )}

      <div className="mx-auto max-w-[200px] mb-6">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "#22C55E" : "linear-gradient(90deg, #00A896, #00C4B0)",
              transition: "width 600ms ease-out",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        {unit.nodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center">
            {i > 0 && (
              <div
                className="w-0.5 h-6 -mt-6 mb-0 rounded-full"
                style={{
                  backgroundColor: node.status === "locked" ? "var(--color-border)" : "rgba(0,168,150,0.3)",
                  transform: `translateX(${(ZIGZAG[i % ZIGZAG.length] + ZIGZAG[(i - 1) % ZIGZAG.length]) / 2}px)`,
                }}
              />
            )}
            <PathNodeItem node={node} index={i} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </div>
  );
}
