import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import { logoutAction } from "./actions";
import "./globals.css";

// Stock changes constantly – always render from the live database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WF Inventory",
  description: "Vinyl and sheet stock tracking",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/reorder", label: "Reorder" },
  { href: "/scan", label: "Scan" },
  { href: "/materials/new", label: "Add material" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const authed = await isAuthed();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="no-print border-b border-zinc-200 bg-zinc-900 text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="mr-auto text-lg font-bold tracking-tight sm:mr-0">
              WF Inventory
            </Link>
            <nav className="order-last -mx-4 flex w-full gap-x-4 overflow-x-auto whitespace-nowrap px-4 text-sm text-zinc-300 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:px-0">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
            {authed ? (
              <form action={logoutAction}>
                <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold hover:bg-emerald-500">
                  Unlocked · Lock
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-zinc-700 px-3 py-1 text-xs font-semibold hover:bg-zinc-600"
              >
                Locked · Enter PIN
              </Link>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
