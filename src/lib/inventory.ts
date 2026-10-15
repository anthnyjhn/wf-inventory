import { getDb } from "./db";

export type Tracking = "roll" | "count";
export type RollStatus = "sealed" | "open" | "finished";
export type StockStatus = "out" | "low" | "ok" | "over";

export interface Unit {
  id: number;
  name: string;
  abbr: string;
  tracking: Tracking;
}

export interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  unit_id: number;
  roll_length: number | null;
  min_stock: number;
  max_stock: number;
  quantity: number;
  notes: string;
  archived: number;
  created_at: string;
  unit_name: string;
  unit_abbr: string;
  tracking: Tracking;
}

export interface Roll {
  id: number;
  material_id: number;
  tag: string;
  status: RollStatus;
  initial_length: number;
  remaining: number;
  received_at: string;
  opened_at: string | null;
  finished_at: string | null;
}

export interface Activity {
  id: number;
  material_id: number | null;
  roll_id: number | null;
  action: string;
  detail: string;
  created_at: string;
  material_code?: string;
  roll_tag?: string | null;
}

export interface MaterialStock extends Material {
  sealed_count: number;
  open_count: number;
  open_remaining: number;
  sealed_remaining: number;
  /** The number compared against min/max: boxes on shelf (rolls) or quantity (count). */
  level: number;
  status: StockStatus;
  reorder_qty: number;
}

export class InventoryError extends Error {}

const MATERIAL_SELECT = `
  SELECT m.*, u.name AS unit_name, u.abbr AS unit_abbr, u.tracking
  FROM materials m JOIN units u ON u.id = m.unit_id
`;

export function computeStatus(
  m: Pick<Material, "tracking" | "min_stock" | "max_stock" | "quantity">,
  sealed: number,
  open: number,
): { level: number; status: StockStatus; reorder_qty: number } {
  const level = m.tracking === "roll" ? sealed : m.quantity;
  const nothingLeft = m.tracking === "roll" ? sealed + open === 0 : m.quantity <= 0;
  let status: StockStatus = "ok";
  if (nothingLeft) status = "out";
  else if (m.min_stock > 0 && level < m.min_stock) status = "low";
  else if (m.max_stock > 0 && level > m.max_stock) status = "over";

  let reorder_qty = 0;
  if (status === "out" || status === "low") {
    const target = m.max_stock > 0 ? m.max_stock : m.min_stock;
    reorder_qty = Math.max(0, Math.ceil(target - level));
  }
  return { level, status, reorder_qty };
}

// ---------- reads ----------

export function listUnits(): (Unit & { material_count: number })[] {
  return getDb()
    .prepare(
      `SELECT u.*, (SELECT COUNT(*) FROM materials m WHERE m.unit_id = u.id) AS material_count
       FROM units u ORDER BY u.name`,
    )
    .all() as (Unit & { material_count: number })[];
}

export function getUnit(id: number): Unit | undefined {
  return getDb().prepare("SELECT * FROM units WHERE id = ?").get(id) as Unit | undefined;
}

