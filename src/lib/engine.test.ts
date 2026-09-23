import { describe, expect, it } from "vitest";
import { computeSeason } from "./engine";
import type { Player, Round, Season } from "./types";

function player(id: string, cap: number | null): Player {
  return { id, name: id, startingHandicap: cap, active: true };
}

function round(
  id: string,
  seq: number,
  scores: Round["scores"],
  status: Round["status"] = "played",
  par = 72
): Round {
  return {
    id,
    seq,
    label: id,
    course: "",
    chooserId: null,
    date: null,
    teeTime: null,
    par,
    status,
    scores,
  };
}

function score(playerId: string, gross: number | null, absent = false, overrideNet: number | null = null) {
  return { playerId, gross, absent, overrideNet };
}

describe("computeSeason", () => {
  it("computes nets, winner and loser, and adjusts caps", () => {
    const season: Season = {
      freeDates: [],
      players: [player("a", 10), player("b", 20), player("c", 15)],
      rounds: [
        round("r1", 1, [score("a", 85), score("b", 99), score("c", 92)]),
      ],
    };
    const { results, standings, currentCaps } = computeSeason(season);
    const r = results[0];
    // nets: a 75, b 79, c 77
    expect(r.winners).toEqual(["a"]);
    expect(r.losers).toEqual(["b"]);
    expect(r.margin).toBe(2);
    expect(currentCaps.get("a")).toBe(9);
    expect(currentCaps.get("b")).toBe(21);
    expect(currentCaps.get("c")).toBe(15);
    expect(standings[0].player.id).toBe("a");
    expect(standings[0].total).toBe(75);
    expect(standings[0].position).toBe(1);
  });

  it("uses the updated cap in the next round", () => {
    const season: Season = {
      freeDates: [],
      players: [player("a", 10), player("b", 20)],
      rounds: [
        round("r1", 1, [score("a", 85), score("b", 99)]), // a wins -> cap 9, b cap 21
        round("r2", 2, [score("a", 85), score("b", 99)]),
      ],
    };
    const { results } = computeSeason(season);
    const r2 = results[1];
    const aEntry = r2.entries.find((e) => e.playerId === "a")!;
    expect(aEntry.capUsed).toBe(9);
    expect(aEntry.net).toBe(76);
  });

  it("ties for first and last both adjust; whole-field tie changes nothing", () => {
    const tied: Season = {
      freeDates: [],
      players: [player("a", 10), player("b", 12), player("c", 20)],
      rounds: [round("r1", 1, [score("a", 85), score("b", 87), score("c", 99)])],
    };
    const t = computeSeason(tied);
    expect(t.results[0].winners.sort()).toEqual(["a", "b"]); // both net 75
    expect(t.results[0].margin).toBe(0);
    expect(t.currentCaps.get("a")).toBe(9);
    expect(t.currentCaps.get("b")).toBe(11);
    expect(t.currentCaps.get("c")).toBe(21);

    const allSame: Season = {
      freeDates: [],
      players: [player("a", 10), player("b", 12)],
      rounds: [round("r1", 1, [score("a", 85), score("b", 87)])],
    };
    const s = computeSeason(allSame);
    expect(s.results[0].winners).toEqual([]);
    expect(s.results[0].losers).toEqual([]);
    expect(s.currentCaps.get("a")).toBe(10);
  });

  it("no-show gets the worst net of the round, no cap change, override wins", () => {
    const season: Season = {
      freeDates: [],
      players: [player("a", 10), player("b", 20), player("c", 15), player("d", 18)],
      rounds: [
        round("r1", 1, [
          score("a", 85), // net 75
          score("b", 99), // net 79 (worst)
          score("c", null, true), // penalty: 79
          score("d", null, true, 90), // override: 90
        ]),
      ],
    };
    const { results, standings, currentCaps } = computeSeason(season);
    const r = results[0];
    const cEntry = r.entries.find((e) => e.playerId === "c")!;
    const dEntry = r.entries.find((e) => e.playerId === "d")!;
    expect(cEntry.net).toBe(79);
    expect(cEntry.absent).toBe(true);
    expect(dEntry.net).toBe(90);
    // absentees don't lose the round even with the worst score
    expect(r.losers).toEqual(["b"]);
    expect(currentCaps.get("c")).toBe(15);
    expect(currentCaps.get("d")).toBe(18);
    const cStanding = standings.find((s) => s.player.id === "c")!;
    expect(cStanding.total).toBe(79);
    expect(cStanding.absences).toBe(1);
  });

  it("skips upcoming rounds and players without a cap", () => {
    const season: Season = {
      freeDates: [],
      players: [player("a", 10), player("b", 20), player("p", null)],
      rounds: [
        round("r1", 1, [score("a", 85), score("b", 99), score("p", 80)]),
        round("r2", 2, [score("a", 80)], "upcoming"),
      ],
    };
    const { results, standings } = computeSeason(season);
    expect(results).toHaveLength(1);
    // p has no cap so their gross is ignored
    expect(results[0].entries.find((e) => e.playerId === "p")).toBeUndefined();
    const pStanding = standings.find((s) => s.player.id === "p")!;
    expect(pStanding.position).toBe(0);
    expect(pStanding.currentCap).toBeNull();
  });

  it("shares positions on tied totals", () => {
    const season: Season = {
      freeDates: [],
      players: [player("a", 10), player("b", 12), player("c", 20)],
      rounds: [round("r1", 1, [score("a", 85), score("b", 87), score("c", 99)])],
    };
    const { standings } = computeSeason(season);
    expect(standings[0].position).toBe(1);
    expect(standings[1].position).toBe(1);
    expect(standings[2].position).toBe(3);
  });

});
