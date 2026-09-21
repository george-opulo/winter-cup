"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { setFreeDate } from "@/lib/actions";
import { SEASON_WINDOW } from "@/lib/scheduler";
import type { FreeDate } from "@/lib/types";

interface CalPlayer {
  id: string;
  name: string;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Months (as first-of-month Dates) covering the season window. */
function seasonMonths(): Date[] {
  const start = new Date(SEASON_WINDOW.start + "T00:00:00Z");
  const end = new Date(SEASON_WINDOW.end + "T00:00:00Z");
  const months: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function AvailabilityCalendar({
  players,
  freeDates,
}: {
  players: CalPlayer[];
  freeDates: FreeDate[];
}) {
  const [me, setMe] = useState<string>("");
  // Optimistic copy of my own days so taps feel instant.
  const [myDates, setMyDates] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wc-player");
      if (saved && players.some((p) => p.id === saved)) setMe(saved);
    } catch {
      /* private mode etc. — identity just starts unset */
    }
  }, [players]);

  useEffect(() => {
    setMyDates(new Set(freeDates.filter((f) => f.playerId === me).map((f) => f.date)));
  }, [me, freeDates]);

  function chooseMe(id: string) {
    setMe(id);
    try {
      localStorage.setItem("wc-player", id);
    } catch {
      /* fine — selection lasts for this visit only */
    }
  }

  const countByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of freeDates) {
      // My own entries come from local state instead, so taps update instantly.
      if (f.playerId === me) continue;
      counts.set(f.date, (counts.get(f.date) ?? 0) + 1);
    }
    return counts;
  }, [freeDates, me]);

  function toggle(date: string) {
    if (!me) return;
    const nowFree = !myDates.has(date);
    setMyDates((prev) => {
      const next = new Set(prev);
      if (nowFree) next.add(date);
      else next.delete(date);
      return next;
    });
    startTransition(() => setFreeDate(me, date, nowFree));
  }

  const today = iso(new Date());
  const months = seasonMonths();
  const total = players.length;

  return (
    <>
      <div className="identity-bar">
        <label htmlFor="me">I am</label>
        <select id="me" value={me} onChange={(e) => chooseMe(e.target.value)}>
          <option value="">— pick your name —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {!me && <p className="footnote" style={{ marginBottom: 14 }}>Pick your name to start tapping days.</p>}

      {months.map((month) => {
        const year = month.getUTCFullYear();
        const monthIdx = month.getUTCMonth();
        const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
        const firstWeekday = (new Date(Date.UTC(year, monthIdx, 1)).getUTCDay() + 6) % 7; // Mon=0
        const label = month.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });
        return (
          <div className="cal-month" key={label}>
            <h3 className="cal-title">{label}</h3>
            <div className="cal-grid">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="cal-dow">
                  {d}
                </span>
              ))}
              {Array.from({ length: firstWeekday }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const date = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                const past = date < today || date < SEASON_WINDOW.start || date > SEASON_WINDOW.end;
                const mine = myDates.has(date);
                const count = (countByDate.get(date) ?? 0) + (mine ? 1 : 0);
                return (
                  <button
                    key={date}
                    className={`cal-day${mine ? " mine" : ""}${count === total ? " full" : ""}`}
                    disabled={past || !me}
                    onClick={() => toggle(date)}
                  >
                    <span className="d">{i + 1}</span>
                    <span className="c">{count > 0 ? count : " "}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="footnote">
        Tap again to remove a day. Orange = you're free · a full house of {total} gets a ring.
      </p>
    </>
  );
}
