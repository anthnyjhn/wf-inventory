import Link from "next/link";
import { getRollsByIds, listRolls, getMaterialStock, fmt, type RollStatus } from "@/lib/inventory";
import { code128Svg, qrSvg } from "@/lib/barcode";
import { getBaseUrl, isLocalhost } from "@/lib/url";
import { PrintButton } from "@/components/PrintButton";

/**
 * Printable tags. ?ids=1,2,3 for specific rolls, or ?material=ID[&status=sealed,open].
 * Each tag has a QR code (opens the roll page on a phone) and a Code 128 barcode of the tag
 * for handheld scanners (use the Scan page).
 */
export default async function TagsPage({ searchParams }: PageProps<"/tags">) {
  const sp = await searchParams;
  const base = await getBaseUrl();
  let rolls;
  let title = "Tags";
  if (typeof sp.ids === "string") {
    rolls = getRollsByIds(
      sp.ids
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    );
  } else {
    const materialId = Number(sp.material);
    const material = getMaterialStock(materialId);
    const statuses = (typeof sp.status === "string" ? sp.status : "sealed,open")
      .split(",")
      .filter((s): s is RollStatus => s === "sealed" || s === "open" || s === "finished");
    rolls = material ? listRolls(materialId, statuses).map((r) => ({ ...r, material })) : [];
    if (material) title = `Tags – ${material.code}`;
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {title} <span className="text-base font-normal text-zinc-500">({rolls.length})</span>
        </h1>
        <div className="flex gap-2">
          {typeof sp.material === "string" && (
            <>
              <Link className="btn" href={`/tags?material=${sp.material}&status=sealed`}>
                Sealed only
              </Link>
              <Link className="btn" href={`/tags?material=${sp.material}&status=open`}>
                Open only
              </Link>
            </>
          )}
          <PrintButton label="Print tags" />
        </div>
      </div>
      {isLocalhost(base) && (
        <p className="no-print rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          QR codes point to <code>{base}</code>, which phones can&rsquo;t reach. Open this page using the
          computer&rsquo;s network address (e.g. <code>http://192.168.1.50:3000</code>) or set{" "}
          <code>APP_URL</code> before printing.
        </p>
      )}
      {rolls.length === 0 ? (
        <p className="text-zinc-500">No tags to print.</p>
      ) : (
        <div className="flex flex-wrap gap-3 print:gap-0">
          {rolls.map((r) => (
            <div
              key={r.id}
              className="flex h-[40mm] w-[70mm] break-inside-avoid gap-2 overflow-hidden rounded border border-zinc-400 bg-white p-[3mm] text-black print:rounded-none print:border-dashed"
            >
              <div
                className="h-full aspect-square shrink-0 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg(`${base}/r/${encodeURIComponent(r.tag)}`) }}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="font-mono text-xl font-bold leading-tight">{r.material.code}</div>
                <div className="line-clamp-2 text-[9pt] leading-tight">{r.material.name}</div>
                <div className="mt-auto text-[8pt] text-zinc-600">
                  {fmt(r.initial_length)} {r.material.unit_abbr}
                </div>
                <div
                  className="h-[7mm] [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: code128Svg(r.tag) }}
                />
                <div className="text-center font-mono text-[9pt] font-semibold">{r.tag}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
