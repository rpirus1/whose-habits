# Cross-culture party game: build plan

Working name: **Culture Clash** (placeholder; the domain and final name come later).

## 1. Decisions so far

| Topic          | Decision                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host           | Plays like a guest. Host controls sit in a collapsible panel; the rest of the screen is the player view. TV mode comes later.                                                                           |
| Cultures       | Poland, Ukraine, the Netherlands, Brazil, Mexico, United States. The host picks 2 to 6 of them.                                                                                                         |
| Rounds / timer | 10/15/20 rounds, 15/20/30 s per answer                                                                                                                                                                  |
| Players        | 2 to 12, host included. Late joiners start at the next round with 0 points. Duplicate names get a suffix ("Anna 2"). The host can kick players.                                                         |
| Answering      | Tap a culture; the answer can change until time runs out. A secondary **"I don't know"** button counts as answered (0 points). The round ends at the timer or when every connected player has answered. |
| Scoring (Quiz) | +1 for a correct answer. +1 bonus to the player who settled on the correct answer first (the time is when the host received their _last_ change).                                                       |
| Replacement    | If every player picks "I don't know", or the host presses Skip, a new statement replaces the current one. The round count does not change.                                                              |
| Back           | View only: it shows the previous reveal. Next continues with the next unplayed statement.                                                                                                               |
| Final screen   | Scores, the top 3 most surprising statements (lowest % correct in the room), a "Play again?" vote, and a host button to start again in the same room.                                                   |
| Content        | 180 statements, 30 per country, in English. Edited in `content/statements.csv` and compiled to JSON at build time.                                                                                      |
| Metrics        | Cloudflare Pages Function + D1. Anonymous events only: no names, no IPs, no cookies.                                                                                                                    |
| UI             | Simple first and polished later. Built so restyling is cheap (section 7).                                                                                                                               |

## 2. Data model

### Cultures (`src/content/cultures.ts`)

```ts
type CultureCode = 'PL' | 'UA' | 'NL' | 'BR' | 'MX' | 'US'
interface Culture {
  code: CultureCode
  name: string
  color: string /* CSS token name */
}
```

### Statements: source of truth is `content/statements.csv`

You can open it in Google Sheets or Excel, edit it, export it back to CSV and commit. Columns:

| column                 | example                                                                             | notes                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `id`                   | `nl-007`                                                                            | stable and never reused; the prefix is the country it was written for |
| `text`                 | "Birthday guests congratulate the whole family, not just the birthday person."      |                                                                       |
| `fits`                 | `NL` or `PL UA`                                                                     | every culture it fits, separated by spaces                            |
| `note`                 | "Dutch birthdays: you say 'gefeliciteerd' to parents, partners, even grandparents." | one line, teaches something                                           |
| `obviousness`          | `1`, `2` or `3`                                                                     | 1 = most people get it, 3 = insider                                   |
| `topic`                | `hosting`                                                                           | daily / hosting / family / humour / work / language                   |
| `reviewed`             | `yes` or empty                                                                      | set by you or a friend from that country                              |
| `reviewer`, `comments` | free text                                                                           | ignored by the build                                                  |

`npm run content` (and every build) runs `scripts/build-statements.ts`, which:

- validates the file (unique ids, known culture codes, obviousness 1 to 3, text length, empty notes) and fails with row numbers;
- writes `src/content/statements.json`, keeping only the fields the game needs;
- prints coverage per country, topic and obviousness, plus the reviewed count.

Config flag `ONLY_REVIEWED`: off during development, on for the public launch.

### Selection rules (`src/game/selection.ts`, pure and unit-tested)

- **Eligible:** a statement can be used if exactly one _selected_ culture is in its `fits`. That culture is the answer.
- **Plan of N rounds:**
  - balance answers across the selected cultures (shuffled round-robin);
  - ramp obviousness 1 → 2 → 3 over the game, falling back when a level runs out;
  - prefer statements this host device hasn't played recently (the history lives in localStorage).
- Replacements are drawn from the remaining eligible pool.
- If the pool is smaller than rounds + a small buffer, the settings screen disables the larger round options and explains why.

## 3. Realtime architecture

