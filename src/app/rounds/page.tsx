import Link from "next/link";
import { computeSeason } from "@/lib/engine";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default async function RoundsPage() {
  const season = await getStore().loadSeason();
  const { results } = computeSeason(season);
  const names = new Map(season.players.map((p) => [p.id, p.name]));
  const resultsByRound = new Map(results.map((r) => [r.round.id, r]));
  const playerCount = season.players.filter((p) => p.active).length;

  return (
    <>
      <h2 className="page-title">Fixtures &amp; results</h2>
      {season.rounds
        .sort((a, b) => a.seq - b.seq)
        .map((round) => {
          const result = resultsByRound.get(round.id);
          const chooser = round.chooserId ? names.get(round.chooserId) : null;
          const bits = [
            formatDate(round.date),
            round.course || null,
            chooser ? `${chooser}'s pick` : null,
          ].filter(Boolean);

          let scheduleLine: string | null = null;
          let scheduleHot = false;
          if (!result && !round.date) {
            if (round.dateOptions.length === 0) {
              scheduleLine = "No dates yet — find a date →";
            } else {
              scheduleHot = true;
              const best = Math.max(...round.dateOptions.map((d) => d.availablePlayerIds.length));
              scheduleLine = `${round.dateOptions.length} date${
                round.dateOptions.length === 1 ? "" : "s"
              } proposed · best ${best}/${playerCount} →`;
            }
          }

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
                {scheduleLine && (
                  <div className={`sub schedule-line${scheduleHot ? " hot" : ""}`}>
                    {scheduleLine}
                  </div>
                )}
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
