# Metrics plan

What Whose Habits measures, why, and what we build next. Agreed on 2026-10-19.

The numbers feed a short product case study, so we want a few trustworthy headline numbers and one or two
behavioural stories. We don't want a dashboard of everything.

## Ground rules

- Anonymous only: no names, player ids, IPs or cookies. Events carry a random `gameId` at most.
- Every event goes through the shared validator `parseEvent` in `src/lib/events.ts`, and every new field gets a test.
- Schema changes go in a new D1 migration (`migrations/0002_…`). We never edit `0001_events.sql`.
- Losing an event must never affect the game (fire-and-forget, as in `src/lib/analytics.ts`).

## Success signals and how we read them

| Signal (from the brief)        | Headline number                                                                                                   | Supporting numbers                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 3 sessions with 5+ players     | Real games (not test) with `players >= 5`                                                                         | Games per day, average players                                                                           |
| At least 80% finish all rounds | **Player finish rate**: players still there at the end ÷ players at start, per game, then the median across games | Share of games that reached the last round; games ended early; abandoned games (started, never finished) |
| "Would you play again?"        | Share of "yes" among voters                                                                                       | Response rate (votes ÷ players at the end), **replay rate** (games started again in the same room)       |
| Growth (bonus)                 | **Guest → host conversion**: games started from the guest CTA ÷ finished games                                    | CTA taps, share taps, visits and referrers                                                               |

Caveats for the case study: these are small numbers (a handful of sessions), so we report counts next to every
percentage. A stated "yes" is weaker evidence than an actual replay, which is why we track both.

## Status

| Step                                  | State                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| 1. Test flag, migration 0002, queries | Done. One-vote-per-game waits for `FinalView.tsx`                              |
| 2. Replay flag                        | Done                                                                           |
| 3. Guest → host                       | `/new?from=cta` → `source` done. The CTA link itself waits for `FinalView.tsx` |
| 4. Web Analytics                      | To do (dashboard setting, no code)                                             |
| 5. Join funnel                        | Waits for the room-screen session                                              |
| 6. Stats page                         | Moved to a private Worker behind Cloudflare Access (see step 6 for setup)      |

Migration 0002 is applied to live D1 (2026-10-19), and the 13 playtest events from that day are marked `test = 1`.

**Pre-launch rule:** until the game is published on its own domain, every event that reaches the Worker on
`*.workers.dev` is stored as a test (`isPreviewHost` in `src/lib/events.ts`). Launch checklist: add the custom
domain, then the events from that domain count as real automatically. Remove the rule only if `workers.dev` itself
should ever count.

## What we build, in order

### 1. Fix what we already count (A)

- **Mark test games.** On `localhost`, or after opening any page with `?test=1` (remembered in `localStorage`
  as `cc:test`), events carry `test: true`. Migration `0002` adds `test INTEGER NOT NULL DEFAULT 0` to `events`,
  and the Worker stores it. Every query in `scripts/metrics.sql` filters `test = 0`. Before launch, the Worker
  also marks every event on `*.workers.dev` as a test (see Status).
- **One vote per person per game.** Today, changing a vote sends a second event. Send it with `trackOnce`
  (`vote:${gameId}`) so only the first tap counts. Changing it in the UI still works.
  _Touches `src/screens/room/FinalView.tsx`, so this waits for the room-screen session (see Coordination)._
- **Better queries** (no app change): per-game player finish rate with the median, a count of abandoned games,
  and the vote response rate.

### 2. Replay flag (B)

`game_started` gets `replay: boolean`: true when the host started it with "Play again in this room". The engine's
`playAgain` action marks the state, and `useHostGame` sends it. Query: replay rate = replays ÷ finished games.

### 3. Guest → host conversion that completes (E)

- The guest CTA links to `/new?from=cta`. The new-game screen keeps `cc:source=guest_cta` in `sessionStorage`.
- The first `game_started` from that host gets `source: 'guest_cta'` (otherwise `'direct'`), and then the key is cleared.
- Query: CTA taps → rooms that started a game with `source = 'guest_cta'`.
  _The link change is in `FinalView.tsx` (waits); the `/new` and `useHostGame` side can land first._

### Countries mode (added 2026-10-23)

