# Next: analytics dashboard and statement reports (plan)

Plan only, written 2026-10-22. It builds on [METRICS.md](METRICS.md). Effort: XS = under an hour, S = half a day, M = a day.

## Already in place (on main, deployed)

- Anonymous events in D1, all checked by `parseEvent` (`src/lib/events.ts`): `game_started` (with `replay` and
  `source`), `game_finished`, `play_again_vote`, `host_cta_click`, `share_click`, `report` (statement id only).
- A `test` column. Dev devices and `?test=1` count as tests, and so does **everything on `workers.dev` until launch**.
  Every live event so far is therefore test data.
- `scripts/metrics.sql` (8 queries) is shown at `/stats` behind Basic auth (`STATS_TOKEN` is set) and via `npm run metrics`.
- Reports: one per device per statement. The only query is "most reported ids". There's no statement text, no times
  shown, no reason, and nothing ties a report to the version of the row it was about.

## 1. Analytics for the lander and the game, ending in a simple dashboard

| #   | What                                                                                                                                                                                                                                                                                      | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1 | **Lander traffic:** turn on Cloudflare Web Analytics (cookieless) for visits, referrers and countries. It's a dashboard toggle or one beacon script, and its numbers stay in the Cloudflare dashboard.                                                                                    | XS     |
| 1.2 | **Lander → game:** a `lander_click` event (`host` / `join_code` / `example_card`, with no game id), and `source: 'lander'` on `game_started` when the room was created from the lander. `parseEvent` must allow events without a game id.                                                 | S      |
| 1.3 | **Pending in-game items** (`FinalView.tsx`): the CTA links to `/new?from=cta`, and votes are sent once per game. Plus the join funnel (link opened → named → joined → final) from METRICS.md step 5.                                                                                      | S      |
| 1.4 | **Dashboard:** turn `/stats` from tables into one page: tiles for the 3 success signals (count + %, target shown), a games-per-week bar, lander visits → host taps → games started, and an **"include test data"** switch (otherwise it shows zeros until launch). Inline SVG, same auth. | M      |

## 2. Monitoring flagged statements, and reacting to them

The 7 AI-drafted cultures (BR, MX, US, TR, IT, FR, KR) depend on this. Signals per statement, and how to get them:

| Signal                              | Today | Missing piece                                                                                                                                                                                        |
| ----------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Times shown                         | No    | **`round_result`** event from the host after each reveal: `statementId`, `answered`, `correct`, `split` (count per culture + unknown), `replaced` (skipped by the host). Counts only, no player ids. |
| % correct                           | No    | Same event: `correct / answered`                                                                                                                                                                     |
| Which culture players chose instead | No    | Same event: the top culture in `split` that isn't in `fits`. A large share suggests `fits` is missing a culture                                                                                      |
| Report count and rate               | Count | Rate = reports ÷ times shown                                                                                                                                                                         |
| Why it was reported                 | No    | **Reason chips** on Report: _Wrong country_ / _Not true or outdated_ / _Offensive_ / _Unclear_ (`RevealView.tsx`; coordinate with the room-screen session)                                           |
| Which version was reported          | No    | **`v`**: a short hash of text + fits, added at build time to both events. Edited rows keep their id (CONTENT_RULES), so reports on the old wording can be told apart                                 |

**Review page `/stats/statements`** (same auth, M): one table of statements needing attention, joined with the
bundled statement text. Columns: id, culture, reviewed, text, fits, shown, reports (by reason), report rate,
% correct, most-picked wrong culture, skips. Default sort: reports first, then unreviewed rows with warning signs
(under 20% correct with one wrong culture dominating, or over 95% correct = too obvious). Filters: culture,
unreviewed only, current version only. Reports include test data by default: before launch every report is
"test", and your own reports are useful too.

**Reacting stays in the CSV** (no kill switch for now): a **Download CSV** button exports the queue (id + stats).
Open it next to `content/statements-extended.csv`, then fix the row (keep the id, note the fix in `comments`) or
delete it (never reuse the id), and push. A deploy picks it up in minutes, and the new `v` starts the row's counts again.
Thresholds to start with: review at 2+ reports, or a 10%+ report rate after 5+ shows. A live "hide this
statement" switch (a D1 table read at game start) only makes sense if fixing a bad row by redeploy turns out to be too slow.

## Order

1. `round_result` + `v` + reason chips (S + S; the chips touch `RevealView.tsx`)
2. `/stats/statements` + CSV export (M), the part that matters most
3. Web Analytics + lander events (XS + S)
4. Dashboard tiles + include-test switch (M)
5. FinalView bits + join funnel (S), when the room screens are free

Privacy is unchanged: no names, player ids, IPs or cookies. Room splits are counts per culture, never per player.
