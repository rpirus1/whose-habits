# Culture Clash (working title)

A phone-based party game for mixed groups. The host picks 2–6 cultures, friends join by link or QR, and everyone guesses which culture each statement fits best.

See [docs/PLAN.md](docs/PLAN.md) for the product and technical plan and [docs/CONTENT_RULES.md](docs/CONTENT_RULES.md) for how statements are written and reviewed.

## Develop

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and publishable key
npm run dev                  # also reachable from phones on the same Wi-Fi
```

| Script                                      | What it does                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                               | Compile statements, start Vite                                                              |
| `npm run dev:api`                           | The Worker (site + analytics API) with a local D1 database (port 8788; Vite proxies `/api`) |
| `npm run db:migrate:local`                  | Create or update the local D1 tables (run once)                                             |
| `npm run db:migrate`                        | Apply new migrations to the live D1 database (before deploying code that needs them)        |
| `npm run metrics:local` / `npm run metrics` | Success-signal queries (`scripts/metrics.sql`) on local or live D1                          |
| `npm run content`                           | Validate `content/statements.csv` and write `src/content/statements.json`                   |
| `npm test`                                  | Unit tests (Vitest)                                                                         |
| `npm run build`                             | Content + type check + production build                                                     |
| `npm run lint` / `npm run format`           | Oxlint / Prettier                                                                           |

## Editing statements

Open `content/statements.csv` in Google Sheets or Excel, edit, export as CSV (UTF-8) over the same file, then run `npm run content`. Errors point to the row number.

## Privacy and analytics

No accounts, no cookies, no personal data. The app sends a few anonymous, game-level events
(game started/finished, "play again?" vote, report a statement, share and host clicks) to
`worker/index.ts`, which validates them (`src/lib/events.ts`) and stores them in
Cloudflare D1. No names, player ids or IP addresses are stored. Room links are unguessable
and marked `noindex`.

Your own playtests don't count: events from `localhost`, the dev server, or a device that
opened any page with `?test=1` are stored with `test = 1` and left out of every query
(`?test=0` turns it off again). Until launch on a custom domain, everything on the
`workers.dev` URL is stored as a test too. The numbers are at `/stats` (password: the `STATS_TOKEN`
secret, set with `npx wrangler secret put STATS_TOKEN`) or via `npm run metrics`. What each
number means: [docs/METRICS.md](docs/METRICS.md).
