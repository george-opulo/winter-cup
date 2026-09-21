import Link from "next/link";
import { computeSeason } from "@/lib/engine";
import { formatWhen } from "@/lib/format";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RoundsPage() {
  const season = await getStore().loadSeason();
  const { results } = computeSeason(season);
  const names = new Map(season.players.map((p) => [p.id, p.name]));
  const resultsByRound = new Map(results.map((r) => [r.round.id, r]));

  return (
    <>
      <h2 className="page-title">Fixtures &amp; results</h2>
      {season.rounds
        .sort((a, b) => a.seq - b.seq)
        .map((round) => {
          const result = resultsByRound.get(round.id);
          const chooser = round.chooserId ? names.get(round.chooserId) : null;
          const bits = [
            formatWhen(round.date, round.teeTime),
            round.course || null,
            chooser ? `${chooser}'s pick` : null,
          ].filter(Boolean);

          const scheduleLine =
            !result && !round.date ? "Awaiting schedule — add your free dates" : null;

          return (
            <Link key={round.id} href={`/rounds/${round.id}`}>
              <div className="card">
                <div className="card-head">
                  <h3>{round.label}</h3>
                  <span className={`chip ${round.status}`}>
                    {round.status === "played" ? "Played" : round.date ? "Confirmed" : "Upcoming"}
                  </span>
                </div>
                {bits.length > 0 && <div className="sub">{bits.join(" · ")}</div>}
                {scheduleLine && <div className="sub schedule-line">{scheduleLine}</div>}
                {result && (
                  <div className="podium-line">
                    {result.entries
                      .filter((e) => !e.absent)
                      .slice(0, 3)
                      .map((e, i) => (
                        <span key={e.playerId} style={{ marginRight: 12 }}>
                          <span className="p">{i + 1}</span> {names.get(e.playerId)} ({e.net})
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
    </>
  );
}
