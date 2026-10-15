import Link from "next/link";
import type { Activity } from "@/lib/inventory";
import { fmtDate } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  archived: "Archived",
  restored: "Restored",
  received: "Received",
  opened: "Opened",
  updated: "Updated",
  finished: "Finished",
  reopened: "Reopened",
  removed: "Removed",
  added: "Added",
  used: "Used",
  counted: "Stock count",
};

export function ActivityList({ items, showMaterial = false }: { items: Activity[]; showMaterial?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-zinc-500">No activity yet.</p>;
  return (
    <ul className="divide-y divide-zinc-100 text-sm">
      {items.map((a) => (
        <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
          <span className="w-36 shrink-0 text-xs text-zinc-500">{fmtDate(a.created_at)}</span>
          {showMaterial && a.material_code && (
            <Link
              href={`/materials/${a.material_id}`}
              className="font-mono font-semibold text-blue-700 hover:underline"
            >
              {a.material_code}
            </Link>
          )}
          <span className="font-medium">{ACTION_LABELS[a.action] ?? a.action}</span>
          <span className="text-zinc-600">{a.detail}</span>
        </li>
      ))}
    </ul>
  );
}
