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

  return (
    <>
      <h2 className="page-title">Fixtures &amp; results</h2>
      {season.rounds
        .sort((a, b) => a.seq - b.seq)
        .map((round) => {
          const result = resultsByRound.get(round.id);
          const bits = [
            formatDate(round.date),
            round.course || "Course TBC",
            round.chooserId ? `${names.get(round.chooserId) ?? "?"}'s pick` : null,
          ].filter(Boolean);
          const card = (
            <div className="card" key={round.id}>
              <div className="card-head">
                <h3>{round.label}</h3>
                <span className={`chip ${round.status}`}>
                  {round.status === "played" ? "Played" : "Upcoming"}
                </span>
              </div>
              <div className="sub">{bits.join(" · ")}</div>
              {result && (
                <div className="sub" style={{ marginTop: 8 }}>
                  {result.entries
                    .filter((e) => !e.absent)
                    .slice(0, 3)
                    .map((e, i) => `${["🥇", "🥈", "🥉"][i]} ${names.get(e.playerId)} (${e.net})`)
                    .join("  ")}
                </div>
              )}
            </div>
          );
          return result ? (
            <Link key={round.id} href={`/rounds/${round.id}`}>
              {card}
            </Link>
          ) : (
            card
          );
        })}
    </>
  );
}
