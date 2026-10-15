import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

const COOKIE = "wf_auth";
const SESSION_HOURS = Number(process.env.SESSION_HOURS ?? 12);
const MAX_FAILS = 5;
const LOCKOUT_MS = 60_000;

function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

function setSetting(key: string, value: string) {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32).toString("hex");
}

function storePin(pin: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  setSetting("pin_hash", `${salt}:${hashPin(pin, salt)}`);
  // A new secret signs out every device that used the old PIN.
  setSetting("session_secret", crypto.randomBytes(32).toString("hex"));
}

function ensureInit() {
  if (!getSetting("pin_hash")) storePin(process.env.ADMIN_PIN ?? "1234");
}

export function isDefaultPin(): boolean {
  ensureInit();
  return !process.env.ADMIN_PIN && checkPin("1234");
}

function checkPin(pin: string): boolean {
  ensureInit();
  const [salt, hash] = getSetting("pin_hash")!.split(":");
  const candidate = Buffer.from(hashPin(pin, salt), "hex");
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

function sign(expires: number): string {
  ensureInit();
  return crypto.createHmac("sha256", getSetting("session_secret")!).update(String(expires)).digest("hex");
}

// Simple in-memory brute-force guard (one shared counter – this is a single small server).
const guard = { fails: 0, lockedUntil: 0 };

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(pin: string): Promise<LoginResult> {
  if (Date.now() < guard.lockedUntil) {
    const secs = Math.ceil((guard.lockedUntil - Date.now()) / 1000);
    return { ok: false, error: `Too many wrong PINs. Try again in ${secs}s.` };
  }
  if (!checkPin(pin)) {
    guard.fails += 1;
    if (guard.fails >= MAX_FAILS) {
      guard.fails = 0;
      guard.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    return { ok: false, error: "Wrong PIN." };
  }
  guard.fails = 0;
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expStr, sig] = value.split(".");
  const expires = Number(expStr);
  if (!expires || expires < Date.now() || !sig) return false;
  const expected = sign(expires);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export class AuthError extends Error {
  constructor() {
    super("Enter the PIN to make changes.");
  }
}

export async function requireAuth() {
  if (!(await isAuthed())) throw new AuthError();
}

export function changePin(current: string, next: string) {
  if (!checkPin(current)) throw new Error("Current PIN is wrong.");
  if (!/^\d{4,8}$/.test(next)) throw new Error("New PIN must be 4–8 digits.");
  storePin(next);
}
