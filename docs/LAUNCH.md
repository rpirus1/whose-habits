# Launch plan (draft)

How Whose Habits gets its first players, and how each step feeds the success signals in [METRICS.md](METRICS.md):

| Signal                    | Target                      | Where it comes from                         |
| ------------------------- | --------------------------- | ------------------------------------------- |
| Real sessions             | 3 games with 5+ players     | `game_started` with `players >= 5`          |
| Finish rate               | 80% of players to the end   | Player finish rate, median across games     |
| Would you play again?     | Share of "yes" votes        | Final screen vote, plus the replay rate     |
| Growth (bonus)            | Guests who start a game     | Guest CTA → `source: 'guest_cta'`           |

## 0. Before anyone outside the dry run plays

Gates, in order. Don't invite anyone outside the dry run until all of them are done.

1. **Statements reviewed.** At least the ones a 15-round game can draw. Nothing goes out while they are drafts.
2. **Brand in the app.** Name, icon and share preview from [BRAND.md](BRAND.md) (UI polish chat).
3. **Domain bought and connected.** whosehabits.com on the Worker. **This is also the metrics switch:** games on workers.dev are stored as tests, so playtests there don't count toward the signals.
4. **Dry run.** One game with 2–3 friends on the real domain: joining by QR code, a full game, the final screen, the vote. Fix what breaks. This game doesn't count either.

## 1. Playtests: the first 3 groups (personal network)

Goal: 3 real games with 5+ players, ideally with at least 3 nationalities at the table.

| # | Group                                            | Host                     | What it tests                                          |
| - | ------------------------------------------------ | ------------------------ | ------------------------------------------------------ |
| 1 | Your own friends at your place                   | You                      | Does the game work and is it fun?                      |
| 2 | A friend's mixed group, at their place           | That friend, you play    | Can someone else host from the link alone?             |
| 3 | Colleagues, after-work drinks or a team evening  | A colleague, you absent  | Does it work without you there? (the real test)        |

Tips:

- **Mix nationalities, and include people from the six countries.** A Pole, a Brazilian or a Dutch person at the table also checks the content: if they say "nobody does that", the statement goes back to review.
- **Keep it short.** 10 rounds, 20 seconds per answer. The game should end while people still want more.
- **When you play, watch; don't explain.** Note every time someone asks "what do I do now?", how long joining takes, and which statements start a conversation.

### Feedback after each game (2 minutes)

The in-app "Play again?" vote is the number. Add three questions in the group's WhatsApp chat right after the game, while people are still there:

1. What was the best moment?
2. What was confusing or slow?
3. Would you play this again with other friends? Who with?

For hosts (groups 2 and 3), also ask: "Was anything hard to set up or run?"

No forms with names or emails: this keeps the privacy promise, and replies in the group chat come back faster anyway.

### Decision after the 3 games

| If…                                    | Then                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| Finish rate ≥ 80% and most say "yes"   | Go to step 2.                                                                          |
| Players drop out mid-game              | Check where in the join funnel and at which round; shorten the game or fix that step.  |
| "Play again?" is mostly "no"           | Look at the "best moment" answers: improve the statements and notes before more players. |
| Hosts got stuck                        | Fix the setup screen first: step 2 depends on strangers hosting without help.          |

## 2. Expat communities in Amsterdam

Only after step 1 passes. Goal: games where you don't know the host.

Where (read each group's rules on self-promotion before posting; most allow a non-commercial free game if you ask the moderators first):

- **Reddit:** r/Amsterdam, r/Netherlands, r/Expats.
- **Facebook:** Amsterdam expat groups, and community groups for each of the six countries in the Netherlands. Those also give you content reviewers.
- **Meetup:** language exchanges and board game nights. Offer to bring the game to an evening rather than just posting a link.
- **Board game cafés and international student associations:** later, if the first two work.

Post angle: the invitation and the question, not the product. People respond to "Is it true that…?"

> **Is it true that in Poland a quick coffee visit turns into a three-course meal?**
> I made a free party game about the little habits that make every country feel like home. You play on your phones (no app, no sign-up) and guess where each habit is most typical, and every answer comes with a short note on why.
> It's made for mixed groups of friends. I'd love feedback from people from 🇵🇱 🇺🇦 🇳🇱 🇧🇷 🇲🇽 🇺🇸: did I get your country right?
> whosehabits.com

## 3. LinkedIn (the portfolio angle)

Three posts, each with something concrete. You can share the process ("building in public") without the game going viral.

1. **Why I'm building it.** The problem: mixed friend groups and party games that don't fit them. The constraints: under €300, privacy-first, no app. One screenshot. Ask: "Got a mixed friend group? I'm looking for 3 playtest groups."
2. **What 3 game nights taught me.** Real numbers (players, finish rate, play-again share) and 2–3 surprises: a statement nobody got, a step that confused everyone, what you changed. Show the numbers next to the counts: 3 games is a small sample.
3. **The case study.** Link to the write-up (see the portfolio outline). Tag what you practised: discovery, prioritisation, metrics, privacy by design.

## Message templates

**WhatsApp invite to friends (step 1):**

> Game night at mine on [date]? I built a small party game: you guess which country a habit belongs to (Poland, Brazil, the Netherlands…). It runs on your phone in the browser, no app. Takes 15 minutes, and I need honest feedback 🙏

**Asking a friend to host (step 1, groups 2–3):**

> Would you host one round of my game with your friends? You only need the link: open it, pick the countries, and show the QR code. I'll ask you 3 questions afterwards. That's all.