- **Transport:** one Supabase Realtime channel per room, `room:k7m2-x9qp-4tdv`. Broadcast carries messages and Presence tracks who is online. No tables.
- **Room id:** 12 random characters (about 59 bits) from an alphabet without look-alikes, grouped as `xxxx-xxxx-xxxx`. Anyone who knows a room id can join, so it must be unguessable; it is shared only as a link or QR code. Room pages send `noindex, nofollow` and `no-referrer`. (Changed from a 4-letter code after the first phone test.)
- **Identity:** each device gets a random `playerId`, stored in localStorage per room. The host also has a `hostId`. Guests ignore `state` messages that don't come from the hostId they first saw (a cheap guard against spoofing; the friends-at-home threat model accepts the rest).
- **Authority:** the host's device holds the full `GameState` and runs the engine. Guests never compute game state.

### Host state is snapshot-based

After every change, the host broadcasts a **public snapshot** of the current state. It also re-sends it when someone sends `hello`. Snapshots are small (under 2 KB), and they make reconnecting trivial: whoever (re)joins asks once and is in sync.

The question snapshot does **not** include the correct answer. The answer arrives only in the reveal snapshot. (Known trade-off: the answers are in the JS bundle. Accepted for a friends' game.)

### Messages (`src/game/protocol.ts`)

| from  | type                  | payload                                        |
| ----- | --------------------- | ---------------------------------------------- |
| guest | `hello`               | playerId, name (join, or rejoin after refresh) |
| guest | `answer`              | playerId, roundId, culture or `"unknown"`      |
| guest | `ping`                | playerId, t0 (clock sync)                      |
| host  | `pong`                | playerId, t0, hostNow                          |
| host  | `state`               | the public snapshot (see below)                |
| host  | `kicked` / `rejected` | playerId, reason (`full`, `kicked`)            |

### Public snapshot

```ts
{ v, hostId, phase: 'lobby'|'question'|'reveal'|'final',
  settings: { cultures, rounds, seconds },
  players: [{ id, name, score, connected, isHost }],
  round: { index, total, roundId, statementText, endsAt, paused, remainingMs, answeredIds },
  reveal?: { answer, note, split: {PL: 2, unknown: 1, …}, correctIds, bonusId },
  viewingHistory?: number,          // host pressed Back
  final?: { ranking, surprising: [{ text, answer, pctCorrect }] } }
```

### Timer sync

The host sends an absolute `endsAt`, in host clock time. Each guest estimates `offset = hostNow - (t0 + t1)/2` from 3 ping/pong samples, keeps the one with the lowest round-trip time, and counts down locally to `endsAt - offset`. The host's own engine closes the round; guests never do.

### Pause

Freezes `remainingMs`. Resume sets `endsAt = now + remainingMs`.

### Persistence and reconnect

- **Host:** the full `GameState` is saved to localStorage after every change. After a refresh it re-joins the channel and re-broadcasts. If `endsAt` passed while the host was away, the round closes immediately.
- **Guest:** `{roomCode, playerId, name}` is saved. On reopen the guest skips the name screen and sends `hello`.
- **Host offline** (missing from presence): guests see "Waiting for host…".
- **Phone sleep:** the host uses the Screen Wake Lock API during a game.

## 4. Game state machine (`src/game/engine.ts`, pure reducer)

```
settings ──Invite──▶ lobby ──Start (≥2 players)──▶ question ⇄ (pause/resume)
                       ▲                              │ timer ends / all answered
                       │                              ▼
      Play again ◀── final ◀── last round ── reveal ──Next──▶ question
                                               ▲ Back (view previous reveal; Next returns)
question ──Skip / all "I don't know"──▶ question (new statement, same round index)
any phase ──End game──▶ final
```

`reduce(state, action, now) → state` with actions: `join`, `leave`, `presence`, `answer`, `start`, `tick`, `pause`, `resume`, `next`, `back`, `skip`, `end`, `kick`, `updateSettings`, `playAgain`. Time is passed in, so tests are deterministic.

## 5. Screens and routes

| Route      | Screen                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`        | Home: **Create a game**                                                                                                                                      |
| `/new`     | Settings: host name (optional, defaults to "Host"), cultures (2 to 6), rounds, timer → **Invite players**                                                    |
| `/r/<id>`  | Room. Everyone uses this route; the role comes from localStorage                                                                                             |
|            | • Join (guests without a saved name): name field, Join                                                                                                       |
|            | • Lobby: share link, QR, copy button, player list (host first, marked "you · host"), empty state "Waiting for others to join…", **Start** (host, ≥2 players) |
|            | • Question: statement, timer bar, culture buttons (name + colour), "I don't know", count of answered players                                                 |
|            | • Reveal: correct culture, room split bar, note, who scored and who got the bonus, Report link                                                               |
|            | • Final: ranking, 3 surprising statements, "Play again?" vote, host: Play again in this room                                                                 |
| host panel | Collapsible, on every room screen: Pause/Resume, Back, Skip, End game, game settings (lobby only), kick players                                              |

## 6. Metrics (`functions/api/event.ts` + D1)

`POST /api/event {type, gameId, data}` with random `gameId`s, no names and no IPs. Events:

- `game_started` (players, cultures, rounds)
- `game_finished` (rounds played, players at start and end, ended early yes/no)
- `report` (statementId)
- `play_again_vote` (yes/maybe/no)

These answer the success signals: sessions with 5 or more players, finish rate, and whether people would play again.

## 7. Tech stack and making the UI easy to change

- React + Vite + TypeScript, React Router. State lives in two hooks (`useHostGame`, `useGuestGame`); no store library needed.
- **Tailwind CSS + shadcn/ui** (component sources copied into `src/components/ui`, so you can edit any of them) and lucide icons. Animations later with Motion.
- All colours, radii and font sizes are CSS variables in one file, `src/index.css` (shadcn expects it there). Culture colours are tokens too, so restyling is mostly editing one file.
- Screens are thin: they read the snapshot and render components. All logic stays in `game/` and `realtime/`, so redesigns can't break the game.
- Dark theme by default, big tap targets (≥56 px for answers), high contrast.
- Vitest for the engine, selection, scoring and the CSV validator. ESLint and Prettier.

```
content/statements.csv
scripts/build-statements.ts
functions/api/event.ts
src/
  content/   cultures.ts, statements.json (generated)
  game/      types.ts, engine.ts, selection.ts, scoring.ts, protocol.ts
  realtime/  supabase.ts, connection.ts, clock.ts, useHostGame.ts, useGuestGame.ts
  screens/   Home, Settings, Join, Lobby, Question, Reveal, Final
  components/ ui/ (shadcn), HostPanel, CultureButton, TimerBar, PlayerList, SplitBar, QrShare
  index.css   (theme tokens)
```

## 8. Build order (each step ends with something you can check on real phones)

1. **Scaffold:** git, Vite, Tailwind, shadcn, Vitest, Supabase env vars, an empty route skeleton.
2. **Content pipeline:** cultures, CSV schema, build and validation script, content rules doc. **Statement drafting** (180, in per-country batches) can run in parallel from here.
3. **Engine:** types, reducer, selection, scoring, plus unit tests. No UI yet.
4. **Lobby:** Home → Settings → Invite → link, QR, live player list via Presence. Test: phones join over local Wi-Fi (`vite --host`).
5. **Round loop:** question, synced timer, answers, reveal, final.
6. **Host panel and resilience:** pause/resume/back/skip/end, kick, reconnect for host and guests, host-offline state, wake lock.
7. **Metrics:** Pages Function + D1, report link, play-again vote.
8. **Deploy:** GitHub repo, Cloudflare Pages, Supabase keep-alive cron (GitHub Actions; confirm at this step what counts as activity for a project without tables).
9. Playtests, then the UI polish phase.

## 9. Edge cases to decide later (separate session, as agreed)

- Back pressed during a live question: pause it and resume afterwards, or forbid it?
- Host leaves for good: end the game for guests after N minutes? Host migration (not in MVP)?
- A player disconnects mid-question: do they still count toward "everyone answered"? (Current plan: only connected players count.)
- The host changes the cultures in the lobby after players joined. (Fine, just re-plans.)
- Two tabs with the same playerId.
- A late joiner during a question: can they answer the current one? (Current plan: no, from the next round.)
- Everyone except the host leaves mid-game.
- Ties in the final ranking; ties for the first-correct bonus.
- Settings that leave too few eligible statements.
- A room link shared after the game ended.
- Supabase limits reached (connection refused): what message to show.
