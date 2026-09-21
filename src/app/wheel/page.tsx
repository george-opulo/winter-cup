import { getStore } from "@/lib/store";
import { Wheel } from "./Wheel";

export const dynamic = "force-dynamic";

export default async function WheelPage() {
  const season = await getStore().loadSeason();
  const players = season.players
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      hasChosen: season.rounds.some((r) => r.chooserId === p.id),
    }));

  return (
    <>
      <h2 className="page-title">Who picks the course?</h2>
      <Wheel players={players} />
    </>
  );
}
