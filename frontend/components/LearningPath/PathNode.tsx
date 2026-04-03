"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PathNode as PathNodeType, NodeStatus, Difficulty } from "@/hooks/useCourses";
import {
  IconCheck, IconLock, IconPlay, IconClock,
  IconTrophy, IconAward, IconChat,
} from "../Icons";

const DIFF_CONFIG: Record<Difficulty, { label: string; dot: string; bg: string; border: string; text: string }> = {
  easy:   { label: "Easy",   dot: "bg-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  medium: { label: "Medium", dot: "bg-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400" },
  hard:   { label: "Hard",   dot: "bg-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400" },
};

export const ZIGZAG = [0, 40, 60, 40, 0, -40, -60, -40];

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const c = DIFF_CONFIG[difficulty];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold border", c.bg, c.border, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

function AiHintButton() {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setShowHint((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-normal border",
          showHint
            ? "bg-violet-500/15 border-violet-500/25 text-violet-300"
            : "border-transparent"
        )}
        style={!showHint ? { backgroundColor: "var(--color-primary-soft)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" } : {}}
        onMouseEnter={(e) => {
          if (!showHint) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.25)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgb(196,167,255)";
          }
        }}
        onMouseLeave={(e) => {
          if (!showHint) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
          }
        }}
      >
        <IconChat size={11} />
        {showHint ? "Hide Hint" : "Ask AI for Hint"}
      </button>
      {showHint && (
        <div className="mt-2 px-3 py-2.5 rounded-xl bg-violet-500/[0.07] border border-violet-500/15 text-xs text-violet-200/80 leading-relaxed max-w-[200px]">
          {"\u{1F4A1}"} Try describing the weather using adjectives like &quot;sunny&quot;, &quot;cloudy&quot;, &quot;windy&quot; before moving to full sentences.
        </div>
      )}
    </div>
  );
}

function MiniProgress({ pct, status }: { pct: number; status: NodeStatus }) {
  if (status === "locked" || pct === 0) return null;
  return (
    <div className="w-16 h-1 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "var(--color-border)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "var(--color-success)" : "linear-gradient(90deg, var(--color-success), var(--color-accent))" }} />
    </div>
  );
}

export function PathNodeItem({ node, index, onOpen }: { node: PathNodeType; index: number; onOpen: (id: string) => void }) {
  const offset = ZIGZAG[index % ZIGZAG.length];
  const nodeSize = node.type === "boss" ? "w-[72px] h-[72px]" : node.type === "challenge" ? "w-[64px] h-[64px]" : "w-[56px] h-[56px]";

  const bgStyle = (): React.CSSProperties => {
    if (node.status === "completed") return { background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", boxShadow: "0 0 20px rgba(46,211,198,0.3)" };
    if (node.status === "current")   return { background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", boxShadow: "0 0 24px rgba(46,211,198,0.5), 0 0 48px rgba(46,211,198,0.15)" };
    return { background: "#0F2D46", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)" };
  };

  const renderIcon = () => {
    const wrapIcon = (icon: React.ReactNode) => (
      <span style={{ color: node.status === "locked" ? "rgba(166,179,194,0.4)" : "var(--color-bg)" }}>{icon}</span>
    );
    if (node.status === "completed") return wrapIcon(<IconCheck size={node.type === "boss" ? 20 : 16} />);
    if (node.status === "locked")    return wrapIcon(<IconLock  size={node.type === "boss" ? 16 : 12} />);
    if (node.type === "boss")        return wrapIcon(<IconAward size={22} />);
    if (node.type === "challenge")   return wrapIcon(<IconTrophy size={18} />);
    return wrapIcon(<IconPlay size={16} />);
  };

  return (
    <div className="flex flex-col items-center gap-2 transition duration-normal" style={{ transform: `translateX(${offset}px)` }}>
      <button
        disabled={node.status === "locked"}
        onClick={node.status !== "locked" ? () => onOpen(node.id) : undefined}
        className={cn("relative rounded-full flex items-center justify-center transition duration-normal", nodeSize, node.status !== "locked" && "cursor-pointer hover:scale-110", node.status === "locked" && "cursor-not-allowed")}
        style={{ ...bgStyle(), ...(node.status === "locked" ? { border: "2px solid var(--color-border)" } : {}) }}
      >
        {renderIcon()}
        {node.status === "current" && (
          <span className="absolute inset-[-4px] rounded-full animate-ping" style={{ border: "2px solid rgba(46,211,198,0.5)", animationDuration: "2s" }} />
        )}
        {node.xp && node.status !== "locked" && (
          <span
            className="absolute -bottom-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid rgba(46,211,198,0.3)", color: "var(--color-success)" }}
          >
            +{node.xp}
          </span>
        )}
      </button>

      <div className="flex flex-col items-center text-center max-w-[140px]">
        <p
          className="text-xs font-semibold leading-tight"
          style={{
            color: node.status === "locked"
              ? "rgba(166,179,194,0.4)"
              : node.status === "current"
                ? "var(--color-success)"
                : "var(--color-text)",
          }}
        >
          {node.title}
        </p>
        {node.subtitle && (
          <p
            className="text-xs mt-0.5"
            style={{ color: node.status === "locked" ? "rgba(166,179,194,0.25)" : "rgba(166,179,194,0.7)" }}
          >
            {node.subtitle}
          </p>
        )}
        {node.difficulty && node.status !== "locked" && (
          <div className="mt-1.5"><DifficultyBadge difficulty={node.difficulty} /></div>
        )}
        {node.progress !== undefined && <MiniProgress pct={node.progress} status={node.status} />}
        {node.duration && node.status === "current" && (
          <span className="flex items-center gap-1 text-xs mt-1" style={{ color: "rgba(166,179,194,0.6)" }}>
            <IconClock size={9} /> {node.duration} min
          </span>
        )}
        {node.status === "current" && <AiHintButton />}
      </div>
    </div>
  );
}
