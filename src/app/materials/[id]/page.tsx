import Link from "next/link";
import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import {
  fmt,
  getMaterialStock,
  listActivity,
  listRecentlyFinished,
  listRolls,
  type MaterialStock,
  type Roll,
} from "@/lib/inventory";
import { fmtDate } from "@/lib/format";
import {
  adjustQuantityAction,
  deleteRollAction,
  finishRollAction,
  openNextRollAction,
  openRollAction,
  receiveRollsAction,
  setQuantityAction,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { ActivityList } from "@/components/ActivityList";
import { PinForm } from "@/components/PinForm";
import { RemainingBar } from "@/components/RemainingBar";
import { StatusBadge } from "@/components/StatusBadge";

export default async function MaterialPage({ params }: PageProps<"/materials/[id]">) {
  const { id } = await params;
  const m = getMaterialStock(Number(id));
  if (!m) notFound();
  const authed = await isAuthed();
  const isRoll = m.tracking === "roll";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold">
            <span className="font-mono">{m.code}</span>
            <span>{m.name}</span>
            <StatusBadge status={m.status} />
            {m.archived ? <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs">Archived</span> : null}
          </h1>
          <p className="text-sm text-zinc-500">
            {[
              m.category,
              m.unit_name,
              isRoll && m.roll_length ? `${fmt(m.roll_length)} ${m.unit_abbr} per roll` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {m.notes && <p className="mt-1 text-sm text-zinc-700">{m.notes}</p>}
        </div>
        <div className="flex gap-2">
          {isRoll && (
            <Link href={`/tags?material=${m.id}`} className="btn">
              Print tags
            </Link>
          )}
          <Link href={`/materials/${m.id}/edit`} className="btn">
            Edit / min &amp; max
          </Link>
        </div>
      </div>

      <Stats m={m} />

      {authed ? (
        isRoll ? (
          <RollControls m={m} />
        ) : (
          <QuantityControls m={m} />
        )
      ) : (
        <div className="card max-w-md">
          <PinForm next={`/materials/${m.id}`} />
        </div>
      )}

      {isRoll && <RollLists m={m} authed={authed} />}

      <section className="card">
        <h2 className="mb-2 font-semibold">History</h2>
        <ActivityList items={listActivity({ materialId: m.id, limit: 30 })} />
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function Stats({ m }: { m: MaterialStock }) {
  const minMax = `min ${fmt(m.min_stock)}${m.max_stock ? ` · max ${fmt(m.max_stock)}` : ""}`;
  if (m.tracking === "count") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="In stock" value={`${fmt(m.quantity)} ${m.unit_abbr}`} sub={minMax} />
        <Stat
          label="To reorder"
          value={m.reorder_qty ? `${m.reorder_qty} ${m.unit_abbr}` : "–"}
          sub={m.max_stock ? `fills to ${fmt(m.max_stock)}` : undefined}
        />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Boxes on shelf" value={String(m.sealed_count)} sub={minMax} />
      <Stat label="Open rolls" value={String(m.open_count)} />
      <Stat label={`Left on open rolls`} value={`${fmt(m.open_remaining)} ${m.unit_abbr}`} />
      <Stat
        label="Total available"
        value={`${fmt(m.open_remaining + m.sealed_remaining)} ${m.unit_abbr}`}
        sub={m.reorder_qty ? `reorder ${m.reorder_qty} box${m.reorder_qty === 1 ? "" : "es"}` : undefined}
      />
    </div>
  );
}

function RollControls({ m }: { m: MaterialStock }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="mb-3 font-semibold">Receive new boxes</h2>
        <ActionForm action={receiveRollsAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={m.id} />
          <div className="w-24">
            <label className="label" htmlFor="count">
              Boxes
            </label>
            <input
              id="count"
              name="count"
              type="number"
              min="1"
              max="500"
              defaultValue={1}
              required
              className="input"
            />
          </div>
          <div className="w-32">
            <label className="label" htmlFor="length">
              {m.unit_abbr} each
            </label>
            <input
              id="length"
              name="length"
              type="number"
              step="any"
              min="0"
              placeholder={fmt(m.roll_length ?? 0)}
              className="input"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="print" value="1" defaultChecked /> Print tags after
          </label>
          <button className="btn btn-primary">Add boxes</button>
        </ActionForm>
      </section>
      <section className="card">
        <h2 className="mb-1 font-semibold">Open a box</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Opens the oldest sealed box. You can also scan a box&rsquo;s tag and open it there.
        </p>
        <ActionForm action={openNextRollAction}>
          <input type="hidden" name="id" value={m.id} />
          <button className="btn" disabled={m.sealed_count === 0}>
            Open next box ({m.sealed_count} sealed)
          </button>
        </ActionForm>
      </section>
    </div>
  );
}

function QuantityControls({ m }: { m: MaterialStock }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="mb-3 font-semibold">Add or use stock</h2>
        <ActionForm action={adjustQuantityAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={m.id} />
          <div className="w-28">
            <label className="label" htmlFor="amount">
              Amount ({m.unit_abbr})
            </label>
            <input id="amount" name="amount" type="number" step="any" min="0" required className="input" />
          </div>
          <div className="min-w-32 flex-1">
            <label className="label" htmlFor="note">
              Note (optional)
            </label>
            <input id="note" name="note" placeholder="Job / delivery" className="input" />
          </div>
          <div className="flex gap-2">
            <button name="direction" value="use" className="btn btn-danger">
              − Use
            </button>
            <button name="direction" value="add" className="btn btn-success">
              + Add
            </button>
          </div>
        </ActionForm>
      </section>
      <section className="card">
        <h2 className="mb-3 font-semibold">Stock take</h2>
        <ActionForm action={setQuantityAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={m.id} />
          <div className="w-32">
            <label className="label" htmlFor="quantity">
              Counted ({m.unit_abbr})
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              min="0"
              defaultValue={m.quantity}
              required
              className="input"
            />
          </div>
          <button className="btn">Set count</button>
        </ActionForm>
      </section>
    </div>
  );
}

function RollLists({ m, authed }: { m: MaterialStock; authed: boolean }) {
  const open = listRolls(m.id, ["open"]);
  const sealed = listRolls(m.id, ["sealed"]);
  const finished = listRecentlyFinished(m.id, 10);
  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="mb-3 font-semibold">Open rolls ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-sm text-zinc-500">No open rolls.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {open.map((r) => (
              <OpenRollRow key={r.id} r={r} unit={m.unit_abbr} authed={authed} />
            ))}
          </ul>
        )}
      </section>

      <details className="card" open={sealed.length > 0 && sealed.length <= 10}>
        <summary className="cursor-pointer font-semibold">Sealed boxes on shelf ({sealed.length})</summary>
        {sealed.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No sealed boxes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {sealed.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link
                  href={`/r/${encodeURIComponent(r.tag)}`}
                  className="font-mono font-semibold text-blue-700 hover:underline"
                >
                  {r.tag}
                </Link>
                <span className="text-zinc-600">
                  {fmt(r.initial_length)} {m.unit_abbr}
                </span>
                <span className="text-xs text-zinc-500">received {fmtDate(r.received_at, false)}</span>
                <span className="ml-auto flex gap-2">
                  <Link href={`/tags?ids=${r.id}`} className="btn px-2 py-1 text-xs">
                    Tag
                  </Link>
                  {authed && (
                    <>
                      <ActionForm action={openRollAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="btn px-2 py-1 text-xs">Open</button>
                      </ActionForm>
                      <ActionForm
                        action={deleteRollAction}
                        confirm={`Remove ${r.tag}? Only do this if it was added by mistake.`}
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <button className="btn px-2 py-1 text-xs text-red-700">Remove</button>
                      </ActionForm>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {finished.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">Recently finished</summary>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {finished.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link
                  href={`/r/${encodeURIComponent(r.tag)}`}
                  className="font-mono font-semibold text-blue-700 hover:underline"
                >
                  {r.tag}
                </Link>
                <span className="text-xs text-zinc-500">finished {fmtDate(r.finished_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function OpenRollRow({ r, unit, authed }: { r: Roll; unit: string; authed: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <Link
        href={`/r/${encodeURIComponent(r.tag)}`}
        className="w-24 font-mono font-semibold text-blue-700 hover:underline"
      >
        {r.tag}
      </Link>
      <div className="min-w-40 flex-1">
        <div className="mb-1 text-sm">
          <span className="font-semibold">{fmt(r.remaining)}</span>
          <span className="text-zinc-500">
            {" "}
            / {fmt(r.initial_length)} {unit} left
          </span>
          <span className="ml-2 text-xs text-zinc-400">opened {fmtDate(r.opened_at, false)}</span>
        </div>
        <RemainingBar remaining={r.remaining} total={r.initial_length} />
      </div>
      <div className="flex gap-2">
        <Link href={`/r/${encodeURIComponent(r.tag)}`} className="btn px-3 py-1 text-sm">
          Update
        </Link>
        {authed && (
          <ActionForm action={finishRollAction} confirm={`Mark ${r.tag} as finished?`}>
            <input type="hidden" name="id" value={r.id} />
            <button className="btn btn-success px-3 py-1 text-sm">Done</button>
          </ActionForm>
        )}
      </div>
    </li>
  );
}
