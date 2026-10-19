# Metrics plan

What Culture Clash measures, why, and what we build next. Agreed on 2026-10-19.

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
| 6. `/stats` page                      | Done. Needs `STATS_TOKEN` set in production                                    |

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

A read-only `GET /stats` route in `worker/index.ts`, protected by a secret (`STATS_TOKEN`, set with
`wrangler secret put`, sent as HTTP Basic auth). It runs the same queries as `scripts/metrics.sql` and renders
plain HTML tables. It has no links from the app and gets `X-Robots-Tag: noindex`. `npm run metrics` stays the
quick way from the terminal. For the case study, export a CSV with `wrangler d1 execute … --json`.

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
