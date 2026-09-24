import { neon } from "@neondatabase/serverless";
import type { Player, Round, ScoreEntry, Season } from "./types";

export interface Store {
  loadSeason(): Promise<Season>;
  addPlayer(name: string, startingHandicap: number | null): Promise<void>;
  updatePlayer(
    id: string,
    fields: { name?: string; startingHandicap?: number | null; active?: boolean }
  ): Promise<void>;
  createRound(fields: {
    label: string;
    course: string;
    chooserId: string | null;
    date: string | null;
    teeTime: string | null;
    par: number;
  }): Promise<void>;
  updateRound(
    id: string,
    fields: {
      label?: string;
      course?: string;
      chooserId?: string | null;
      date?: string | null;
      teeTime?: string | null;
      par?: number;
      status?: "upcoming" | "played";
    }
  ): Promise<void>;
  deleteRound(id: string): Promise<void>;
  saveScores(roundId: string, scores: ScoreEntry[]): Promise<void>;
  setFreeDate(playerId: string, date: string, free: boolean): Promise<void>;
}

const SEED_PLAYERS: Array<{ name: string; cap: number | null }> = [
  { name: "Ollie Ballard", cap: 16 },
  { name: "George Goddard", cap: 18 },
  { name: "George Swainson", cap: 19 },
  { name: "Pete Andrews", cap: 22 },
  { name: "George Archer", cap: 24 },
  { name: "Aled Everett", cap: 26 },
  { name: "Adam Turner", cap: 29 },
];

/** Round assignments were drawn once at season start: Adam first (his pick
 *  already booked), George Archer after Christmas, the rest at random. */
const SEED_ROUNDS: Array<{
  label: string;
  course?: string;
  date?: string;
  teeTime?: string;
  chooserName?: string;
}> = [
  {
    label: "Round 1",
    course: "Stratford Park Hotel",
    date: "2026-09-26",
    teeTime: "14:00",
    chooserName: "Adam Turner",
  },
  { label: "Round 2", chooserName: "George Swainson" },
  { label: "Round 3", chooserName: "George Goddard" },
  { label: "Round 4", chooserName: "Aled Everett" },
  { label: "Round 5", chooserName: "Ollie Ballard" },
  { label: "Round 6", chooserName: "George Archer" },
  { label: "Finale", chooserName: "Pete Andrews" },
];

/* ------------------------------- Postgres ------------------------------- */

type Sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Array<Record<string, unknown>>>;

