export function ProgressBar({ level, xp, xpToNext }: { level: number; xp: number; xpToNext: number }) {
  const pct = Math.round((xp / (xp + xpToNext)) * 100);
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-primary-soft)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-sora font-black text-sm"
            style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", color: "var(--color-bg)" }}
          >
            {level}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Level {level}</p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{xp} / {xp + xpToNext} XP to next level</p>
          </div>
        </div>
        <span className="text-xs font-bold" style={{ color: "var(--color-success)" }}>{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
        <div className="h-full rounded-full transition duration-700 ease-out" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--color-success), var(--color-accent))", boxShadow: "0 0 12px rgba(46,211,198,0.4)" }} />
      </div>
    </div>
  );
}
