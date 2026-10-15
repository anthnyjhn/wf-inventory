"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ActionState } from "@/app/actions";
import type { Material, Unit } from "@/lib/inventory";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

export function MaterialForm({
  action,
  units,
  categories,
  material,
}: {
  action: Action;
  units: Unit[];
  categories: string[];
  material?: Material;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [unitId, setUnitId] = useState(String(material?.unit_id ?? units[0]?.id ?? ""));
  const unit = units.find((u) => String(u.id) === unitId);
  const isRoll = unit?.tracking === "roll";
  const stockWord = isRoll ? "boxes" : (unit?.abbr ?? "qty");

  return (
    <form action={formAction} className="space-y-5">
      {material && <input type="hidden" name="id" value={material.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="code">
            Product code
          </label>
          <input
            id="code"
            name="code"
            required
            defaultValue={material?.code}
            placeholder="e.g. 2572"
            className="input font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={material?.name}
            placeholder="e.g. High Tack 5yr Vinyl 1370mm"
            className="input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <input
            id="category"
            name="category"
            list="categories"
            defaultValue={material?.category}
            placeholder="e.g. Vinyl"
            className="input"
          />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="unit_id">
            Measuring unit
          </label>
          <select
            id="unit_id"
            name="unit_id"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="input"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.abbr}){u.tracking === "roll" ? " – tracked per roll" : ""}
              </option>
            ))}
          </select>
          <p className="hint">
            <Link href="/settings" className="underline">
              Manage units
            </Link>
          </p>
        </div>
        {isRoll && (
          <div>
            <label className="label" htmlFor="roll_length">
              Full roll length ({unit.abbr})
            </label>
            <input
              id="roll_length"
              name="roll_length"
              type="number"
              step="any"
              min="0"
              required
              defaultValue={material?.roll_length ?? ""}
              placeholder="e.g. 50"
              className="input"
            />
            <p className="hint">Starting amount for each new box.</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="min_stock">
            Minimum stock ({stockWord})
          </label>
          <input
            id="min_stock"
            name="min_stock"
            type="number"
            step="any"
            min="0"
            defaultValue={material?.min_stock ?? 0}
            className="input"
          />
          <p className="hint">Shows as &ldquo;Low&rdquo; below this.</p>
        </div>
        <div>
          <label className="label" htmlFor="max_stock">
            Maximum stock ({stockWord})
          </label>
          <input
            id="max_stock"
            name="max_stock"
            type="number"
            step="any"
            min="0"
            defaultValue={material?.max_stock ?? 0}
            className="input"
          />
          <p className="hint">Reorder fills up to this. 0 = no max.</p>
        </div>
        {!material && (
          <div>
            <label className="label" htmlFor="initial_stock">
              Current stock ({stockWord})
            </label>
            <input
              id="initial_stock"
              name="initial_stock"
              type="number"
              step="1"
              min="0"
              defaultValue={0}
              className="input"
            />
            <p className="hint">{isRoll ? "Sealed boxes on the shelf now." : "Count on the shelf now."}</p>
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={material?.notes}
          placeholder="Supplier, width, colour…"
          className="input"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-lg" disabled={pending}>
          {material ? "Save changes" : "Add material"}
        </button>
        <Link href={material ? `/materials/${material.id}` : "/"} className="btn btn-lg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
