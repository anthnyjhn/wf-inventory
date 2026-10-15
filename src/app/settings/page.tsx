import Link from "next/link";
import { isAuthed, isDefaultPin } from "@/lib/auth";
import { listStock, listUnits } from "@/lib/inventory";
import { changePinAction, createUnitAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { PinForm } from "@/components/PinForm";
import { UnitTable } from "@/components/UnitTable";

export default async function SettingsPage() {
  const authed = await isAuthed();
  const archived = listStock({ includeArchived: true }).filter((m) => m.archived);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {isDefaultPin() && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          The PIN is still the default <b>1234</b>. Change it below.
        </p>
      )}

      {!authed && (
        <div className="card">
          <PinForm next="/settings" />
        </div>
      )}

      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Measuring units</h2>
          <p className="text-sm text-zinc-500">
            <b>Per roll</b> units track each box/roll separately with a tag and the amount left on it (e.g.
            vinyl in metres). <b>Quantity</b> units are a simple count (e.g. corflute, ACM or metal sheets).
          </p>
        </div>
        <UnitTable units={listUnits()} authed={authed} />
        {authed && (
          <ActionForm
            action={createUnitAction}
            className="flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4"
          >
            <div className="min-w-40 flex-1">
              <label className="label" htmlFor="unit-name">
                New unit name
              </label>
              <input id="unit-name" name="name" required placeholder="e.g. Litres" className="input" />
            </div>
            <div className="w-28">
              <label className="label" htmlFor="unit-abbr">
                Abbreviation
              </label>
              <input id="unit-abbr" name="abbr" required placeholder="L" className="input" />
            </div>
            <div className="w-48">
              <label className="label" htmlFor="unit-tracking">
                Tracking
              </label>
              <select id="unit-tracking" name="tracking" className="input">
                <option value="count">Quantity</option>
                <option value="roll">Per roll (tagged)</option>
              </select>
            </div>
            <button className="btn btn-primary">Add unit</button>
          </ActionForm>
        )}
      </section>

      {authed && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Change PIN</h2>
          <ActionForm action={changePinAction} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <div>
              <label className="label" htmlFor="current">
                Current PIN
              </label>
              <input
                id="current"
                name="current"
                type="password"
                inputMode="numeric"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="next">
                New PIN
              </label>
              <input
                id="next"
                name="next"
                type="password"
                inputMode="numeric"
                required
                pattern="\d{4,8}"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="confirm">
                Confirm
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                inputMode="numeric"
                required
                className="input"
              />
            </div>
            <button className="btn btn-primary">Change PIN</button>
          </ActionForm>
          <p className="hint">Changing the PIN signs out every other device.</p>
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="font-semibold">Archived materials ({archived.length})</h2>
        {archived.length === 0 ? (
          <p className="text-sm text-zinc-500">None.</p>
        ) : (
          <ul className="text-sm">
            {archived.map((m) => (
              <li key={m.id}>
                <Link href={`/materials/${m.id}/edit`} className="text-blue-700 hover:underline">
                  <span className="font-mono">{m.code}</span> {m.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
