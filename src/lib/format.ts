/** SQLite stores UTC "YYYY-MM-DD HH:MM:SS"; show it in the server's local time. */
export function fmtDate(s: string | null | undefined, withTime = true): string {
  if (!s) return "–";
  const d = new Date(s.replace(" ", "T") + "Z");
  return withTime
    ? d.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
