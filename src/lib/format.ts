export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** "14:00" → "2pm", "14:30" → "2:30pm" */
export function formatTime(hhmm: string | null): string | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const min = m[2];
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === "00" ? `${h12}${suffix}` : `${h12}:${min}${suffix}`;
}

/** "Sat 26 Sep, 2pm" (either part may be missing). */
export function formatWhen(date: string | null, teeTime: string | null): string | null {
  const d = formatDate(date);
  const t = formatTime(teeTime);
  if (d && t) return `${d}, ${t}`;
  return d ?? null;
}
