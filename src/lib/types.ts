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

/** A candidate date for an upcoming round, with who can make it. */
export interface DateOption {
  id: string;
  /** ISO date, e.g. "2026-10-10" */
  date: string;
  availablePlayerIds: string[];
}

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
  status: RoundStatus;
  scores: ScoreEntry[];
  dateOptions: DateOption[];
}

export interface Season {
  players: Player[];
  rounds: Round[];
}
