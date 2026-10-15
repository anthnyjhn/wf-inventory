import Link from "next/link";
import { fmt, listStock, type MaterialStock } from "@/lib/inventory";
import { StatusBadge } from "@/components/StatusBadge";
import { StockSummary } from "@/components/StockSummary";
import { CopyButton } from "@/components/CopyButton";
import { PrintButton } from "@/components/PrintButton";

function orderUnit(m: MaterialStock, n: number) {
  return m.tracking === "roll" ? `box${n === 1 ? "" : "es"}` : m.unit_abbr;
}

function stockLine(m: MaterialStock) {
  if (m.tracking === "count") return `${fmt(m.quantity)} ${m.unit_abbr}`;
  const open =
    m.open_count > 0
      ? `, ${m.open_count} open (${fmt(m.open_remaining)} ${m.unit_abbr} left)`
      : ", none open";
  return `${m.sealed_count} box${m.sealed_count === 1 ? "" : "es"}${open}`;
}

export default function ReorderPage() {
  const all = listStock();
  const needed = all.filter((m) => m.status === "out" || m.status === "low");
  const date = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  const reorderText = [
    `Reorder list – ${date}`,
    "",
    ...needed.map(
      (m) =>
        `${m.code} ${m.name}: order ${m.reorder_qty} ${orderUnit(m, m.reorder_qty)} (have ${stockLine(m)}${m.status === "out" ? " – OUT" : ""})`,
    ),
  ].join("\n");

  const stockText = [
    `Stock count – ${date}`,
    "",
    ...all.map(
      (m) =>
        `${m.code} ${m.name}: ${stockLine(m)}${m.status === "out" ? " – OUT" : m.status === "low" ? " – LOW" : ""}`,
    ),
  ].join("\n");

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reorder list</h1>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={reorderText} label="Copy reorder list" />
          <CopyButton text={stockText} label="Copy full stock count" />
          <PrintButton />
        </div>
      </div>
      <h1 className="hidden text-xl font-bold print:block">Reorder list – {date}</h1>

      <div className="card">
        {needed.length === 0 ? (
          <p className="py-6 text-center text-emerald-700">Everything is above minimum. 🎉</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Material</th>
                  <th className="px-3 py-2">Have</th>
                  <th className="px-3 py-2">Min / Max</th>
                  <th className="px-3 py-2">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {needed.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-3 font-mono font-semibold">
                      <Link href={`/materials/${m.id}`} className="text-blue-700 hover:underline">
                        {m.code}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {m.name} <StatusBadge status={m.status} />
                    </td>
                    <td className="px-3 py-3">
                      <StockSummary m={m} />
                    </td>
                    <td className="px-3 py-3 text-zinc-600">
                      {fmt(m.min_stock)} / {m.max_stock ? fmt(m.max_stock) : "–"}
                    </td>
                    <td className="px-3 py-3 text-base font-bold">
                      {m.reorder_qty}{" "}
                      <span className="text-sm font-normal text-zinc-500">{orderUnit(m, m.reorder_qty)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="no-print text-sm text-zinc-500">
        Order quantity fills stock back up to the maximum (or the minimum if no maximum is set). Rolls are
        counted as sealed boxes on the shelf. Tip: send your warehouse manager a link to the dashboard – it
        can be viewed without the PIN.
      </p>
    </div>
  );
}
