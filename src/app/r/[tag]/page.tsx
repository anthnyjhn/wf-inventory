import Link from "next/link";
import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { fmt, getRollByTag } from "@/lib/inventory";
import { fmtDate } from "@/lib/format";
import {
  finishRollAction,
  openRollAction,
  reopenRollAction,
  setRemainingAction,
  useFromRollAction,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { PinForm } from "@/components/PinForm";
import { RemainingBar } from "@/components/RemainingBar";

const STATUS = {
  sealed: { label: "Sealed box", className: "bg-zinc-200 text-zinc-800" },
  open: { label: "Open roll", className: "bg-blue-100 text-blue-800" },
  finished: { label: "Finished", className: "bg-zinc-800 text-white" },
};

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** The page a printed tag's QR code opens. */
export default async function RollPage({ params }: PageProps<"/r/[tag]">) {
  const { tag } = await params;
  const roll = getRollByTag(safeDecode(tag));
  if (!roll) notFound();
  const m = roll.material;
  const authed = await isAuthed();
  const unit = m.unit_abbr;
  const status = STATUS[roll.status];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-sm text-zinc-500">{roll.tag}</div>
            <h1 className="text-2xl font-bold">
              <span className="font-mono">{m.code}</span> {m.name}
            </h1>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
        </div>

        {roll.status !== "finished" ? (
          <div>
            <div className="mb-1 text-3xl font-bold">
              {fmt(roll.remaining)}{" "}
              <span className="text-lg font-normal text-zinc-500">
                / {fmt(roll.initial_length)} {unit} left
              </span>
            </div>
            <RemainingBar remaining={roll.remaining} total={roll.initial_length} />
          </div>
        ) : (
          <p className="text-zinc-600">This roll was finished on {fmtDate(roll.finished_at)}.</p>
        )}

        <dl className="grid grid-cols-3 gap-2 text-xs text-zinc-500">
          <div>
            <dt>Received</dt>
            <dd className="text-zinc-800">{fmtDate(roll.received_at, false)}</dd>
          </div>
          <div>
            <dt>Opened</dt>
            <dd className="text-zinc-800">{fmtDate(roll.opened_at, false)}</dd>
          </div>
          <div>
            <dt>Finished</dt>
            <dd className="text-zinc-800">{fmtDate(roll.finished_at, false)}</dd>
          </div>
        </dl>
      </div>

      {!authed ? (
        <div className="card">
          <PinForm next={`/r/${encodeURIComponent(roll.tag)}`} />
        </div>
      ) : roll.status === "sealed" ? (
        <div className="card space-y-3">
          <ActionForm action={openRollAction}>
            <input type="hidden" name="id" value={roll.id} />
            <button className="btn btn-primary btn-lg w-full">Open this box</button>
          </ActionForm>
        </div>
      ) : roll.status === "open" ? (
        <>
          <div className="card space-y-4">
            <ActionForm action={useFromRollAction} className="space-y-2">
              <input type="hidden" name="id" value={roll.id} />
              <label className="label" htmlFor="amount">
                Just used ({unit})
              </label>
              <div className="flex gap-2">
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  required
                  className="input"
                />
                <button className="btn btn-primary">Subtract</button>
              </div>
            </ActionForm>
            <ActionForm action={setRemainingAction} className="space-y-2">
              <input type="hidden" name="id" value={roll.id} />
              <label className="label" htmlFor="remaining">
                Or set what&rsquo;s left ({unit})
              </label>
              <div className="flex gap-2">
                <input
                  id="remaining"
                  name="remaining"
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  defaultValue={roll.remaining}
                  required
                  className="input"
                />
                <button className="btn">Save</button>
              </div>
            </ActionForm>
          </div>
          <ActionForm action={finishRollAction} confirm="Mark this roll as finished?">
            <input type="hidden" name="id" value={roll.id} />
            <button className="btn btn-success btn-lg w-full py-4 text-lg">✓ Done – roll finished</button>
          </ActionForm>
        </>
      ) : (
        <div className="card">
          <h2 className="mb-2 font-semibold">Marked as done by mistake?</h2>
          <ActionForm action={reopenRollAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={roll.id} />
            <div className="flex-1">
              <label className="label" htmlFor="reopen">
                Amount left ({unit})
              </label>
              <input
                id="reopen"
                name="remaining"
                type="number"
                step="any"
                min="0"
                required
                className="input"
              />
            </div>
            <button className="btn">Reopen roll</button>
          </ActionForm>
        </div>
      )}

      <div className="flex justify-between text-sm">
        <Link href={`/materials/${m.id}`} className="text-blue-700 hover:underline">
          All {m.code} stock →
        </Link>
        <Link href={`/tags?ids=${roll.id}`} className="text-zinc-500 hover:underline">
          Reprint tag
        </Link>
      </div>
    </div>
  );
}
