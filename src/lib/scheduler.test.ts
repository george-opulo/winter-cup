import { describe, expect, it } from "vitest";
import { suggestSchedule } from "./scheduler";

const PLAYERS = ["a", "b", "c", "d", "e", "f", "g"];

function free(dates: Record<string, string[]>): Map<string, string[]> {
  return new Map(Object.entries(dates));
}

const BASE = {
  playerIds: PLAYERS,
  windowStart: "2026-10-01",
  windowEnd: "2027-03-31",
  minGapDays: 14,
};

describe("suggestSchedule", () => {
  it("maximises attendance while keeping rounds in order and spaced", () => {
    const result = suggestSchedule({
      ...BASE,
      slots: [
        { label: "Round 2", roundIds: ["r2"] },
        { label: "Round 3", roundIds: ["r3"] },
      ],
      freeByDate: free({
        "2026-10-10": ["a", "b", "c", "d", "e", "f", "g"],
        "2026-10-17": ["a", "b", "c"], // best pairing skips this
        "2026-11-07": ["a", "b", "c", "d", "e", "f"],
      }),
    });
    expect(result.unplaced).toHaveLength(0);
    expect(result.slots.map((s) => s.date)).toEqual(["2026-10-10", "2026-11-07"]);
    expect(result.slots[0].freePlayerIds).toHaveLength(7);
    expect(result.slots[1].missingPlayerIds).toEqual(["g"]);
  });

  it("enforces the minimum gap even at an attendance cost", () => {
    const result = suggestSchedule({
      ...BASE,
      slots: [
        { label: "Round 2", roundIds: ["r2"] },
        { label: "Round 3", roundIds: ["r3"] },
      ],
      freeByDate: free({
        "2026-10-10": ["a", "b", "c", "d", "e", "f", "g"],
        "2026-10-17": ["a", "b", "c", "d", "e", "f", "g"], // only 7 days after 10-10
        "2026-12-05": ["a", "b"],
      }),
    });
    // 10-10 + 10-17 (14 attendance) would be best but breaks the gap rule,
    // so one of them pairs with 12-05; the wider spread wins the tie.
    expect(result.slots.map((s) => s.date)).toEqual(["2026-10-10", "2026-12-05"]);
  });

  it("respects the notBefore anchor", () => {
    const result = suggestSchedule({
      ...BASE,
      notBefore: "2026-10-01",
      slots: [{ label: "Round 2", roundIds: ["r2"] }],
      freeByDate: free({
        "2026-10-10": PLAYERS, // only 9 days after the anchor
        "2026-10-24": ["a", "b", "c"],
      }),
    });
    expect(result.slots.map((s) => s.date)).toEqual(["2026-10-24"]);
  });

  it("reports unplaceable slots when availability runs out", () => {
    const result = suggestSchedule({
      ...BASE,
      slots: [
        { label: "Round 2", roundIds: ["r2"] },
        { label: "Round 3", roundIds: ["r3"] },
        { label: "Finale", roundIds: ["r7", "r8"] },
      ],
      freeByDate: free({
        "2026-10-10": ["a", "b", "c"],
        "2026-11-07": ["a", "b"],
      }),
    });
    expect(result.slots).toHaveLength(2);
    expect(result.unplaced.map((s) => s.label)).toEqual(["Finale"]);
  });

  it("prefers the more even spread on equal attendance", () => {
    const result = suggestSchedule({
      ...BASE,
      slots: [
        { label: "Round 2", roundIds: ["r2"] },
        { label: "Round 3", roundIds: ["r3"] },
        { label: "Round 4", roundIds: ["r4"] },
      ],
      freeByDate: free({
        "2026-10-10": PLAYERS,
        "2026-10-24": PLAYERS,
        "2026-11-07": PLAYERS,
        "2026-12-19": PLAYERS,
      }),
    });
    // All choices give 21 attendance; the even pick keeps the biggest min-gap.
    expect(result.slots.map((s) => s.date)).toEqual(["2026-10-10", "2026-11-07", "2026-12-19"]);
  });
});
