import type { StockStatus } from "@/lib/inventory";

const STYLES: Record<StockStatus, { label: string; className: string }> = {
  out: { label: "Out of stock", className: "bg-red-100 text-red-800 ring-red-300" },
  low: { label: "Low", className: "bg-amber-100 text-amber-900 ring-amber-300" },
  ok: { label: "OK", className: "bg-emerald-100 text-emerald-800 ring-emerald-300" },
  over: { label: "Over max", className: "bg-sky-100 text-sky-800 ring-sky-300" },
};

export function StatusBadge({ status }: { status: StockStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.className}`}
    >
      {s.label}
    </span>
  );
}
