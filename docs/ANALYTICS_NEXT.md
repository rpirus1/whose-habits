# Next: analytics dashboard and statement reports (plan)

Plan only, written 2026-10-22 and updated the same day for report flow v2 and the 13 topics. It builds on
[METRICS.md](METRICS.md). Effort: XS = under an hour, S = half a day, M = a day.

## Already in place (on main, deployed)

- Anonymous events in D1, all checked by `parseEvent` (`src/lib/events.ts`): `game_started` (with `replay` and
  `source`), `game_finished`, `play_again_vote`, `host_cta_click`, `share_click`, `report` (statement id only).
- A `test` column. Dev devices and `?test=1` count as tests, and so does **everything on `workers.dev` until launch**.
  Every live event so far is therefore test data.
- `scripts/metrics.sql` (8 queries) is shown at `/stats` behind Basic auth (`STATS_TOKEN` is set) and via `npm run metrics`.
- Reports: today one per device per statement, with the id only. No statement text, no times shown, and nothing
  ties a report to the version of the row it was about.

## Decided elsewhere (inputs to this plan)

- **Report flow v2** (the UI session is building it): a pop-up with 4 reasons, held for up to 10 s for everyone.
  The **host** sends exactly one `{ type: 'report', gameId, statementId, reason }` per report, where reason is
  `incorrect | outdated | not_unique | offensive | none`. `none` means the pop-up was closed or timed out, shown as
  "no reason given". Spec: `report-flow-spec.md` in the sessions' shared notes.
- **Topics:** 13 groups shared by every country (home, money, transport, table, hosting, holidays, family, school,
  work, language, humour, weather, leisure). They live in the shipped `statements.json`, so the Worker can group any
  event that has a `statementId` by topic without the topic being sent.

## 1. Analytics for the lander and the game, ending in a simple dashboard

| #   | What                                                                                                                                                                                                                                                                                      | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1 | **Lander traffic:** turn on Cloudflare Web Analytics (cookieless) for visits, referrers and countries. It's a dashboard toggle or one beacon script, and its numbers stay in the Cloudflare dashboard.                                                                                    | XS     |
| 1.2 | **Lander → game:** a `lander_click` event (`host` / `join_code` / `example_card`, with no game id), and `source: 'lander'` on `game_started` when the room was created from the lander. `parseEvent` must allow events without a game id.                                                 | S      |
| 1.3 | **Pending in-game items** (`FinalView.tsx`): the CTA links to `/new?from=cta`, and votes are sent once per game. Plus the join funnel (link opened → named → joined → final) from METRICS.md step 5.                                                                                      | S      |
| 1.4 | **Dashboard:** turn `/stats` from tables into one page: tiles for the 3 success signals (count + %, target shown), a games-per-week bar, lander visits → host taps → games started, and an **"include test data"** switch (otherwise it shows zeros until launch). Inline SVG, same auth. | M      |

## 2. Monitoring flagged statements, and reacting to them

The 7 AI-drafted cultures (BR, MX, US, TR, IT, FR, KR) depend on this.

**Events.** Both are sent by the host, contain counts only and no player ids:

- **`report`**, as in v2, plus three fields the host already knows:
  - `v`: a version hash of the row (see below)
  - `heldMs`: how long the hold actually lasted
  - `nth`: this reporter's 1st, 2nd, 3rd… report in this game. The host counts per player on its own device and
    sends only the number.
- **`round_result`**, sent after each reveal: `statementId`, `v`, `answered`, `correct`, `split` (count per culture
  plus "I don't know"), and `replaced` (skipped by the host).
- **`v`** is a short hash of text + fits, computed at build time. Edited rows keep their id (CONTENT_RULES), so this
  keeps reports and results on the old wording apart.

**Signals per statement, from those events:**

| Signal                         | From                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Times shown, skips             | `round_result`                                                                                                 |
| % correct                      | `correct / answered`                                                                                           |
| Culture picked instead         | Top culture in `split` that isn't in `fits`                                                                    |
| Report count and rate          | `report` ÷ times shown                                                                                         |
| Reports by reason              | `report.reason`. "No reason given" is shown separately and weighted lower                                      |
| **"Fits too narrow" evidence** | `not_unique` reports **plus** the culture picked instead. Together they suggest which culture to add to `fits` |
| Offensive                      | Any `offensive` report goes to the top of the page, marked **needs action**, whatever the threshold            |
| By topic                       | Joined from `statements.json`: report rate and % correct per topic and per culture × topic                     |

**Watching the 10-second hold** (the risk the user accepted). There's no player id, so these come from counts:

- **Reports per game:** the share of games with 1, 2–3 and 4+ reports, and the total hold time per game (sum of `heldMs`).
- **Per player in a game:** the highest `nth` in each game. A game where one player reported 5+ times is a stall
  pattern, and we can see it without knowing who it was.
- **Effect on finishing:** the finish rate of games with heavy holds (for example 30+ s) vs the rest.
- **Reason quality:** the share of `none`. A high share means accidental taps, or people using Report to pause the game.
- **Suggested alarm** (on the dashboard, no alerting): more than 10% of games with `nth ≥ 4`, or a median hold
  above 6 s. If either shows up, consider a cap such as "one hold per player per 3 rounds".

**Review page `/stats/statements`** (same auth, M):

- **Layout:** offensive reports first, then statements by report count. After those, unreviewed rows with warning
  signs: under 20% correct with one wrong culture dominating, or over 95% correct (too obvious).
- **Columns:** id, culture, topic, reviewed, text, fits, shown, reports per reason, report rate, % correct, culture
  picked instead, skips.
- **Filters:** culture, topic, unreviewed only, current version only.
- **Test data:** included by default, because before launch every report is a test and your own reports count too.
- **Hold health:** a small panel on the same page with the numbers above.

**Reacting stays in the CSV** (no kill switch for now): a **Download CSV** button exports the queue (id + stats).
Open it next to `content/statements-extended.csv`. Then either:

- add the suggested culture to `fits`,
- fix the wording (keep the id, note the fix in `comments`), or
- delete the row (never reuse the id),

and push. A deploy picks it up in minutes, and the new `v` starts the row's counts again.

Thresholds to start with: review at 2+ reports with a reason, or a 10%+ report rate after 5+ shows. Any offensive
report: review at once. A live "hide this statement" switch (a D1 table read at game start) is only worth it if
offensive reports come in and fixing by redeploy is too slow.

## Order

1. **Report fields:** `heldMs`, `nth` and `v`, added to the v2 `report` event in `parseEvent`. Agree on these with
   the UI session before it ships v2, so the event schema only changes once. Then `round_result` (S).
2. **`/stats/statements`:** with the hold-health panel and CSV export (M). This part matters most.
3. Web Analytics + lander events (XS + S)
4. Dashboard tiles + include-test switch (M)
5. FinalView bits + join funnel (S), when the room screens are free

Each step starts from the latest `origin/main`, and merges it again before any localhost test.

Privacy is unchanged: no names, player ids, IPs or cookies. Room splits and `nth` are counts, never tied to a person.
