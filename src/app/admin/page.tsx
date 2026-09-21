import Link from "next/link";
import {
  addPlayer,
  createRound,
  deleteRound,
  logout,
  reopenRound,
  saveScores,
  updatePlayer,
  updateRound,
} from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { LoginForm } from "./LoginForm";
import { ConfirmSubmit, SubmitButton } from "./SubmitButton";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const { round: roundParam } = await searchParams;
  const season = await getStore().loadSeason();
  const rounds = [...season.rounds].sort((a, b) => a.seq - b.seq);
  const activePlayers = season.players.filter((p) => p.active);
  const selectedRound =
    rounds.find((r) => r.id === roundParam) ??
    rounds.find((r) => r.status === "upcoming") ??
    rounds[rounds.length - 1];

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
              Gross strokes per player. Tick “out” for a no-show — they get the worst net of the
              round (or type a net in the box to override). Leave both empty to skip a player.
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
