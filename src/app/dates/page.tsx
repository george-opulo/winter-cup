import { getStore } from "@/lib/store";
import { AvailabilityCalendar } from "./AvailabilityCalendar";

export const dynamic = "force-dynamic";

export default async function DatesPage() {
  const season = await getStore().loadSeason();
  const players = season.players
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <>
      <h2 className="page-title">Your free dates</h2>
      <p className="footnote" style={{ marginBottom: 16 }}>
        Pick your name, then tap every day you could play, October through March.
        The number under a day is how many of the {players.length} are free.
        The auto-scheduler uses this to fix the remaining rounds.
      </p>
      <AvailabilityCalendar players={players} freeDates={season.freeDates} />
    </>
  );
}
