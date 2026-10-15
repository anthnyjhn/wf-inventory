import { headers } from "next/headers";

/**
 * Base URL printed into QR codes. Set APP_URL (e.g. http://192.168.1.50:3000) so tags
 * point at an address phones on the network can reach, not "localhost".
 */
export async function getBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export function isLocalhost(url: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);
}
