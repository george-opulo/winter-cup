import { computeSeason } from "@/lib/engine";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const season = await getStore().loadSeason();
  const { standings } = computeSeason(season);

  return (
    <>
      <div className="board">
        {standings.map((s) => (
          <div key={s.player.id} className={`row${s.position === 1 ? " leader" : ""}`}>
            <div className="pos">
              {s.position === 0 ? "—" : String(s.position).padStart(2, "0")}
            </div>
            <div className="who">
              <div className="name">{s.player.name}</div>
              <div className="meta">
                Cap {s.currentCap ?? "TBC"} · Played {s.played}
                {s.absences > 0 && ` (+${s.absences} out)`} · {s.wins}W {s.losses}L
              </div>
            </div>
            <div className="total">
              {s.played + s.absences === 0 ? "—" : s.total}
              <span className="unit">net</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
