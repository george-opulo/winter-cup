import { computeSeason } from "@/lib/engine";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const season = await getStore().loadSeason();
  const { standings, results } = computeSeason(season);

  return (
    <>
      <div className="board">
        {standings.map((s) => (
          <div key={s.player.id} className={`row${s.position === 1 ? " leader" : ""}`}>
            <div className="pos">{s.position === 0 ? "–" : s.position}</div>
            <div className="who">
              <div className="name">
                {s.player.name}
                {s.position === 1 && " 🏆"}
              </div>
              <div className="meta">
                Cap {s.currentCap ?? "TBC"} · Played {s.played}
                {s.absences > 0 && ` (+${s.absences} missed)`} · {s.wins}W {s.losses}L
              </div>
            </div>
            <div className="total">
              {s.played + s.absences === 0 ? "–" : s.total}
              <span className="unit">net total</span>
            </div>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: "0.8rem", marginTop: 16 }}>
        {results.length === 0
          ? "No rounds played yet — the table shows starting handicaps. Lowest cumulative net wins the cup."
          : `After ${results.length} round${results.length === 1 ? "" : "s"}. Lowest cumulative net wins the cup.`}
      </p>
    </>
  );
}
