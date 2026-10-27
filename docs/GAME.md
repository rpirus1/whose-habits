# How the game works

The current product behaviour of Whose Habits: what players see and the rules the engine follows.
Keep this file up to date with every change to the game flow, the engine or the in-game effects,
and add a line to the [change log](#change-log) at the end.

The numbers here come from the code: `src/game/types.ts`, `src/game/scoring.ts` and
`src/game/selection.ts`. The engine is a pure reducer (`src/game/engine.ts`) that runs on the
host's phone; guests render the snapshots it sends.

## Setup (`/new`)

- **Mode.** "Choose countries" (2–6 of the 10, the same every round) or "Random countries" (4
  random countries every round, from all 10).
- **Details.** The host's name, 10, 15 or 20 rounds, and 15, 20 or 30 seconds to answer.
  Defaults: 10 rounds, 20 seconds.
- **Invite players** creates the room and opens the lobby.

## Joining (`/r/<code>`)

- **Code on the lander.** "Join with a code" only checks the shape (12 letters and numbers, no
  look-alikes such as i, l, o, 0, 1); a bad shape shows an error under the field.
- **Name screen.** While a new guest types their name, their phone listens on the room's channel
  for the host (in presence as `role: 'host'`, and its broadcast every 5 s). It doesn't join the
  room's presence yet, so the host sees nobody until they tap Join.
  - **Found:** a line above the name field: "Ruslan's game · 3 players" (plus "in progress" during
    a round). Before the first broadcast it says "Game found".
  - **Nothing after 4 s** (`MISSING_AFTER_MS`): "No game with this code is running right now",
    "Check the code, or ask the host to open the game on their phone.", with "Try another code"
    (the lander, with the code filled in and selected) and "Go home". It keeps listening: when the
    host's phone comes back, the name form returns by itself. After 10 minutes
    (`GIVE_UP_AFTER_MS`) it stops listening, so a forgotten tab doesn't hold a realtime
    connection, and offers "Check again".
  - There's no server list of rooms, so "missing" can also mean the host's phone is locked.
- **Rejoining** (this device was in the room before) skips the check; the room screen's own
  messages cover a host who isn't answering.

## Lobby

- **Host:** a QR code and the room link, with Share (where the phone's share sheet exists) and
  Copy link.
- **Guests:** "You're in, Name!" and "Waiting for the host to start the game."
- **Everyone:** the countries (or the random-mode line), rounds and seconds, a closed "How to
  play" with three illustrated rules, and the player list (up to 12 players).
- **Joining.** When someone joins, the host gets a short toast ("Anna joined") with the player's
  initial popping in. A player reconnecting doesn't count as joining.
- **Start.** Shows once 2 players are connected, and names the count: "Start with 3 players".
- **The game's statements.** While the lobby is open, the host's phone gets this game's statements
  from the server: the rounds plus a few spares for skips (`/api/deck`). The app doesn't
  contain the statement bank. If that request failed (no network), Start tries again and shows
  "Couldn't get the habits…" when it still can't.

## A round

1. **Question.** Everyone sees the habit and the round's countries, with a timer bar. Tap a
   country or "I don't know"; the answer can change until the round closes.
   - Players who join mid-question wait for the next round.
   - Answers arriving up to 0.5 s after the deadline still count (network delay).
2. **The round closes** when the timer runs out or everyone has answered.
   - If everyone tapped "I don't know", the round is revealed as usual and everyone gets 0.
   - The host can skip a habit from the host menu: it's swapped for a reserve one at the same
     round number, with a fresh timer.
3. **Reveal.** The answer, a short fact, how the room split, and each player's own result:
   - **Right:** "Correct!" with "+1" or "+2" popping in, and confetti in the theme colours
     (orchid, sunflower, green). The fastest right answer gets a bonus point and a richer burst.
   - **Wrong:** "Not quite", what they picked, and a nudge: "Nobody got this one.", "Only 1 of 5
     got it." (when half or fewer got it) or "Next one's yours!".
   - **No answer:** the same nudge.
   - **"I don't know":** "You didn't know" / "Now you do.", and the fact's lightbulb lights up
     once. When everyone who answered tapped it: "Nobody knew this one" / "Now you all do." (and
     "Nobody knew this one." as the nudge for anyone who didn't answer).
   - Anyone can report a habit (pop-up with reasons); see [Holds](#holds).
4. **Next.** The host taps "Next habit" (or "See final scores" after the last round).
   - A **2-second countdown** starts (`NEXT_COUNTDOWN_MS`), so players can finish reading.
   - **Host:** the button turns disabled and counts down: "Next habit in 2s… 1s…".
   - **Players:** a small pill slides up in place of "Waiting for the host…": "Next habit in 2",
     with a ring that empties.
   - Then the next question starts for everyone at the same moment.
   - A pause, Back, or a report opening cancels the countdown; the host taps Next again.

## Scoring

- A right answer: 1 point.
- The fastest right answer: 1 bonus point (2 in total).
- "I don't know", a wrong answer or no answer: 0.

## Final scores

The ranking with shared places, and the habits the room found hardest. The host can play again
in the same room (back to the lobby, scores reset).

## Host controls

From the host menu: pause and resume, Back (view earlier reveals; during a question it pauses
it, and Next returns to it), skip the current habit, remove a player, end the game.

## Holds

- **Report.** While a player picks a report reason, the reveal holds for everyone (anonymous:
  "A player is reporting this statement…") for up to 10 seconds. Next and Back wait for it.
- **Host alone.** If everyone else leaves or is removed, the game holds at once; if their
  connection drops, it holds after 15 seconds. The host sees "You need someone else to continue"
  with Invite players and End game, and Continue once someone is back.

## In-app browsers

Links opened in Instagram, Messenger, Facebook or LinkedIn on a phone open in the app's own
browser. There the share sheet is missing and the tab is easy to lose, which ends the game for
everyone if it's the host's. So on the lander (above the title), the setup screen and the lobby,
a banner says "You're in Instagram's browser" with:

- **Android:** Open in browser (hands the page to the default browser) and Copy link.
- **iPhone:** "Tap ⋯ and choose Open in browser", and Copy link.

It is not shown on desktop, nor once the game starts. Detection is by user agent
(`src/lib/inAppBrowser.ts`).

## Lander shortcuts

- **Back to the last game:** a secondary button under "Host a game", shown when this device has
  a recent room.

## Effects and feel

- **One animation family** (`src/lib/motion.ts`): screens fade and rise in; small arrivals (a
  joining player, the countdown pill, the points) fade and grow from the centre (`popIn`).
- **Reduced motion:** people who ask their OS for less motion get no animations and no
  confetti; the countdown shows only the number.
- **Haptics (Android only):** a light tick on tapping an answer; short patterns for a right
  answer and for the bonus; a tick when someone joins (host) and when the Next countdown starts
  (players). iPhones have no vibration in the browser, so they get none.

## Change log

- **2026-10-27.** The name screen checks that someone is hosting the code before a guest joins:
  "Ruslan's game · 3 players", or "No game with this code is running right now" after 4 s, with
  "Try another code". New `join_step` value `missing` (once per room and device), shown under the
  stats page's "Guests joining" funnel.

- **2026-10-26.** The statement bank moved out of the app. The Worker deals each game's
  statements (`/api/deck`) while the lobby is open; the engine plans from that deck. Same
  rounds, order rules and skips; the bank can no longer be downloaded from the site.

- **2026-10-26.** When everyone taps "I don't know", the habit is revealed (0 points, "Nobody
  knew this one") instead of silently swapped for a reserve one. Only the host's Skip swaps now,
  so `statement_replaced` events carry `why: 'skip'`; `'unknown'` still parses for older builds.
  The stats count "nobody knew" from revealed rounds' splits, plus those older events.

- **2026-10-25.** Fix: confetti didn't show on the live site. canvas-confetti drew in a `blob:` Web
  Worker, which the Content Security Policy blocks; it now draws on its own canvas on the main
  thread.

- **2026-10-25.** Playtest fixes: player count on Start, join toasts, the 2-second Next
  countdown (engine `nextAt`), reveal confetti and nudges, Android haptics, the in-app browser
  banner, the secondary "Back to the last game" button, icons in How to play, and "4 random
  countries every round".
