import type { RoundResult, Standing } from "./engine";
import { fmtToPar } from "./og";

/** Surname, uppercased — punchier on the card. */
function surname(names: Map<string, string>, id: string): string {
  const full = names.get(id) ?? "?";
  return (full.split(" ").pop() ?? full).toUpperCase();
}

/** "The Cut Line": short auto-written lines for the share card. */
export function cutLines(
  result: RoundResult,
  standings: Standing[],
  names: Map<string, string>
): string[] {
  const n = (id: string) => surname(names, id);
  const lines: string[] = [];
  const { winners, losers, margin } = result;

  if (winners.length > 1) {
    lines.push(`${winners.map(n).join(" & ")} share the win`);
  } else if (winners.length === 1) {
    const w = n(winners[0]);
    if (margin != null && margin >= 6) lines.push(`${w} wins by ${margin} — a procession`);
    else if (margin === 1) lines.push(`${w} wins by a single stroke`);
    else if (margin != null && margin > 0) lines.push(`${w} wins by ${margin}`);
    else lines.push(`${w} wins the round`);
  }

  if (losers.length === 1) {
    const id = losers[0];
    const spoons = standings.find((s) => s.player.id === id)?.losses ?? 1;
    lines.push(
      `${n(id)} takes the wooden spoon${spoons > 1 ? ` — no. ${spoons} this season` : ""}`
    );
  } else if (losers.length > 1) {
    lines.push(`${losers.map(n).join(" & ")} share the wooden spoon`);
  }

  const absent = result.entries.filter((e) => e.absent);
  if (absent.length > 0) {
    lines.push(`${absent.map((e) => n(e.playerId)).join(" & ")} didn't show`);
  }

  const leader = standings.find((s) => s.position === 1);
  if (leader) {
    lines.push(`${n(leader.player.id)} leads the cup at ${fmtToPar(leader.toPar)}`);
  }

  return lines.slice(0, 3).map((l) => l.toUpperCase());
}
