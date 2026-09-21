import Link from "next/link";
import { notFound } from "next/navigation";
import { computeSeason } from "@/lib/engine";
import { formatWhen } from "@/lib/format";
import { getStore } from "@/lib/store";

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
  const chooser = round.chooserId ? names.get(round.chooserId) : null;

  /* Played round with computed results → the scorecard. */
  if (result) {
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

  /* Upcoming round → the fixture. */
  const freeOnDate = round.date
    ? season.freeDates.filter((f) => f.date === round.date).map((f) => names.get(f.playerId) ?? "?")
    : [];

  return (
    <>
      <h2 className="page-title">{round.label}</h2>
      {round.date ? (
        <div className="confirmed-banner">
          {formatWhen(round.date, round.teeTime)}
          {round.course ? ` · ${round.course}` : ""}
        </div>
      ) : (
        <div className="card">
          <h3>Not scheduled yet</h3>
          <p className="sub" style={{ marginTop: 8 }}>
            Add your free dates and the schedule will fall out of everyone&apos;s availability.
          </p>
          <div className="inline-actions" style={{ marginTop: 14 }}>
            <Link href="/dates" className="btn small">
              Add my dates
            </Link>
          </div>
        </div>
      )}
      <p className="footnote" style={{ marginTop: 14 }}>
        {chooser ? `${chooser}'s round — they pick the course.` : "No one assigned yet — spin the wheel."}
        {round.date && freeOnDate.length > 0 && (
          <> Free that day: {freeOnDate.join(" · ")}.</>
        )}
      </p>
      <p style={{ marginTop: 20 }}>
        <Link href="/rounds" className="btn secondary small">
          ← All rounds
        </Link>
      </p>
    </>
  );
}
