export interface Player {
  id: string;
  name: string;
  /** Handicap at the start of the season. null = not yet known (e.g. a late joiner). */
  startingHandicap: number | null;
  active: boolean;
}

export interface ScoreEntry {
  playerId: string;
  /** Gross strokes for the round. null when absent or not entered. */
  gross: number | null;
  /** Player missed the round — they receive the penalty score. */
  absent: boolean;
  /** Manual override of the penalty net score for an absent player. */
  overrideNet: number | null;
}

export type RoundStatus = "upcoming" | "played";

export interface Round {
  id: string;
  /** Order within the season; results are computed in seq order. */
  seq: number;
  /** e.g. "September" or "Finale — Round 1" */
  label: string;
  course: string;
  /** Player who chose the course (drawn from the wheel/hat). */
  chooserId: string | null;
  /** ISO date, e.g. "2026-09-27" */
  date: string | null;
  /** 24h tee time, e.g. "14:00" */
  teeTime: string | null;
  /** Course par for the day; nets and the guillotine are judged against it. */
  par: number;
  status: RoundStatus;
  scores: ScoreEntry[];
}

/** A day a player has said they're free to play. */
export interface FreeDate {
  playerId: string;
  /** ISO date, e.g. "2026-10-10" */
  date: string;
}

export interface Season {
  players: Player[];
  rounds: Round[];
  freeDates: FreeDate[];
}
