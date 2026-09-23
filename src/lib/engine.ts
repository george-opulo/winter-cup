import type { Player, Round, Season } from "./types";

/**
 * Winter Cup rules
 * ----------------
 * - Medal play. Net = gross − handicap. Lowest net wins the round, highest
 *   net loses it. Season standings are cumulative net; lowest total wins.
 * - The round winner's handicap is docked 1; the loser's goes up 1. Ties for
 *   first/last mean everyone tied gets docked/bumped. If the whole field ties,
 *   nothing changes.
 * - A player who misses a round gets a penalty net score equal to the worst
 *   net of that round (admin can override the number per case). Absentees
 *   never win or lose the round, and their handicap is untouched.
 * - The guillotine: shoot GUILLOTINE_TRIGGER or more under your cap (net vs
 *   the round's par) and your cap is cut to exactly what you played to
 *   (gross − par). The triggering round stands as scored off the old cap —
 *   winter golf pays it back — and the winner's −1 never stacks on top.
 *
 * Everything below is derived deterministically from starting handicaps plus
 * the chronological gross scores, so editing any past round ripples through
 * handicaps and totals automatically.
 */

/** Strokes under your cap (relative to par) that trigger the cut-to-match. */
export const GUILLOTINE_TRIGGER = 3;

export interface ResultEntry {
  playerId: string;
  gross: number | null;
  capUsed: number | null;
  net: number;
  absent: boolean;
  isWinner: boolean;
  isLoser: boolean;
  /** Cap cut to match after playing 3+ under it. */
  guillotined: boolean;
  /** -1, 0, +1, or the (larger, negative) guillotine cut. */
  capChange: number;
  capAfter: number | null;
}

export interface RoundResult {
  round: Round;
  /** Sorted best net first; absentees at the end. */
  entries: ResultEntry[];
  winners: string[];
  losers: string[];
  /** Gap in strokes between winner and runner-up (null if fewer than 2 played). */
  margin: number | null;
}

export interface Standing {
  player: Player;
  /** Cumulative net including penalty scores. */
  total: number;
  played: number;
  absences: number;
  wins: number;
  losses: number;
  bestNet: number | null;
  currentCap: number | null;
  /** 1-based; ties share a position. 0 = unranked (no rounds yet). */
  position: number;
}

export interface CapEvent {
  roundId: string;
  roundLabel: string;
  playerId: string;
  change: number;
  capAfter: number;
}

export interface SeasonComputed {
  results: RoundResult[];
  standings: Standing[];
  capEvents: CapEvent[];
  currentCaps: Map<string, number>;
}

interface Tally {
  total: number;
  played: number;
  absences: number;
  wins: number;
  losses: number;
  bestNet: number | null;
}

export function computeSeason(season: Season): SeasonComputed {
  const caps = new Map<string, number>();
  for (const p of season.players) {
    if (p.startingHandicap != null) caps.set(p.id, p.startingHandicap);
  }

  const tallies = new Map<string, Tally>();
  const tally = (id: string): Tally => {
    let t = tallies.get(id);
    if (!t) {
      t = { total: 0, played: 0, absences: 0, wins: 0, losses: 0, bestNet: null };
      tallies.set(id, t);
    }
    return t;
  };

  const results: RoundResult[] = [];
  const capEvents: CapEvent[] = [];
  const rounds = [...season.rounds].sort((a, b) => a.seq - b.seq);

  for (const round of rounds) {
    if (round.status !== "played") continue;

    const participants = round.scores.filter(
      (s) => !s.absent && s.gross != null && caps.has(s.playerId)
    );
    if (participants.length === 0) continue;

    const nets = participants.map((s) => ({
      entry: s,
      net: s.gross! - caps.get(s.playerId)!,
    }));
    const minNet = Math.min(...nets.map((n) => n.net));
    const maxNet = Math.max(...nets.map((n) => n.net));
    const allTied = minNet === maxNet;
    const winners = allTied ? [] : nets.filter((n) => n.net === minNet).map((n) => n.entry.playerId);
    const losers = allTied ? [] : nets.filter((n) => n.net === maxNet).map((n) => n.entry.playerId);

    const entries: ResultEntry[] = [];

    const par = round.par ?? 72;
    for (const { entry, net } of nets) {
      const id = entry.playerId;
      const isWinner = winners.includes(id);
      const isLoser = losers.includes(id);
      const capUsed = caps.get(id)!;
      const guillotined = net <= par - GUILLOTINE_TRIGGER;
      // Guillotine: cut to what they played to (gross − par); it always
      // outcuts the winner's −1, so the two never stack.
      const capChange = guillotined
        ? entry.gross! - par - capUsed
        : (isWinner ? -1 : 0) + (isLoser ? 1 : 0);
      entries.push({
        playerId: id,
        gross: entry.gross,
        capUsed,
        net,
        absent: false,
        isWinner,
        isLoser,
        guillotined,
        capChange,
        capAfter: null, // filled in after adjustments below
      });
      const t = tally(id);
      t.total += net;
      t.played += 1;
      if (isWinner) t.wins += 1;
      if (isLoser) t.losses += 1;
      if (t.bestNet == null || net < t.bestNet) t.bestNet = net;
    }

    for (const entry of round.scores) {
      if (!entry.absent) continue;
      const net = entry.overrideNet ?? maxNet;
      entries.push({
        playerId: entry.playerId,
        gross: null,
        capUsed: caps.get(entry.playerId) ?? null,
        net,
        absent: true,
        isWinner: false,
        isLoser: false,
        guillotined: false,
        capChange: 0,
        capAfter: caps.get(entry.playerId) ?? null,
      });
      const t = tally(entry.playerId);
      t.total += net;
      t.absences += 1;
    }

    for (const e of entries) {
      if (e.capChange !== 0) {
        const after = caps.get(e.playerId)! + e.capChange;
        caps.set(e.playerId, after);
        capEvents.push({
          roundId: round.id,
          roundLabel: round.label,
          playerId: e.playerId,
          change: e.capChange,
          capAfter: after,
        });
      }
      if (!e.absent) e.capAfter = caps.get(e.playerId)!;
    }

    entries.sort((a, b) => (a.absent !== b.absent ? (a.absent ? 1 : -1) : a.net - b.net));
    const playedNets = nets.map((n) => n.net).sort((a, b) => a - b);
    const margin = playedNets.length >= 2 ? playedNets[1] - playedNets[0] : null;
    results.push({ round, entries, winners, losers, margin });
  }

  const standings: Standing[] = season.players
    .filter((p) => p.active)
    .map((p) => {
      const t = tallies.get(p.id) ?? {
        total: 0,
        played: 0,
        absences: 0,
        wins: 0,
        losses: 0,
        bestNet: null,
      };
      return {
        player: p,
        total: t.total,
        played: t.played,
        absences: t.absences,
        wins: t.wins,
        losses: t.losses,
        bestNet: t.bestNet,
        currentCap: caps.get(p.id) ?? null,
        position: 0,
      };
    });

  const ranked = standings.filter((s) => s.played + s.absences > 0);
  const unranked = standings.filter((s) => s.played + s.absences === 0);
  ranked.sort((a, b) => a.total - b.total);
  unranked.sort((a, b) => (a.currentCap ?? Infinity) - (b.currentCap ?? Infinity));
  let pos = 0;
  let prevTotal: number | null = null;
  ranked.forEach((s, i) => {
    if (prevTotal === null || s.total !== prevTotal) pos = i + 1;
    prevTotal = s.total;
    s.position = pos;
  });

  return {
    results,
    standings: [...ranked, ...unranked],
    capEvents,
    currentCaps: caps,
  };
}