class PostgresStore implements Store {
  private sql: Sql;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = neon(url) as unknown as Sql;
  }

  private ensure(): Promise<void> {
    if (!this.ready) this.ready = this.init();
    return this.ready;
  }

  private async init(): Promise<void> {
    const sql = this.sql;
    await sql`CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      starting_handicap INTEGER,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      seq INTEGER NOT NULL,
      label TEXT NOT NULL,
      course TEXT NOT NULL DEFAULT '',
      chooser_id TEXT,
      round_date DATE,
      tee_time TEXT,
      par INTEGER NOT NULL DEFAULT 72,
      status TEXT NOT NULL DEFAULT 'upcoming'
    )`;
    await sql`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS tee_time TEXT`;
    await sql`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS par INTEGER NOT NULL DEFAULT 72`;
    await sql`CREATE TABLE IF NOT EXISTS scores (
      round_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      gross INTEGER,
      absent BOOLEAN NOT NULL DEFAULT FALSE,
      override_net INTEGER,
      PRIMARY KEY (round_id, player_id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS free_dates (
      player_id TEXT NOT NULL,
      free_date DATE NOT NULL,
      PRIMARY KEY (player_id, free_date)
    )`;

    const existing = await sql`SELECT COUNT(*)::int AS n FROM players`;
    if ((existing[0] as { n: number }).n === 0) {
      const idByName = new Map<string, string>();
      for (const p of SEED_PLAYERS) {
        const id = crypto.randomUUID();
        idByName.set(p.name, id);
        await sql`INSERT INTO players (id, name, starting_handicap)
                  VALUES (${id}, ${p.name}, ${p.cap})`;
      }
      for (let i = 0; i < SEED_ROUNDS.length; i++) {
        const r = SEED_ROUNDS[i];
        await sql`INSERT INTO rounds (id, seq, label, course, chooser_id, round_date, tee_time)
                  VALUES (${crypto.randomUUID()}, ${i + 1}, ${r.label}, ${r.course ?? ""},
                          ${r.chooserName ? (idByName.get(r.chooserName) ?? null) : null},
                          ${r.date ?? null}, ${r.teeTime ?? null})`;
      }
    }
  }

  async loadSeason(): Promise<Season> {
    await this.ensure();
    const sql = this.sql;
    const [playerRows, roundRows, scoreRows, freeRows] = await Promise.all([
      sql`SELECT id, name, starting_handicap, active FROM players ORDER BY created_at`,
      sql`SELECT id, seq, label, course, chooser_id, round_date::text AS round_date, tee_time, par, status
          FROM rounds ORDER BY seq`,
      sql`SELECT round_id, player_id, gross, absent, override_net FROM scores`,
      sql`SELECT player_id, free_date::text AS free_date FROM free_dates ORDER BY free_date`,
    ]);

    const players: Player[] = (playerRows as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      startingHandicap: r.starting_handicap as number | null,
      active: r.active as boolean,
    }));

    const scoresByRound = new Map<string, ScoreEntry[]>();
    for (const r of scoreRows as Array<Record<string, unknown>>) {
      const list = scoresByRound.get(r.round_id as string) ?? [];
      list.push({
        playerId: r.player_id as string,
        gross: r.gross as number | null,
        absent: r.absent as boolean,
        overrideNet: r.override_net as number | null,
      });
      scoresByRound.set(r.round_id as string, list);
    }

    const rounds: Round[] = (roundRows as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      seq: r.seq as number,
      label: r.label as string,
      course: r.course as string,
      chooserId: r.chooser_id as string | null,
      date: r.round_date as string | null,
      teeTime: r.tee_time as string | null,
      par: (r.par as number | null) ?? 72,
      status: r.status as Round["status"],
      scores: scoresByRound.get(r.id as string) ?? [],
    }));

    const freeDates = (freeRows as Array<Record<string, unknown>>).map((r) => ({
      playerId: r.player_id as string,
      date: r.free_date as string,
    }));

    return { players, rounds, freeDates };
  }

  async addPlayer(name: string, startingHandicap: number | null): Promise<void> {
    await this.ensure();
    await this.sql`INSERT INTO players (id, name, starting_handicap)
                   VALUES (${crypto.randomUUID()}, ${name}, ${startingHandicap})`;
  }

  async updatePlayer(
    id: string,
    fields: { name?: string; startingHandicap?: number | null; active?: boolean }
  ): Promise<void> {
    await this.ensure();
    if (fields.name !== undefined)
      await this.sql`UPDATE players SET name = ${fields.name} WHERE id = ${id}`;
    if (fields.startingHandicap !== undefined)
      await this.sql`UPDATE players SET starting_handicap = ${fields.startingHandicap} WHERE id = ${id}`;
    if (fields.active !== undefined)
      await this.sql`UPDATE players SET active = ${fields.active} WHERE id = ${id}`;
  }

  async createRound(fields: {
    label: string;
    course: string;
    chooserId: string | null;
    date: string | null;
    teeTime: string | null;
    par: number;
  }): Promise<void> {
    await this.ensure();
    const max = await this.sql`SELECT COALESCE(MAX(seq), 0)::int AS n FROM rounds`;
    const seq = (max[0] as { n: number }).n + 1;
    await this.sql`INSERT INTO rounds (id, seq, label, course, chooser_id, round_date, tee_time, par)
                   VALUES (${crypto.randomUUID()}, ${seq}, ${fields.label}, ${fields.course},
                           ${fields.chooserId}, ${fields.date}, ${fields.teeTime}, ${fields.par})`;
  }

  async updateRound(
    id: string,
    fields: {
      label?: string;
      course?: string;
      chooserId?: string | null;
      date?: string | null;
      teeTime?: string | null;
      par?: number;
      status?: "upcoming" | "played";
    }
  ): Promise<void> {
    await this.ensure();
    if (fields.label !== undefined)
      await this.sql`UPDATE rounds SET label = ${fields.label} WHERE id = ${id}`;
    if (fields.course !== undefined)
      await this.sql`UPDATE rounds SET course = ${fields.course} WHERE id = ${id}`;
    if (fields.chooserId !== undefined)
      await this.sql`UPDATE rounds SET chooser_id = ${fields.chooserId} WHERE id = ${id}`;
    if (fields.date !== undefined)
      await this.sql`UPDATE rounds SET round_date = ${fields.date} WHERE id = ${id}`;
    if (fields.teeTime !== undefined)
      await this.sql`UPDATE rounds SET tee_time = ${fields.teeTime} WHERE id = ${id}`;
    if (fields.par !== undefined)
      await this.sql`UPDATE rounds SET par = ${fields.par} WHERE id = ${id}`;
    if (fields.status !== undefined)
      await this.sql`UPDATE rounds SET status = ${fields.status} WHERE id = ${id}`;
  }

  async deleteRound(id: string): Promise<void> {
    await this.ensure();
    await this.sql`DELETE FROM scores WHERE round_id = ${id}`;
    await this.sql`DELETE FROM rounds WHERE id = ${id}`;
  }

  async setFreeDate(playerId: string, date: string, free: boolean): Promise<void> {
    await this.ensure();
    if (free) {
      await this.sql`INSERT INTO free_dates (player_id, free_date)
                     VALUES (${playerId}, ${date})
                     ON CONFLICT DO NOTHING`;
    } else {
      await this.sql`DELETE FROM free_dates
                     WHERE player_id = ${playerId} AND free_date = ${date}`;
    }
  }

  async saveScores(roundId: string, scores: ScoreEntry[]): Promise<void> {
    await this.ensure();
    await this.sql`DELETE FROM scores WHERE round_id = ${roundId}`;
    for (const s of scores) {
      await this.sql`INSERT INTO scores (round_id, player_id, gross, absent, override_net)
                     VALUES (${roundId}, ${s.playerId}, ${s.gross}, ${s.absent}, ${s.overrideNet})`;
    }
    await this.sql`UPDATE rounds SET status = 'played' WHERE id = ${roundId}`;
  }
}

