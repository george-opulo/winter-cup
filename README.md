# ❄ Winter Cup

A mobile-first web app for running the Winter Cup golf competition: leaderboard,
score entry, automatic handicap adjustments, fixtures, availability collection
with an auto-scheduler, and stats.

## The rules (as encoded)

- **Medal play.** Net = gross − handicap. Lowest net wins the round, highest
  net loses it.
- **Blob at par + 4.** Maximum score on any hole is par + 4 (7 on a par 3,
  8 on a par 4, 9 on a par 5) — pick up, write it down, move on. Cards are
  adjusted on the course; the app records the adjusted gross.
- **Season standings** are cumulative net; the lowest total wins the cup.
- **Handicaps:** the round winner is docked 1, the loser goes up 1. Ties for
  first/last mean everyone tied gets docked/bumped; if the whole field ties,
  nothing changes.
- **No-shows** score the worst net of that round (admin can override the
  number per case). They can't win or lose the round and their cap is
  untouched.
- **The finale** is just two normal rounds on one day — each counts toward the
  total and each has its own winner/loser cap adjustment.

Handicaps and totals are always **recomputed from starting caps + the full
history of gross scores**, so editing any past round automatically ripples
through everything. The admin "Players" screen edits *starting* caps;
in-season changes are never entered by hand.

## Pages

| Page | Who | What |
| --- | --- | --- |
| `/` | everyone | Live leaderboard with current caps, W/L, totals |
| `/rounds` | everyone | Fixtures & results; tap a played round for the full card |
| `/dates` | everyone | Tap the days you're free — feeds the auto-scheduler |
| `/stats` | everyone | Records + every handicap dock/bump of the season |
| `/admin` | PIN only | Scores, auto-schedule, rounds and players |

## Deploying to Vercel

1. Push this repo to GitHub and **Import** it in Vercel.
   (If the app lives in a subfolder, set **Root Directory** to `winter-cup`.)
2. In the project's **Storage** tab, add a **Neon Postgres** database (free
   tier). This sets `DATABASE_URL` automatically. Tables are created and
   seeded with the 2026/27 players on first load.
3. In **Settings → Environment Variables**, add `ADMIN_PIN` — the PIN you'll
   use to unlock `/admin` on your phone.
4. Deploy. Share the URL with the lads; keep the PIN to yourself.

Without `DATABASE_URL` the app falls back to an in-memory store (fine for
previews; data resets on restart). Without `ADMIN_PIN` the admin area won't
work in production (dev fallback PIN is `1234`).

## Local development

```bash
npm install
npm run dev        # http://localhost:3000, in-memory store, PIN 1234
npm test           # scoring engine unit tests
```

## Stack

Next.js (App Router) · React server actions · Neon serverless Postgres ·
no ORM, no CSS framework — just a small hand-rolled winter theme.
