import { computeSeason } from "@/lib/engine";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const season = await getStore().loadSeason();
  const { results, standings, capEvents } = computeSeason(season);
  const names = new Map(season.players.map((p) => [p.id, p.name]));

  let bestRound: { player: string; round: string; net: number } | null = null;
  let biggestMargin: { player: string; round: string; margin: number } | null = null;
  for (const r of results) {
    const played = r.entries.filter((e) => !e.absent);
    for (const e of played) {
      if (!bestRound || e.net < bestRound.net) {
        bestRound = { player: names.get(e.playerId) ?? "?", round: r.round.label, net: e.net };
      }
    }
    if (r.margin != null && r.winners.length === 1) {
      if (!biggestMargin || r.margin > biggestMargin.margin) {
        biggestMargin = {
          player: names.get(r.winners[0]) ?? "?",
          round: r.round.label,
          margin: r.margin,
        };
      }
    }
  }

  const mostWins = [...standings].sort((a, b) => b.wins - a.wins)[0];
  const mostLosses = [...standings].sort((a, b) => b.losses - a.losses)[0];

  return (
    <>
      <h2 className="page-title">Records</h2>
      {results.length === 0 ? (
        <p className="muted">Nothing yet — records appear once the first round is in.</p>
      ) : (
        <div className="records">
          {bestRound && (
            <div className="record-card">
              <div className="label">Best net round</div>
              <div className="value">{bestRound.net}</div>
              <div className="detail">
                {bestRound.player} · {bestRound.round}
              </div>
            </div>
          )}
          {biggestMargin && (
            <div className="record-card">
              <div className="label">Biggest win</div>
              <div className="value">+{biggestMargin.margin}</div>
              <div className="detail">
                {biggestMargin.player} · {biggestMargin.round}
              </div>
            </div>
          )}
          {mostWins && mostWins.wins > 0 && (
            <div className="record-card">
              <div className="label">Most round wins</div>
              <div className="value">{mostWins.wins}</div>
              <div className="detail">{mostWins.player.name}</div>
            </div>
          )}
          {mostLosses && mostLosses.losses > 0 && (
            <div className="record-card">
              <div className="label">Most wooden spoons</div>
              <div className="value">{mostLosses.losses}</div>
              <div className="detail">{mostLosses.player.name}</div>
            </div>
          )}
        </div>
      )}

      <h2 className="page-title">Handicap journeys</h2>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Player</th>
              <th className="num">Start</th>
              <th className="num">Now</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const events = capEvents.filter((e) => e.playerId === s.player.id);
              return (
                <tr key={s.player.id}>
                  <td>{s.player.name}</td>
                  <td className="num">{s.player.startingHandicap ?? "TBC"}</td>
                  <td className="num">
                    <strong>{s.currentCap ?? "TBC"}</strong>
                  </td>
                  <td style={{ fontSize: "0.78rem" }}>
                    {events.length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      events.map((e, i) => (
                        <span key={i} className={e.change < 0 ? "cap-down" : "cap-up"}>
                          {e.roundLabel.slice(0, 3)} {e.change < 0 ? "↓" : "↑"}
                          {i < events.length - 1 ? " · " : ""}
                        </span>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: "0.8rem" }}>
        ↓ docked 1 for winning the round · ↑ up 1 for losing it
      </p>
    </>
  );
}