export function listCategories(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT category FROM materials WHERE category <> '' ORDER BY category")
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function listStock(opts: { includeArchived?: boolean } = {}): MaterialStock[] {
  const rows = getDb()
    .prepare(
      `SELECT m.*, u.name AS unit_name, u.abbr AS unit_abbr, u.tracking,
         COALESCE(SUM(r.status = 'sealed'), 0) AS sealed_count,
         COALESCE(SUM(r.status = 'open'), 0) AS open_count,
         COALESCE(SUM(CASE WHEN r.status = 'open' THEN r.remaining END), 0) AS open_remaining,
         COALESCE(SUM(CASE WHEN r.status = 'sealed' THEN r.remaining END), 0) AS sealed_remaining
       FROM materials m
       JOIN units u ON u.id = m.unit_id
       LEFT JOIN rolls r ON r.material_id = m.id AND r.status <> 'finished'
       ${opts.includeArchived ? "" : "WHERE m.archived = 0"}
       GROUP BY m.id
       ORDER BY m.category, m.code`,
    )
    .all() as Omit<MaterialStock, "level" | "status" | "reorder_qty">[];
  return rows.map((r) => ({ ...r, ...computeStatus(r, r.sealed_count, r.open_count) }));
}

export function getMaterialStock(id: number): MaterialStock | undefined {
  return listStock({ includeArchived: true }).find((m) => m.id === id);
}

export function getMaterialByCode(code: string): Material | undefined {
  return getDb().prepare(`${MATERIAL_SELECT} WHERE m.code = ?`).get(code) as Material | undefined;
}

export function listRolls(materialId: number, statuses: RollStatus[]): Roll[] {
  if (statuses.length === 0) return [];
  const placeholders = statuses.map(() => "?").join(",");
  return getDb()
    .prepare(
      `SELECT * FROM rolls WHERE material_id = ? AND status IN (${placeholders})
       ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'sealed' THEN 1 ELSE 2 END,
                COALESCE(finished_at, opened_at, received_at) DESC, id DESC`,
    )
    .all(materialId, ...statuses) as Roll[];
}

export function listRecentlyFinished(materialId: number, limit = 10): Roll[] {
  return getDb()
    .prepare(
      `SELECT * FROM rolls WHERE material_id = ? AND status = 'finished'
       ORDER BY finished_at DESC, id DESC LIMIT ?`,
    )
    .all(materialId, limit) as Roll[];
}

export function getRollByTag(tag: string): (Roll & { material: Material }) | undefined {
  const roll = getDb().prepare("SELECT * FROM rolls WHERE tag = ?").get(tag) as Roll | undefined;
  if (!roll) return undefined;
  const material = getDb().prepare(`${MATERIAL_SELECT} WHERE m.id = ?`).get(roll.material_id) as Material;
  return { ...roll, material };
}

export function getRollsByIds(ids: number[]): (Roll & { material: Material })[] {
  if (ids.length === 0) return [];
  const rolls = getDb()
    .prepare(`SELECT * FROM rolls WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY id`)
    .all(...ids) as Roll[];
  const materials = new Map<number, Material>();
  return rolls.map((r) => {
    if (!materials.has(r.material_id)) {
      materials.set(
        r.material_id,
        getDb().prepare(`${MATERIAL_SELECT} WHERE m.id = ?`).get(r.material_id) as Material,
      );
    }
    return { ...r, material: materials.get(r.material_id)! };
  });
}

export function listActivity(opts: { materialId?: number; limit?: number } = {}): Activity[] {
  const where = opts.materialId ? "WHERE a.material_id = ?" : "";
  const params: (number | string)[] = opts.materialId ? [opts.materialId] : [];
  return getDb()
    .prepare(
      `SELECT a.*, m.code AS material_code, r.tag AS roll_tag
       FROM activity a
       LEFT JOIN materials m ON m.id = a.material_id
       LEFT JOIN rolls r ON r.id = a.roll_id
       ${where}
       ORDER BY a.id DESC LIMIT ?`,
    )
    .all(...params, opts.limit ?? 50) as Activity[];
}

// ---------- writes ----------

function log(materialId: number | null, rollId: number | null, action: string, detail = "") {
  getDb()
    .prepare("INSERT INTO activity (material_id, roll_id, action, detail) VALUES (?, ?, ?, ?)")
    .run(materialId, rollId, action, detail);
}

export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

/** Codes like "2572", "ID5" become the tag prefix: "2572-001". */
function tagPrefix(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]+/g, "") || "ROLL";
}

