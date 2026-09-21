"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmRoundDate, proposeDate, removeDateOption, setDateAvailability } from "@/lib/actions";

interface PlannerPlayer {
  id: string;
  name: string;
}

interface PlannerDate {
  id: string;
  date: string;
  availablePlayerIds: string[];
}

interface PlannerRound {
  id: string;
  label: string;
  course: string;
  date: string | null;
  chooserName: string | null;
  dateOptions: PlannerDate[];
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function Planner({
  round,
  players,
  isAdmin,
}: {
  round: PlannerRound;
  players: PlannerPlayer[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [me, setMe] = useState<string>("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wc-player");
      if (saved && players.some((p) => p.id === saved)) setMe(saved);
    } catch {
      /* private mode etc. — identity just starts unset */
    }
  }, [players]);

  function chooseMe(id: string) {
    setMe(id);
    try {
      localStorage.setItem("wc-player", id);
    } catch {
      /* fine — selection lasts for this visit only */
    }
  }

  function toggle(dateId: string, available: boolean) {
    if (!me) return;
    startTransition(async () => {
      await setDateAvailability(dateId, me, available);
      router.refresh();
    });
  }

  const total = players.length;
  const bestCount = Math.max(0, ...round.dateOptions.map((d) => d.availablePlayerIds.length));
  const nameOf = new Map(players.map((p) => [p.id, p.name]));

  return (
    <>
      {round.date && (
        <div className="confirmed-banner">
          Confirmed — {formatDate(round.date)}
          {round.course ? ` · ${round.course}` : ""}
        </div>
      )}

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

      {round.dateOptions.length === 0 && (
        <p className="footnote">No dates proposed yet — throw the first one in below.</p>
      )}

      <div className="dates-list">
        {round.dateOptions.map((d) => {
          const count = d.availablePlayerIds.length;
          const isBest = count > 0 && count === bestCount;
          const meIn = me !== "" && d.availablePlayerIds.includes(me);
          const isConfirmed = round.date === d.date;
          return (
            <div key={d.id} className={`date-row${isBest ? " best" : ""}`}>
              <div className="date-main">
                <span className="date-label">{formatDate(d.date)}</span>
                <span className={`count-badge${isBest ? " best" : ""}`}>
                  {count}/{total}
                </span>
              </div>
              <div className="who-list">
                {count === 0
                  ? "No one in yet"
                  : d.availablePlayerIds.map((id) => nameOf.get(id) ?? "?").join(" · ")}
              </div>
              <div className="date-actions">
                <button
                  className={`btn small${meIn ? "" : " secondary"}`}
                  disabled={!me || pending}
                  onClick={() => toggle(d.id, !meIn)}
                  title={me ? "" : "Pick your name first"}
                >
                  {meIn ? "I'm in ✓" : "I'm in?"}
                </button>
                {isAdmin && !isConfirmed && (
                  <form action={confirmRoundDate}>
                    <input type="hidden" name="roundId" value={round.id} />
                    <input type="hidden" name="date" value={d.date} />
                    <button className="btn small">Confirm</button>
                  </form>
                )}
                {isAdmin && (
                  <form action={removeDateOption}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="btn danger small">Remove</button>
                  </form>
                )}
                {isConfirmed && <span className="chip win">Confirmed</span>}
              </div>
            </div>
          );
        })}
      </div>

      <form action={proposeDate} className="propose-bar">
        <input type="hidden" name="roundId" value={round.id} />
        <input type="date" name="date" required aria-label="Propose a date" />
        <button className="btn small">Propose date</button>
      </form>

      <p className="footnote" style={{ marginTop: 18 }}>
        {round.chooserName
          ? `${round.chooserName}'s round — they pick the course.`
          : "No one assigned to this round yet — spin the wheel."}
        {" "}Anyone can propose dates and mark themselves in.
      </p>
    </>
  );
}