`game_started` has `mode: 'pick' | 'random'`. Rows from older builds have no `mode`: they were all picked. In
random games `cultures` is empty (each round draws its own 4 countries), so any country-mix stats must leave
random games out. The dashboard compares the two modes: completed, ended early, not finished, and "Yes" votes.

### 4. Traffic and sources (H)

Cloudflare Web Analytics (cookieless) for visits, referrers and countries. Enable it for the Worker in the
Cloudflare dashboard, or add the beacon script to `index.html` with the site token. Room links (`/r/*`) already
send `Referrer-Policy: no-referrer`, so room codes don't leak to it. Check that the beacon doesn't record full
`/r/<code>` paths. If it does, strip the path or exclude `/r/*`.

### 5. Join funnel (C), after the room-screen session lands

Aggregate counts per day, with no per-person id:

1. `join_opened`: a guest opened a room link
2. `join_named`: entered a name (or had a saved one)
3. `joined`: the host accepted them into the lobby
4. `reached_final`: a guest saw the final screen (carries `gameId`)

Steps 1–3 happen before a game exists, so these events have no `gameId`. `parseEvent` must allow that for
these types only, and they're stored with `game_id = ''`. The room code is a secret and is never sent.
Query: step-to-step conversion per week. Funnel step 4 also gives a per-player finish rate from the guests'
side, as a cross-check against the host's `playersAtEnd`.

### 6. Stats page (I)

A **separate, private Worker** (`stats/`, named `culture-clash-stats`) at
`https://culture-clash-stats.ruslan-pirus.workers.dev`. It reads the game's D1 database and renders
`scripts/metrics.sql` as plain HTML tables. The public game Worker has no stats code.

Who can open it: only the owner, from any device.

1. **Cloudflare Access** guards the whole address (set up 2026-10-23 with the "Cloudflare account" policy: only
   members of the Cloudflare account, i.e. the owner, can get in).
2. **The Worker checks Access's token** (`stats/access.ts`): signature, audience, issuer and expiry. If the token
   is missing or wrong, the Worker refuses, and until `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are set it refuses everyone.
   Per-version preview URLs are off (`preview_urls = false`).

Setup, once:

1. `npm run stats:deploy`
2. In the Cloudflare dashboard: Workers & Pages → `culture-clash-stats` → Settings → Domains & Routes →
   `workers.dev` → enable **Cloudflare Access**. Then in Zero Trust → Access → Applications, set the app's policy
   to **Allow, Emails: your email** (delete any broader rule) and note the **Application Audience (AUD) tag**
   and the team domain (`<team>.cloudflareaccess.com`).
3. `npx wrangler secret put ACCESS_TEAM_DOMAIN -c stats/wrangler.toml` and
   `npx wrangler secret put ACCESS_AUD -c stats/wrangler.toml`
4. On the game Worker, remove the old password: `npx wrangler secret delete STATS_TOKEN`.

Filters (in the URL, so a view can be bookmarked):

- **Dates:** the presets Today / 7 days / 30 days / All time, or From and To dates (Amsterdam days, inclusive, shown as DD/MM/YYYY).
- **Data:** _All events_ (the default, because every event is a test until launch) or _Real players only_
  (`?data=real`). `npm run metrics` always counts real players only.
- **How it works:** the page swaps each `test = 0` in `metrics.sql` for the filters (`filterSql` in `stats/page.ts`),
  so every new query must keep `test = 0` on each read of `events`. A test checks this.

Locally: `npm run stats:local` serves the page at `http://localhost:8790` from the local D1, without Access.
`npm run metrics` stays the quick way from the terminal. For the case study, export with
`wrangler d1 execute … --json`.

## Not now

- **Per-player finish events** beyond funnel step 4: covered by C.
- **Report rate per statement**: needs a "statement shown" event every round. Raw report counts are enough for
  reviewing content.
- **Time to first game**: worth adding with a `room_created` event if setup turns out to be a problem.

## Coordination

Another session is editing `src/components/HostPanel.tsx`, `src/components/PlayerList.tsx` and
`src/screens/room/*`. Steps 1 (queries, test flag, migration), 2, the `/new` half of 3, 4 and 6 don't touch those
files and can start now. The `FinalView.tsx` changes (one vote per game, CTA link) and the funnel events in the room
screens are batched together after that work is merged.
