export function RemainingBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const color = pct <= 15 ? "bg-red-500" : pct <= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200" aria-hidden>
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
