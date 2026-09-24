import Link from "next/link";
import {
  addPlayer,
  applySchedule,
  createRound,
  deleteRound,
  logout,
  reopenRound,
  saveScores,
  updatePlayer,
  updateRound,
} from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import { formatWhen } from "@/lib/format";
import { SEASON_WINDOW, suggestSchedule } from "@/lib/scheduler";
import { getStore } from "@/lib/store";
import { LoginForm } from "./LoginForm";
import { ConfirmSubmit, SubmitButton } from "./SubmitButton";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string; gap?: string }>;
}) {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const { round: roundParam, gap: gapParam } = await searchParams;
  const season = await getStore().loadSeason();
  const rounds = [...season.rounds].sort((a, b) => a.seq - b.seq);
  const activePlayers = season.players.filter((p) => p.active);
  const selectedRound =
    rounds.find((r) => r.id === roundParam) ??
    rounds.find((r) => r.status === "upcoming") ??
    rounds[rounds.length - 1];

  /* ---- Auto-schedule suggestion ---- */
  const names = new Map(season.players.map((p) => [p.id, p.name]));
  const minGapDays = Math.min(60, Math.max(1, Number(gapParam) || 14));
  const unscheduled = rounds.filter((r) => r.status === "upcoming" && !r.date);
  const finaleRounds = unscheduled.filter((r) => r.label.toLowerCase().includes("finale"));
  const slots = [
    ...unscheduled
      .filter((r) => !finaleRounds.includes(r))
      .map((r) => ({ label: r.label, roundIds: [r.id] })),
    ...(finaleRounds.length > 0
      ? [
          {
            label: finaleRounds.length === 1 ? finaleRounds[0].label : "Finale (both rounds)",
            roundIds: finaleRounds.map((r) => r.id),
          },
        ]
      : []),
  ];
  const activeIds = new Set(activePlayers.map((p) => p.id));
  const freeByDate = new Map<string, string[]>();
  for (const f of season.freeDates) {
    if (!activeIds.has(f.playerId)) continue;
    const list = freeByDate.get(f.date) ?? [];
    list.push(f.playerId);
    freeByDate.set(f.date, list);
  }
  const fixedDates = rounds.map((r) => r.date).filter((d): d is string => d !== null);
  const today = new Date().toISOString().slice(0, 10);
  const suggestion = suggestSchedule({
    slots,
    freeByDate,
    playerIds: activePlayers.map((p) => p.id),
    windowStart: today > SEASON_WINDOW.start ? today : SEASON_WINDOW.start,
    windowEnd: SEASON_WINDOW.end,
    minGapDays,
    notBefore: fixedDates.length > 0 ? [...fixedDates].sort().at(-1) : null,
  });

  return (
    <>
      {/* ------------------------------ Scores ------------------------------ */}
      <section className="admin-section">
        <h2 className="page-title">Enter scores</h2>
        <div className="inline-actions" style={{ marginBottom: 12 }}>
          {rounds.map((r) => (
            <Link
              key={r.id}
              href={`/admin?round=${r.id}`}
              className={`chip ${selectedRound?.id === r.id ? "played" : "upcoming"}`}
            >
              {r.label}
            </Link>
          ))}
        </div>

        {selectedRound && (
          <form action={saveScores} className="card">
            <div className="card-head">
              <h3>{selectedRound.label}</h3>
              <span className={`chip ${selectedRound.status}`}>
                {selectedRound.status === "played" ? "Played" : "Upcoming"}
              </span>
            </div>
            <p className="sub" style={{ marginBottom: 12 }}>
              Gross strokes per player, from cards blobbed at par + 4 per hole (pick up, write
              it down, move on). Tick “out” for a no-show — they get the worst net of the round
              (or type a net in the box to override). Leave both empty to skip a player.
            </p>
            <input type="hidden" name="roundId" value={selectedRound.id} />
            <div className="score-grid">
              <span className="head">Player</span>
              <span className="head" style={{ textAlign: "center" }}>
                Gross
              </span>
              <span className="head" style={{ textAlign: "center" }}>
                Out
              </span>
              {activePlayers.map((p) => {
                const existing = selectedRound.scores.find((s) => s.playerId === p.id);
                return (
                  <RowInputs
                    key={p.id}
                    playerId={p.id}
                    name={p.name}
                    cap={p.startingHandicap}
                    gross={existing?.gross ?? null}
                    absent={existing?.absent ?? false}
                    overrideNet={existing?.overrideNet ?? null}
                  />
                );
              })}
            </div>
            <div className="inline-actions" style={{ marginTop: 16 }}>
              <SubmitButton>Save scores</SubmitButton>
            </div>
          </form>
        )}

        {selectedRound?.status === "played" && (
          <form action={reopenRound}>
            <input type="hidden" name="id" value={selectedRound.id} />
            <ConfirmSubmit
              message="Mark this round as not played? Its scores are kept but ignored until saved again."
              className="btn secondary small"
            >
              Reopen round
            </ConfirmSubmit>
          </form>
        )}
      </section>


      {/* --------------------------- Auto-schedule --------------------------- */}
      <section className="admin-section">
        <h2 className="page-title">Auto-schedule</h2>
        {slots.length === 0 ? (
          <p className="footnote">Every round already has a date. Nothing to schedule.</p>
        ) : season.freeDates.length === 0 ? (
          <p className="footnote">
            No availability submitted yet — get everyone tapping their free dates on the Dates tab,
            then come back here.
          </p>
        ) : (
          <>
            <form method="get" action="/admin" className="gap-bar">
              <label htmlFor="gap">Min days between rounds</label>
              <input id="gap" name="gap" type="number" defaultValue={minGapDays} min={1} max={60} />
              <SubmitButton className="btn secondary small">Recalculate</SubmitButton>
            </form>
            <div className="dates-list">
              {suggestion.slots.map((slot) => {
                const missing = slot.missingPlayerIds.map((id) => names.get(id) ?? "?");
                return (
                  <div className="date-row" key={slot.label}>
                    <div className="date-main">
                      <span className="date-label">
                        {slot.label} — {formatWhen(slot.date, null)}
                      </span>
                      <span
                        className={`count-badge${missing.length === 0 ? " best" : ""}`}
                      >
                        {slot.freePlayerIds.length}/{activePlayers.length}
                      </span>
                    </div>
                    <div className="who-list">
                      {missing.length === 0 ? "Full house" : `Missing: ${missing.join(" · ")}`}
                    </div>
                  </div>
                );
              })}
            </div>
            {suggestion.unplaced.length > 0 && (
              <p className="footnote" style={{ marginBottom: 12 }}>
                Couldn&apos;t place: {suggestion.unplaced.map((u) => u.label).join(", ")} — needs
                more shared free dates (or a smaller gap).
              </p>
            )}
            {suggestion.slots.length > 0 && (
              <form action={applySchedule}>
                {suggestion.slots.flatMap((slot) =>
                  slot.roundIds.map((rid) => (
                    <input key={rid} type="hidden" name={`date_${rid}`} value={slot.date} />
                  ))
                )}
                <SubmitButton>Apply schedule</SubmitButton>
              </form>
            )}
            <p className="footnote" style={{ marginTop: 12 }}>
              Applying sets each round&apos;s date (tee times are set per round below). You can
              re-run and re-apply any time as availability changes.
            </p>
          </>
        )}
      </section>

      {/* ------------------------------ Rounds ------------------------------ */}
      <section className="admin-section">
        <h2 className="page-title">Rounds</h2>
        {rounds.map((r) => (
          <form action={updateRound} className="card" key={r.id}>
            <input type="hidden" name="id" value={r.id} />
            <div className="field">
              <label>Name</label>
              <input name="label" defaultValue={r.label} required />
            </div>
            <div className="field">
              <label>Course</label>
              <input name="course" defaultValue={r.course} placeholder="TBC" />
            </div>
            <div className="field">
              <label>Course picked by</label>
              <select name="chooserId" defaultValue={r.chooserId ?? ""}>
                <option value="">—</option>
                {activePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input name="date" type="date" defaultValue={r.date ?? ""} />
            </div>
            <div className="field">
              <label>Tee time</label>
              <input name="teeTime" type="time" defaultValue={r.teeTime ?? ""} />
            </div>
            <div className="field">
              <label>Par</label>
              <input name="par" type="number" inputMode="numeric" defaultValue={r.par} />
            </div>
            <div className="inline-actions">
              <SubmitButton className="btn small">Save</SubmitButton>
            </div>
          </form>
        ))}
        <DeleteRoundForms rounds={rounds} />

        <hr className="divider" />
        <form action={createRound} className="card">
          <h3>Add a round</h3>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Name</label>
            <input name="label" placeholder="e.g. April decider" required />
          </div>
          <div className="field">
            <label>Course</label>
            <input name="course" placeholder="TBC" />
          </div>
          <div className="field">
            <label>Course picked by</label>
            <select name="chooserId" defaultValue="">
              <option value="">—</option>
              {activePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input name="date" type="date" />
          </div>
          <div className="field">
            <label>Tee time</label>
            <input name="teeTime" type="time" />
          </div>
          <div className="field">
            <label>Par</label>
            <input name="par" type="number" inputMode="numeric" defaultValue={72} />
          </div>
          <SubmitButton className="btn small">Add round</SubmitButton>
        </form>
      </section>

      {/* ------------------------------ Players ----------------------------- */}
      <section className="admin-section">
        <h2 className="page-title">Players</h2>
        <p className="sub" style={{ marginBottom: 12 }}>
          “Cap” is the starting handicap — in-season docks and bumps are worked out automatically
          from results. Untick “active” to hide someone from the table.
        </p>
        {season.players.map((p) => (
          <form action={updatePlayer} className="card" key={p.id}>
            <input type="hidden" name="id" value={p.id} />
            <div className="field">
              <label>Name</label>
              <input name="name" defaultValue={p.name} required />
            </div>
            <div className="field">
              <label>Starting cap</label>
              <input
                name="cap"
                type="number"
                inputMode="numeric"
                defaultValue={p.startingHandicap ?? ""}
                placeholder="TBC"
              />
            </div>
            <label className="toggle-line">
              <input type="checkbox" name="active" defaultChecked={p.active} /> Active
            </label>
            <div className="inline-actions">
              <SubmitButton className="btn small">Save</SubmitButton>
            </div>
          </form>
        ))}

        <hr className="divider" />
        <form action={addPlayer} className="card">
          <h3>Add a player</h3>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Name</label>
            <input name="name" required />
          </div>
          <div className="field">
            <label>Starting cap</label>
            <input name="cap" type="number" inputMode="numeric" placeholder="TBC" />
          </div>
          <SubmitButton className="btn small">Add player</SubmitButton>
        </form>
      </section>

      <form action={logout}>
        <SubmitButton className="btn secondary small">Log out</SubmitButton>
      </form>
    </>
  );
}

function RowInputs({
  playerId,
  name,
  cap,
  gross,
  absent,
  overrideNet,
}: {
  playerId: string;
  name: string;
  cap: number | null;
  gross: number | null;
  absent: boolean;
  overrideNet: number | null;
}) {
  return (
    <>
      <input type="hidden" name="playerIds" value={playerId} />
      <div className="player-name-cell">
        {name}
        <span className="capnote">{cap == null ? "cap TBC — set it before scoring" : ""}</span>
      </div>
      <div>
        <input
          type="number"
          inputMode="numeric"
          name={`gross_${playerId}`}
          defaultValue={gross ?? ""}
          placeholder="—"
          min={40}
          max={200}
        />
        {absent && (
          <input
            type="number"
            inputMode="numeric"
            name={`override_${playerId}`}
            defaultValue={overrideNet ?? ""}
            placeholder="net override"
            style={{ marginTop: 6 }}
          />
        )}
      </div>
      <div className="absent-cell">
        <input type="checkbox" name={`absent_${playerId}`} defaultChecked={absent} />
      </div>
    </>
  );
}

function DeleteRoundForms({
  rounds,
}: {
  rounds: Array<{ id: string; label: string }>;
}) {
  return (
    <details>
      <summary className="muted" style={{ cursor: "pointer", fontSize: "0.85rem" }}>
        Delete a round…
      </summary>
      <div className="inline-actions" style={{ marginTop: 10 }}>
        {rounds.map((r) => (
          <form action={deleteRound} key={r.id}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmSubmit message={`Delete "${r.label}" and its scores? This can't be undone.`}>
              🗑 {r.label}
            </ConfirmSubmit>
          </form>
        ))}
      </div>
    </details>
  );
}
