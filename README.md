# Whose Habits

A free, phone-based party game for international friends. The host picks 2–6 of 10 countries (or lets the game pick at random), friends join by link or QR code, and everyone guesses which country each everyday habit belongs to.

Live at https://www.whosehabits.com. The bare domain and the old `workers.dev` address redirect there (see [Deploy](#deploy)). The code still uses the old working name `culture-clash` for the repository, the Worker and the D1 database; renaming them would change those addresses, so they stay.

See [docs/PLAN.md](docs/PLAN.md) for the product and technical plan and [docs/CONTENT_RULES.md](docs/CONTENT_RULES.md) for how statements are written and reviewed.

## Develop

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and publishable key
npm run dev                  # also reachable from phones on the same Wi-Fi
```

| Script                                         | What it does                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                                  | Compile statements, start Vite                                                              |
| `npm run dev:api`                              | The Worker (site + analytics API) with a local D1 database (port 8788; Vite proxies `/api`) |
| `npm run db:migrate:local`                     | Create or update the local D1 tables (run once)                                             |
| `npm run db:migrate`                           | Apply new migrations to the live D1 database (before deploying code that needs them)        |
| `npm run metrics:local` / `npm run metrics`    | Success-signal queries (`scripts/metrics.sql`) on local or live D1                          |
| `npm run stats:local` / `npm run stats:deploy` | The private stats page (`stats/`) on localhost with local D1, or deploy it                  |
| `npm run content`                              | Validate `content/statements-extended.csv` and write `src/content/statements.json`          |
| `npm test`                                     | Unit tests (Vitest)                                                                         |
| `npm run build`                                | Content + type check + production build                                                     |
| `npm run lint` / `npm run format`              | Oxlint / Prettier                                                                           |

## Editing statements

The game ships `content/statements-extended.csv` (783 statements; `content/statements.csv` is the older 500). Open it in Google Sheets or Excel, edit, export as CSV (UTF-8) over the same file, then run `npm run content`. Errors point to the row number.

## Privacy and analytics

No accounts, no cookies, no personal data. The app sends a few anonymous events (game
started/finished with its settings and where the host came from, each round's answer counts per country, replaced statements, "play again?"
vote, reports with a reason, share and host clicks, lander button taps, and counts of the steps
into a room) to
`worker/index.ts`, which validates them (`src/lib/events.ts`) and stores them in
Cloudflare D1. No names, player ids or IP addresses are stored. The Worker counts events per IP address for a
minute (Cloudflare rate limiting, `worker/rateLimit.ts`) to block spam; that count isn’t stored.
Room links are unguessable and marked `noindex`. The full list players see is the Privacy
section in the lander footer (`src/lander/Lander.tsx`): keep it in step with `src/lib/events.ts`.

Cloudflare Workers Logs is on (`[observability.logs]` in `wrangler.toml`) to catch errors: it keeps
request logs (which can include IP addresses and room links) for 3 days on the free plan (7 on
paid). The Worker runs first for every request (`run_worker_first = true`, so old addresses can 301
to https://www.whosehabits.com), so every request to the site is logged: the lander, static files,
game pages and `/api/*`. The lander's privacy section says this.

Your own playtests don't count: events from `localhost`, the dev server, or a device that
opened any page with `?test=1` are stored with `test = 1` and left out of every query
(`?test=0` turns it off again; the flag is per address, so set it once on
www.whosehabits.com too). Everything that reaches the `workers.dev` URL is stored as a test,
so before launch every event was one; events on www.whosehabits.com count as real. The numbers are on a private stats page, a separate
Worker (`stats/`) behind Cloudflare Access that only the owner's email can open, or via
`npm run metrics`. What each number means and how the page is protected:
[docs/METRICS.md](docs/METRICS.md).

## Deploy

Every push to `main` deploys:

- **GitHub Actions** (`.github/workflows/ci.yml`) runs lint, tests and the build.
- **Cloudflare Workers Builds** builds and deploys the game Worker (`wrangler.toml`).

The private stats Worker deploys by hand with `npm run stats:deploy`. New D1 migrations go out with
`npm run db:migrate` _before_ the code that needs them.

Every push to `main` gets a release note and an `rN` git tag (`git tag -n99 -l 'r*'`). To see
what changed between two releases, run `git diff rN..rM`.

The Worker serves `www.whosehabits.com` and `whosehabits.com` (custom domains in `wrangler.toml`)
and sees every request first: the bare domain and `culture-clash.<account>.workers.dev` get a 301
to www (`canonicalRedirect` in `worker/routes.ts`), except `/api/*`, so tabs still open on the old
address can keep sending events. Those are stored as tests.
