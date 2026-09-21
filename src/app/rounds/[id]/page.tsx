import Link from "next/link";
import { notFound } from "next/navigation";
import { computeSeason } from "@/lib/engine";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const season = await getStore().loadSeason();
  const { results } = computeSeason(season);
  const result = results.find((r) => r.round.id === id);
  if (!result) notFound();

  const names = new Map(season.players.map((p) => [p.id, p.name]));
  const chooser = result.round.chooserId ? names.get(result.round.chooserId) : null;

  return (
    <>
      <h2 className="page-title">
        {result.round.label}
        {result.round.course ? ` · ${result.round.course}` : ""}
      </h2>
      {chooser && <p className="sub muted">Course picked by {chooser}</p>}
      <div className="card">
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
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Winning margin: {result.margin} stroke{result.margin === 1 ? "" : "s"}.
          {" "}No-shows score the worst net of the round.
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