/* ------------------------------- In-memory ------------------------------ */
/** Used when DATABASE_URL isn't set: local dev and pre-database previews.
 *  Data does not persist across server restarts. */

class MemoryStore implements Store {
  private season: Season;

  constructor() {
    const players = SEED_PLAYERS.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      startingHandicap: p.cap,
      active: true,
    }));
    const idByName = new Map(players.map((p) => [p.name, p.id]));
    this.season = {
      players,
      rounds: SEED_ROUNDS.map((r, i) => ({
        id: crypto.randomUUID(),
        seq: i + 1,
        label: r.label,
        course: r.course ?? "",
        chooserId: r.chooserName ? (idByName.get(r.chooserName) ?? null) : null,
        date: r.date ?? null,
        teeTime: r.teeTime ?? null,
        par: 72,
        status: "upcoming" as const,
        scores: [],
      })),
      freeDates: [],
    };
  }

  async loadSeason(): Promise<Season> {
    return structuredClone(this.season);
  }

  async addPlayer(name: string, startingHandicap: number | null): Promise<void> {
    this.season.players.push({ id: crypto.randomUUID(), name, startingHandicap, active: true });
  }

  async updatePlayer(
    id: string,
    fields: { name?: string; startingHandicap?: number | null; active?: boolean }
  ): Promise<void> {
    const p = this.season.players.find((p) => p.id === id);
    if (!p) return;
    if (fields.name !== undefined) p.name = fields.name;
    if (fields.startingHandicap !== undefined) p.startingHandicap = fields.startingHandicap;
    if (fields.active !== undefined) p.active = fields.active;
  }

  async createRound(fields: {
    label: string;
    course: string;
    chooserId: string | null;
    date: string | null;
    teeTime: string | null;
    par: number;
  }): Promise<void> {
    const seq = Math.max(0, ...this.season.rounds.map((r) => r.seq)) + 1;
    this.season.rounds.push({
      id: crypto.randomUUID(),
      seq,
      label: fields.label,
      course: fields.course,
      chooserId: fields.chooserId,
      date: fields.date,
      teeTime: fields.teeTime,
      par: fields.par,
      status: "upcoming",
      scores: [],
    });
  }

  async updateRound(
    id: string,
    fields: {
      label?: string;
      course?: string;
      chooserId?: string | null;
      date?: string | null;
      teeTime?: string | null;
      par?: number;
      status?: "upcoming" | "played";
    }
  ): Promise<void> {
    const r = this.season.rounds.find((r) => r.id === id);
    if (!r) return;
    if (fields.label !== undefined) r.label = fields.label;
    if (fields.course !== undefined) r.course = fields.course;
    if (fields.chooserId !== undefined) r.chooserId = fields.chooserId;
    if (fields.date !== undefined) r.date = fields.date;
    if (fields.teeTime !== undefined) r.teeTime = fields.teeTime;
    if (fields.par !== undefined) r.par = fields.par;
    if (fields.status !== undefined) r.status = fields.status;
  }

  async deleteRound(id: string): Promise<void> {
    this.season.rounds = this.season.rounds.filter((r) => r.id !== id);
  }

  async saveScores(roundId: string, scores: ScoreEntry[]): Promise<void> {
    const r = this.season.rounds.find((r) => r.id === roundId);
    if (!r) return;
    r.scores = structuredClone(scores);
    r.status = "played";
  }

  async setFreeDate(playerId: string, date: string, free: boolean): Promise<void> {
    const has = this.season.freeDates.some((f) => f.playerId === playerId && f.date === date);
    if (free && !has) {
      this.season.freeDates.push({ playerId, date });
      this.season.freeDates.sort((a, b) => a.date.localeCompare(b.date));
    }
    if (!free && has) {
      this.season.freeDates = this.season.freeDates.filter(
        (f) => !(f.playerId === playerId && f.date === date)
      );
    }
  }
}

/* ------------------------------- Singleton ------------------------------ */

const globalForStore = globalThis as unknown as { __winterCupStore?: Store };

export function getStore(): Store {
  if (!globalForStore.__winterCupStore) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    globalForStore.__winterCupStore = url ? new PostgresStore(url) : new MemoryStore();
    if (!url) {
      console.warn(
        "[winter-cup] DATABASE_URL not set — using in-memory store. Data will not persist."
      );
    }
  }
  return globalForStore.__winterCupStore;
}
