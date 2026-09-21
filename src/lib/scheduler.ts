/**
 * Auto-scheduler: given everyone's free dates, place the season's remaining
 * rounds on the calendar.
 *
 * - Slots are filled in round order, chronologically.
 * - Consecutive rounds are at least `minGapDays` apart, and everything lands
 *   after `notBefore` (the last already-fixed round) plus the gap.
 * - Objective: first schedule as many rounds as possible, then maximise total
 *   attendance, then prefer the most even spread (largest smallest-gap).
 *
 * Sizes are tiny (≤8 slots, ≤~200 candidate dates), so exact DP is cheap.
 */

export interface Slot {
  /** e.g. "Round 2", or "Finale" covering both finale rounds. */
  label: string;
  roundIds: string[];
}

export interface SlotSuggestion extends Slot {
  date: string;
  freePlayerIds: string[];
  missingPlayerIds: string[];
}

export interface ScheduleSuggestion {
  slots: SlotSuggestion[];
  /** Slots that could not be placed (not enough workable dates). */
  unplaced: Slot[];
}

/** The scheduling window everyone submits availability for. */
export const SEASON_WINDOW = { start: "2026-10-01", end: "2027-03-31" };

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

export function suggestSchedule(opts: {
  slots: Slot[];
  /** date -> ids of players free that day */
  freeByDate: Map<string, string[]>;
  playerIds: string[];
  windowStart: string;
  windowEnd: string;
  minGapDays: number;
  /** Last already-fixed round date; new dates start minGapDays after it. */
  notBefore?: string | null;
}): ScheduleSuggestion {
  const { slots, freeByDate, playerIds, windowStart, windowEnd, minGapDays, notBefore } = opts;

  const candidates = [...freeByDate.entries()]
    .filter(([date, free]) => {
      if (free.length === 0) return false;
      if (date < windowStart || date > windowEnd) return false;
      if (notBefore && daysBetween(notBefore, date) < minGapDays) return false;
      return true;
    })
    .map(([date, free]) => ({ date, free }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const n = slots.length;
  const m = candidates.length;
  if (n === 0 || m === 0) {
    return { slots: [], unplaced: [...slots] };
  }

  // dp[i][j] = best result placing slots 0..i with slot i on candidate j.
  // Value compared by (attendance sum, smallest gap in the chain).
  interface Cell {
    sum: number;
    minGap: number;
    prev: number; // candidate index of slot i-1, -1 for none
  }
  const dp: Array<Array<Cell | null>> = Array.from({ length: n }, () =>
    Array<Cell | null>(m).fill(null)
  );

  for (let j = 0; j < m; j++) {
    dp[0][j] = { sum: candidates[j].free.length, minGap: Infinity, prev: -1 };
  }

  const better = (a: Cell, b: Cell | null): boolean =>
    b === null || a.sum > b.sum || (a.sum === b.sum && a.minGap > b.minGap);

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < j; k++) {
        const prevCell = dp[i - 1][k];
        if (!prevCell) continue;
        const gap = daysBetween(candidates[k].date, candidates[j].date);
        if (gap < minGapDays) continue;
        const cell: Cell = {
          sum: prevCell.sum + candidates[j].free.length,
          minGap: Math.min(prevCell.minGap, gap),
          prev: k,
        };
        if (better(cell, dp[i][j])) dp[i][j] = cell;
      }
    }
  }

  // Deepest feasible slot count, then best end cell.
  let placed = 0;
  let endJ = -1;
  for (let i = n - 1; i >= 0; i--) {
    let best: Cell | null = null;
    let bestJ = -1;
    for (let j = 0; j < m; j++) {
      const cell = dp[i][j];
      if (cell && better(cell, best)) {
        best = cell;
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      placed = i + 1;
      endJ = bestJ;
      break;
    }
  }

  const chosen: number[] = [];
  for (let i = placed - 1, j = endJ; i >= 0; i--) {
    chosen.unshift(j);
    j = dp[i][j]!.prev;
  }

  const placedSlots: SlotSuggestion[] = chosen.map((j, i) => {
    const free = candidates[j].free;
    return {
      ...slots[i],
      date: candidates[j].date,
      freePlayerIds: free,
      missingPlayerIds: playerIds.filter((id) => !free.includes(id)),
    };
  });

  return { slots: placedSlots, unplaced: slots.slice(placed) };
}
