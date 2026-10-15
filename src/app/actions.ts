"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as auth from "@/lib/auth";
import * as inv from "@/lib/inventory";

export type ActionState = { error?: string; message?: string } | undefined;

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function num(fd: FormData, key: string): number {
  const raw = str(fd, key);
  return raw === "" ? 0 : Number(raw);
}

function id(fd: FormData, key = "id"): number {
  const n = Number(fd.get(key));
  if (!Number.isInteger(n) || n <= 0) throw new inv.InventoryError("Missing id.");
  return n;
}

/** Runs a PIN-protected mutation and turns expected errors into form messages. */
async function guarded(fn: () => void | string, message?: string): Promise<ActionState> {
  try {
    await auth.requireAuth();
    const result = fn();
    revalidatePath("/", "layout");
    return { message: typeof result === "string" ? result : message };
  } catch (e) {
    if (e instanceof inv.InventoryError || e instanceof auth.AuthError) return { error: e.message };
    throw e;
  }
}

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// ---------- auth ----------

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await auth.login(str(fd, "pin"));
  if (!res.ok) return { error: res.error };
  const next = str(fd, "next");
  if (next) redirect(safeNext(next));
  revalidatePath("/", "layout");
  return {};
}

export async function logoutAction() {
  await auth.logout();
  revalidatePath("/", "layout");
}

export async function changePinAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await auth.requireAuth();
    if (str(fd, "next") !== str(fd, "confirm")) return { error: "New PINs don't match." };
    auth.changePin(str(fd, "current"), str(fd, "next"));
  } catch (e) {
    return { error: (e as Error).message };
  }
  // Changing the PIN signs everyone out, including this device.
  await auth.login(str(fd, "next"));
  return { message: "PIN changed." };
}

// ---------- materials ----------

function materialInput(fd: FormData): inv.MaterialInput {
  const rollLength = str(fd, "roll_length");
  return {
    code: str(fd, "code"),
    name: str(fd, "name"),
    category: str(fd, "category"),
    unit_id: Number(fd.get("unit_id")),
    roll_length: rollLength ? Number(rollLength) : null,
    min_stock: num(fd, "min_stock"),
    max_stock: num(fd, "max_stock"),
    notes: str(fd, "notes"),
  };
}

export async function createMaterialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = 0;
  const res = await guarded(() => {
    newId = inv.createMaterial(materialInput(fd), Math.floor(num(fd, "initial_stock")));
  });
  if (res?.error) return res;
  redirect(`/materials/${newId}`);
}

export async function updateMaterialAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const materialId = id(fd);
  const res = await guarded(() => inv.updateMaterial(materialId, materialInput(fd)));
  if (res?.error) return res;
  redirect(`/materials/${materialId}`);
}

export async function setArchivedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.setArchived(id(fd), str(fd, "archived") === "1"));
}

// ---------- rolls ----------

export async function receiveRollsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let ids: number[] = [];
  const res = await guarded(() => {
    const length = str(fd, "length");
    ids = inv.receiveRolls(id(fd), Math.floor(num(fd, "count")), length ? Number(length) : undefined);
  });
  if (res?.error) return res;
  if (str(fd, "print") === "1") redirect(`/tags?ids=${ids.join(",")}`);
  return { message: `Added ${ids.length} box${ids.length === 1 ? "" : "es"}.` };
}

export async function openNextRollAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => `Opened ${inv.openNextRoll(id(fd))}.`);
}

export async function openRollAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.openRoll(id(fd)), "Roll opened.");
}

export async function setRemainingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.setRemaining(id(fd), num(fd, "remaining")), "Saved.");
}

export async function useFromRollAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.useFromRoll(id(fd), num(fd, "amount")), "Saved.");
}

export async function finishRollAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.finishRoll(id(fd)), "Marked as finished.");
}

export async function reopenRollAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.reopenRoll(id(fd), num(fd, "remaining")), "Roll reopened.");
}

export async function deleteRollAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.deleteRoll(id(fd)), "Removed.");
}

// ---------- quantity items ----------

export async function adjustQuantityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const sign = str(fd, "direction") === "use" ? -1 : 1;
  return guarded(() => inv.adjustQuantity(id(fd), sign * num(fd, "amount"), str(fd, "note")), "Saved.");
}

export async function setQuantityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.setQuantity(id(fd), num(fd, "quantity")), "Stock count saved.");
}

// ---------- units ----------

export async function createUnitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(
    () => inv.createUnit(str(fd, "name"), str(fd, "abbr"), str(fd, "tracking") as inv.Tracking),
    "Unit added.",
  );
}

export async function deleteUnitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => inv.deleteUnit(id(fd)), "Unit deleted.");
}

// ---------- scanning ----------

/** Accepts a roll tag, a full tag URL or a material code from a barcode scanner. */
export async function scanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let q = str(fd, "q");
  const m = q.match(/\/r\/([^/?#\s]+)/);
  if (m) q = decodeURIComponent(m[1]);
  if (!q) return { error: "Scan or type a tag." };
  const roll = inv.getRollByTag(q);
  if (roll) redirect(`/r/${encodeURIComponent(roll.tag)}`);
  const material = inv.getMaterialByCode(q);
  if (material) redirect(`/materials/${material.id}`);
  return { error: `Nothing found for "${q}".` };
}
