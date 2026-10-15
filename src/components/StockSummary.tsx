import type { MaterialStock } from "@/lib/inventory";
import { fmt } from "@/lib/inventory";

/** "3 boxes · 2 open (47.5 m left)" or "12 sheets". */
export function StockSummary({ m }: { m: MaterialStock }) {
  if (m.tracking === "count") {
    return (
      <span className="font-semibold">
        {fmt(m.quantity)} <span className="font-normal text-zinc-500">{m.unit_abbr}</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col">
      <span className="font-semibold">
        {m.sealed_count}{" "}
        <span className="font-normal text-zinc-500">box{m.sealed_count === 1 ? "" : "es"}</span>
      </span>
      <span className="text-xs text-zinc-500">
        {m.open_count} open
        {m.open_count > 0 && ` · ${fmt(m.open_remaining)} ${m.unit_abbr} left`}
      </span>
    </span>
  );
}