// Tags are unique across all materials, so look at every tag with this prefix.
function nextTag(code: string): string {
  const prefix = tagPrefix(code);
  const rows = getDb().prepare("SELECT tag FROM rolls WHERE tag LIKE ? || '-%'").all(prefix) as {
    tag: string;
  }[];
  let max = 0;
  for (const { tag } of rows) {
    const n = Number(tag.slice(prefix.length + 1));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export interface MaterialInput {
  code: string;
  name: string;
  category: string;
  unit_id: number;
  roll_length: number | null;
  min_stock: number;
  max_stock: number;
  notes: string;
}

function validateMaterial(input: MaterialInput, excludeId?: number) {
  if (!input.code) throw new InventoryError("Product code is required.");
  if (!input.name) throw new InventoryError("Name is required.");
  const unit = getUnit(input.unit_id);
  if (!unit) throw new InventoryError("Choose a measuring unit.");
  if (unit.tracking === "roll" && !(input.roll_length && input.roll_length > 0)) {
    throw new InventoryError(`Enter the full roll length in ${unit.abbr}.`);
  }
  if (input.min_stock < 0 || input.max_stock < 0) {
    throw new InventoryError("Min and max cannot be negative.");
  }
  if (input.max_stock > 0 && input.min_stock > input.max_stock) {
    throw new InventoryError("Minimum cannot be greater than maximum.");
  }
  const dupe = getDb()
    .prepare("SELECT id FROM materials WHERE code = ? AND id IS NOT ?")
    .get(input.code, excludeId ?? null);
  if (dupe) throw new InventoryError(`Product code "${input.code}" already exists.`);
  return unit;
}

export function createMaterial(input: MaterialInput, initialStock: number): number {
  const db = getDb();
  return db.transaction(() => {
    const unit = validateMaterial(input);
    const res = db
      .prepare(
        `INSERT INTO materials (code, name, category, unit_id, roll_length, min_stock, max_stock, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.code,
        input.name,
        input.category,
        input.unit_id,
        unit.tracking === "roll" ? input.roll_length : null,
        input.min_stock,
        input.max_stock,
        input.notes,
      );
    const id = Number(res.lastInsertRowid);
    log(id, null, "created", `${input.code} ${input.name}`);
    if (initialStock > 0) {
      if (unit.tracking === "roll") receiveRolls(id, initialStock);
      else adjustQuantity(id, initialStock, "Initial stock");
    }
    return id;
  })();
}

export function updateMaterial(id: number, input: MaterialInput) {
  const db = getDb();
  db.transaction(() => {
    const existing = getMaterialStock(id);
    if (!existing) throw new InventoryError("Material not found.");
    const unit = validateMaterial(input, id);
    if (unit.tracking !== existing.tracking) {
      const hasStock =
        existing.tracking === "roll"
          ? existing.sealed_count + existing.open_count > 0
          : existing.quantity > 0;
      if (hasStock) {
        throw new InventoryError(
          "Can't switch between roll and quantity units while there is stock. Use up or remove the stock first.",
        );
      }
    }
    db.prepare(
      `UPDATE materials SET code = ?, name = ?, category = ?, unit_id = ?, roll_length = ?,
         min_stock = ?, max_stock = ?, notes = ? WHERE id = ?`,
    ).run(
      input.code,
      input.name,
      input.category,
      input.unit_id,
      unit.tracking === "roll" ? input.roll_length : null,
      input.min_stock,
      input.max_stock,
      input.notes,
      id,
    );
    log(id, null, "edited", `min ${fmt(input.min_stock)} / max ${fmt(input.max_stock)}`);
  })();
}

export function setArchived(id: number, archived: boolean) {
  getDb()
    .prepare("UPDATE materials SET archived = ? WHERE id = ?")
    .run(archived ? 1 : 0, id);
  log(id, null, archived ? "archived" : "restored");
}

function requireMaterial(id: number): Material {
  const m = getDb().prepare(`${MATERIAL_SELECT} WHERE m.id = ?`).get(id) as Material | undefined;
  if (!m) throw new InventoryError("Material not found.");
  return m;
}

/** Add `count` new sealed boxes. Returns the new roll ids (for printing tags). */
export function receiveRolls(materialId: number, count: number, length?: number): number[] {
  const db = getDb();
  return db.transaction(() => {
    const m = requireMaterial(materialId);
    if (m.tracking !== "roll") throw new InventoryError("This material is counted by quantity.");
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      throw new InventoryError("Enter a box count between 1 and 500.");
    }
    const len = length && length > 0 ? length : m.roll_length;
    if (!len) throw new InventoryError("Set a roll length for this material first.");
    const insert = db.prepare(
      "INSERT INTO rolls (material_id, tag, status, initial_length, remaining) VALUES (?, ?, 'sealed', ?, ?)",
    );
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      const res = insert.run(materialId, nextTag(m.code), len, len);
      ids.push(Number(res.lastInsertRowid));
    }
    log(materialId, null, "received", `${count} box${count === 1 ? "" : "es"} × ${fmt(len)} ${m.unit_abbr}`);
    return ids;
  })();
}

function requireRoll(rollId: number): Roll & { material: Material } {
  const roll = getDb().prepare("SELECT * FROM rolls WHERE id = ?").get(rollId) as Roll | undefined;
  if (!roll) throw new InventoryError("Roll not found.");
  return { ...roll, material: requireMaterial(roll.material_id) };
}

export function openRoll(rollId: number) {
  const roll = requireRoll(rollId);
  if (roll.status !== "sealed") throw new InventoryError("Only a sealed box can be opened.");
  getDb().prepare("UPDATE rolls SET status = 'open', opened_at = datetime('now') WHERE id = ?").run(rollId);
  log(roll.material_id, rollId, "opened", roll.tag);
}

/** Open the oldest sealed box of a material. Returns the opened roll's tag. */
export function openNextRoll(materialId: number): string {
  const next = getDb()
    .prepare(
      "SELECT id, tag FROM rolls WHERE material_id = ? AND status = 'sealed' ORDER BY received_at, id LIMIT 1",
    )
    .get(materialId) as { id: number; tag: string } | undefined;
  if (!next) throw new InventoryError("No sealed boxes left to open.");
  openRoll(next.id);
  return next.tag;
}

export function setRemaining(rollId: number, remaining: number) {
  const roll = requireRoll(rollId);
  if (roll.status === "finished") throw new InventoryError("This roll is already finished.");
  if (!Number.isFinite(remaining) || remaining < 0) {
    throw new InventoryError("Remaining amount must be 0 or more.");
  }
  if (remaining === 0) return finishRoll(rollId);
  const db = getDb();
  db.prepare(
    `UPDATE rolls SET remaining = ?, status = 'open',
       opened_at = COALESCE(opened_at, datetime('now')) WHERE id = ?`,
  ).run(remaining, rollId);
  log(
    roll.material_id,
    rollId,
    roll.status === "sealed" ? "opened" : "updated",
    `${roll.tag}: ${fmt(roll.remaining)} → ${fmt(remaining)} ${roll.material.unit_abbr}`,
  );
}

export function useFromRoll(rollId: number, amount: number) {
  const roll = requireRoll(rollId);
  if (!Number.isFinite(amount) || amount <= 0) throw new InventoryError("Enter an amount used.");
  setRemaining(rollId, Math.max(0, Math.round((roll.remaining - amount) * 100) / 100));
}

export function finishRoll(rollId: number) {
  const roll = requireRoll(rollId);
  if (roll.status === "finished") return;
  getDb()
    .prepare(
      `UPDATE rolls SET status = 'finished', remaining = 0,
         opened_at = COALESCE(opened_at, datetime('now')), finished_at = datetime('now')
       WHERE id = ?`,
    )
    .run(rollId);
  log(roll.material_id, rollId, "finished", roll.tag);
}

/** Undo an accidental "done". */
export function reopenRoll(rollId: number, remaining: number) {
  const roll = requireRoll(rollId);
  if (roll.status !== "finished") throw new InventoryError("This roll isn't finished.");
  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new InventoryError("Enter how much is left on the roll.");
  }
  getDb()
    .prepare("UPDATE rolls SET status = 'open', remaining = ?, finished_at = NULL WHERE id = ?")
    .run(remaining, rollId);
  log(roll.material_id, rollId, "reopened", `${roll.tag}: ${fmt(remaining)} ${roll.material.unit_abbr}`);
}

/** Correction: delete a box that was entered by mistake. */
export function deleteRoll(rollId: number) {
  const roll = requireRoll(rollId);
  getDb().prepare("DELETE FROM rolls WHERE id = ?").run(rollId);
  log(roll.material_id, null, "removed", `${roll.tag} (${roll.status})`);
}

export function adjustQuantity(materialId: number, delta: number, note = "") {
  const m = requireMaterial(materialId);
  if (m.tracking !== "count") throw new InventoryError("This material is tracked by roll.");
  if (!Number.isFinite(delta) || delta === 0) throw new InventoryError("Enter a quantity.");
  const next = m.quantity + delta;
  if (next < 0) {
    throw new InventoryError(`Only ${fmt(m.quantity)} ${m.unit_abbr} in stock.`);
  }
  getDb().prepare("UPDATE materials SET quantity = ? WHERE id = ?").run(next, materialId);
  const verb = delta > 0 ? "added" : "used";
  log(
    materialId,
    null,
    verb,
    `${fmt(Math.abs(delta))} ${m.unit_abbr} (now ${fmt(next)})${note ? ` – ${note}` : ""}`,
  );
}

export function setQuantity(materialId: number, quantity: number) {
  const m = requireMaterial(materialId);
  if (m.tracking !== "count") throw new InventoryError("This material is tracked by roll.");
  if (!Number.isFinite(quantity) || quantity < 0) throw new InventoryError("Enter a count of 0 or more.");
  getDb().prepare("UPDATE materials SET quantity = ? WHERE id = ?").run(quantity, materialId);
  log(materialId, null, "counted", `${fmt(m.quantity)} → ${fmt(quantity)} ${m.unit_abbr}`);
}

export function createUnit(name: string, abbr: string, tracking: Tracking) {
  if (!name || !abbr) throw new InventoryError("Unit name and abbreviation are required.");
  if (tracking !== "roll" && tracking !== "count") throw new InventoryError("Pick a tracking type.");
  const dupe = getDb().prepare("SELECT 1 FROM units WHERE name = ? COLLATE NOCASE").get(name);
  if (dupe) throw new InventoryError(`Unit "${name}" already exists.`);
  getDb().prepare("INSERT INTO units (name, abbr, tracking) VALUES (?, ?, ?)").run(name, abbr, tracking);
}

export function deleteUnit(id: number) {
  const used = getDb().prepare("SELECT 1 FROM materials WHERE unit_id = ?").get(id);
  if (used) throw new InventoryError("This unit is used by a material and can't be deleted.");
  getDb().prepare("DELETE FROM units WHERE id = ?").run(id);
}
