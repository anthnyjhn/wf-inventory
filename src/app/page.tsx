import Link from "next/link";
import { listStock, fmt, type MaterialStock } from "@/lib/inventory";
import { StatusBadge } from "@/components/StatusBadge";
import { StockSummary } from "@/components/StockSummary";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "out", label: "Out" },
  { key: "low", label: "Low" },
  { key: "ok", label: "OK" },
] as const;

const SEVERITY = { out: 0, low: 1, over: 2, ok: 3 };

function matches(m: MaterialStock, filter: string, q: string) {
  if (filter === "attention" && m.status !== "out" && m.status !== "low") return false;
  if ((filter === "out" || filter === "low") && m.status !== filter) return false;
  if (filter === "ok" && m.status !== "ok" && m.status !== "over") return false;
  if (!q) return true;
  const hay = `${m.code} ${m.name} ${m.category}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const filter = typeof sp.status === "string" ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = sp.sort === "status" ? "status" : "category";

  const all = listStock();
  const counts = {
    total: all.length,
    out: all.filter((m) => m.status === "out").length,
    low: all.filter((m) => m.status === "low").length,
    ok: all.filter((m) => m.status === "ok" || m.status === "over").length,
  };
  const rows = all.filter((m) => matches(m, filter, q));
  if (sort === "status") {
    rows.sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || a.code.localeCompare(b.code));
  }

  const href = (params: Record<string, string>) => {
    const u = new URLSearchParams({
      ...(q && { q }),
      ...(sort !== "category" && { sort }),
      status: filter,
      ...params,
    });
    if (u.get("status") === "all") u.delete("status");
    const s = u.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Stock dashboard</h1>
        <div className="flex gap-2">
          <Link href="/reorder" className="btn">
            Reorder list
          </Link>
          <Link href="/materials/new" className="btn btn-primary">
            + Add material
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          href={href({ status: "all" })}
          label="Materials"
          value={counts.total}
          className="text-zinc-900"
        />
        <SummaryCard
          href={href({ status: "out" })}
          label="Out of stock"
          value={counts.out}
          className="text-red-600"
        />
        <SummaryCard
          href={href({ status: "low" })}
          label="Low stock"
          value={counts.low}
          className="text-amber-600"
        />
        <SummaryCard
          href={href({ status: "ok" })}
          label="OK"
          value={counts.ok}
          className="text-emerald-600"
        />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={href({ status: f.key })}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  filter === f.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <form className="ml-auto flex gap-2" action="/">
            {filter !== "all" && <input type="hidden" name="status" value={filter} />}
            {sort !== "category" && <input type="hidden" name="sort" value={sort} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search code or name"
              className="input py-1.5 text-sm"
            />
            <button className="btn py-1.5">Search</button>
          </form>
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-zinc-500">
            {all.length === 0 ? (
              <>
                No materials yet.{" "}
                <Link href="/materials/new" className="text-blue-600 underline">
                  Add your first material
                </Link>
                .
              </>
            ) : (
              "Nothing matches this filter."
            )}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100 sm:hidden">
              {rows.map((m) => (
                <li key={m.id}>
                  <Link href={`/materials/${m.id}`} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div>
                        <span className="font-mono font-semibold text-blue-700">{m.code}</span>{" "}
                        <span className="font-medium">{m.name}</span>
                      </div>
                      <div className="mt-1 text-sm">
                        <StockSummary m={m} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={m.status} />
                      {m.reorder_qty > 0 && (
                        <div className="mt-1 text-xs text-zinc-500">
                          order {m.reorder_qty}{" "}
                          {m.tracking === "roll" ? "box" + (m.reorder_qty === 1 ? "" : "es") : m.unit_abbr}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">In stock</th>
                    <th className="px-3 py-2">Min / Max</th>
                    <th className="px-3 py-2">
                      <Link
                        href={href({ sort: sort === "status" ? "category" : "status" })}
                        className="hover:underline"
                      >
                        Status {sort === "status" ? "▲" : "↕"}
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((m) => (
                    <tr
                      key={m.id}
                      className={
                        m.status === "out" ? "bg-red-50/60" : m.status === "low" ? "bg-amber-50/60" : ""
                      }
                    >
                      <td className="px-3 py-3 font-mono font-semibold">
                        <Link href={`/materials/${m.id}`} className="text-blue-700 hover:underline">
                          {m.code}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/materials/${m.id}`} className="font-medium hover:underline">
                          {m.name}
                        </Link>
                        {m.category && <div className="text-xs text-zinc-500">{m.category}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <StockSummary m={m} />
                      </td>
                      <td className="px-3 py-3 text-zinc-600">
                        {fmt(m.min_stock)} / {m.max_stock ? fmt(m.max_stock) : "–"}
                        <span className="ml-1 text-xs text-zinc-400">
                          {m.tracking === "roll" ? "boxes" : m.unit_abbr}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={m.status} />
                        {m.reorder_qty > 0 && (
                          <div className="mt-1 text-xs text-zinc-500">
                            order {m.reorder_qty}{" "}
                            {m.tracking === "roll" ? "box" + (m.reorder_qty === 1 ? "" : "es") : m.unit_abbr}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  href,
  label,
  value,
  className,
}: {
  href: string;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <Link href={href} className="card block transition hover:shadow-md">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`text-3xl font-bold ${className}`}>{value}</div>
    </Link>
  );
}
