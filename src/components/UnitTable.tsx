import type { Unit } from "@/lib/inventory";
import { deleteUnitAction } from "@/app/actions";
import { ActionForm } from "./ActionForm";

export function UnitTable({
  units,
  authed,
}: {
  units: (Unit & { material_count: number })[];
  authed: boolean;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
        <tr>
          <th className="py-2 pr-3">Unit</th>
          <th className="py-2 pr-3">Abbr.</th>
          <th className="py-2 pr-3">Tracking</th>
          <th className="py-2 pr-3">Used by</th>
          <th />
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {units.map((u) => (
          <tr key={u.id}>
            <td className="py-2 pr-3 font-medium">{u.name}</td>
            <td className="py-2 pr-3">{u.abbr}</td>
            <td className="py-2 pr-3">{u.tracking === "roll" ? "Per roll (tagged)" : "Quantity"}</td>
            <td className="py-2 pr-3">{u.material_count}</td>
            <td className="py-2 text-right">
              {authed && u.material_count === 0 && (
                <ActionForm action={deleteUnitAction} confirm={`Delete unit "${u.name}"?`}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="text-xs text-red-700 hover:underline">Delete</button>
                </ActionForm>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
