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

## Lobby

- **Host:** a QR code and the room link, with Share (where the phone's share sheet exists) and
  Copy link.
- **Guests:** "You're in, Name!" and "Waiting for the host to start the game."
- **Everyone:** the countries (or the random-mode line), rounds and seconds, a closed "How to
  play" with three illustrated rules, and the player list (up to 12 players).
- **Joining.** When someone joins, the host gets a short toast ("Anna joined") with the player's
  initial popping in. A player reconnecting doesn't count as joining.
- **Start.** Shows once 2 players are connected, and names the count: "Start with 3 players".

## A round

1. **Question.** Everyone sees the habit and the round's countries, with a timer bar. Tap a
   country or "I don't know"; the answer can change until the round closes.
   - Players who join mid-question wait for the next round.
   - Answers arriving up to 0.5 s after the deadline still count (network delay).
2. **The round closes** when the timer runs out or everyone has answered.
   - If everyone tapped "I don't know", the habit is swapped for a reserve one at the same round
     number. The host can also skip a habit from the host menu.
3. **Reveal.** The answer, a short fact, how the room split, and each player's own result:
   - **Right:** "Correct!" with "+1" or "+2" popping in, and confetti in the theme colours
     (orchid, sunflower, green). The fastest right answer gets a bonus point and a richer burst.
   - **Wrong:** "Not quite", what they picked, and a nudge: "Nobody got this one.", "Only 1 of 5
     got it." (when half or fewer got it) or "Next one's yours!".
   - **No answer:** the same nudge.
   - **"I don't know":** "Now you do.", and the fact's lightbulb lights up once.
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

- **2026-10-25.** Fix: confetti didn't show on the live site. canvas-confetti drew in a `blob:` Web
  Worker, which the Content Security Policy blocks; it now draws on its own canvas on the main
  thread.

- **2026-10-25.** Playtest fixes: player count on Start, join toasts, the 2-second Next
  countdown (engine `nextAt`), reveal confetti and nudges, Android haptics, the in-app browser
  banner, the secondary "Back to the last game" button, icons in How to play, and "4 random
  countries every round".
