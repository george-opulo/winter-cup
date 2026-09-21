import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { computeSeason } from "@/lib/engine";
import { getStore } from "@/lib/store";
import { Planner } from "./Planner";

export const dynamic = "force-dynamic";

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const season = await getStore().loadSeason();
  const round = season.rounds.find((r) => r.id === id);
  if (!round) notFound();

  const names = new Map(season.players.map((p) => [p.id, p.name]));
  const { results } = computeSeason(season);
  const result = results.find((r) => r.round.id === id);

  /* Played round with computed results → the scorecard. */
  if (result) {
    const chooser = round.chooserId ? names.get(round.chooserId) : null;
    return (
      <>
        <h2 className="page-title">
          {round.label}
          {round.course ? ` · ${round.course}` : ""}
        </h2>
        {chooser && <p className="footnote">Course picked by {chooser}</p>}
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th className="num">Gross</th>
                <th className="num">Cap</th>
                <th className="num">Net</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.entries.map((e) => (
                <tr key={e.playerId}>
                  <td>{names.get(e.playerId)}</td>
                  <td className="num">{e.absent ? "–" : e.gross}</td>
                  <td className="num">{e.capUsed ?? "–"}</td>
                  <td className="num">
                    <strong>{e.net}</strong>
                  </td>
                  <td>
                    {e.isWinner && <span className="chip win">Win ↓1</span>}
                    {e.isLoser && <span className="chip loss">Loss ↑1</span>}
                    {e.absent && <span className="chip absent">No show</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.margin != null && (
          <p className="footnote">
            Winning margin: {result.margin} stroke{result.margin === 1 ? "" : "s"}.{" "}
            No-shows score the worst net of the round.
          </p>
        )}
        <p>
          <Link href="/rounds" className="btn secondary small">
            ← All rounds
          </Link>
        </p>
      </>
    );
  }

  /* Upcoming round → the date-finder. */
  const activePlayers = season.players
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <>
      <h2 className="page-title">
        {round.label}
        {round.course ? ` · ${round.course}` : " · Find a date"}
      </h2>
      <Planner
        round={{
          id: round.id,
          label: round.label,
          course: round.course,
          date: round.date,
          chooserName: round.chooserId ? (names.get(round.chooserId) ?? null) : null,
          dateOptions: round.dateOptions,
        }}
        players={activePlayers}
        isAdmin={await isAdmin()}
      />
      <p style={{ marginTop: 20 }}>
        <Link href="/rounds" className="btn secondary small">
          ← All rounds
        </Link>
      </p>
    </>
  );
}
