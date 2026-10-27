# Instagram

A low-maintenance plan: about **1 hour a month** plus **10 minutes on posting days**. The goal is the same as for every post (see [POSTS.md](POSTS.md)): visits to the game, comments, feedback. Instagram is a side channel, so it should never need daily attention.

## The format: "Whose habit?" carousels

Almost every post is the game itself, as a 2-slide carousel:

1. **Question:** one habit from the game and 4 flags, "Swipe for the answer".
2. **Answer:** the country, the note from the game, and "Play with friends: link in bio".

Why this format:

- It needs no new writing. The habit and the note come straight from `content/statements-extended.csv`.
- The answer is on slide 2, so there's no follow-up reveal to post later (unlike LinkedIn). Swipes and comments with guesses are good signals for Instagram.
- It's a sample of the game. If people enjoy guessing one habit, the game is the same thing with friends.

Rules for picking habits:

- One country per post (`fits` has a single code), rotating through all 10.
- Obviousness 2–3: not too easy, not impossible. A surprising twist works best.
- Prefer reviewed statements. For a draft one, check its source before posting.
- The 3 other flags are plausible guesses, never the answer's neighbours just to trick people.
- Don't post a habit that could read as a stereotype or a joke about the country.

## Cadence

- **1 carousel a week**, same day, e.g. Thursday 18:00 Amsterdam time (people scroll after work).
- **Monthly batch (about 1 hour):** ask Claude for the next 4 posts. It picks the habits, renders the slides (`docs/brand/instagram/`) and writes the captions. You review, then schedule all 4.
- **Schedule** in Meta Business Suite (free, on the web) or with Instagram's own "Schedule" option under Advanced settings. Nothing to post by hand on the day.
- **Posting day (10 minutes):** reply to comments in the first hour. Optionally share the post to your Story with a Quiz sticker (4 flags); it takes 1 minute and Stories reach followers better than the feed.

Optional extras, only when there's something real:

- A photo or short clip from an actual game night (the most authentic content you have).
- A milestone ("100 games played") once the numbers exist (see LAUNCH.md, step 3).

## Captions

Short, same template every time:

> Whose habit is this? 🤔 Guess in the comments before you swipe.
>
> [One line on the topic, e.g. "Superstitions are different everywhere."]
>
> Play 780+ habits like this with your friends: link in bio. Free, no app.
>
> #whosehabits #partygame #expatlife #culturequiz #[country]culture

Keep 3–5 hashtags. Instagram now favours a few relevant ones over long lists.

## Profile

- **Link in bio:** https://www.whosehabits.com
- **Pinned posts:** the intro carousel ("What is Whose Habits?"), plus the best-performing quiz later.
- **Highlights (optional):** "How to play", from the intro slides.

## What to check (once a month, 5 minutes)

In Instagram's Insights for each post: reach, saves, shares, comments and link taps from the profile. Keep the format that gets saves and shares; drop what doesn't. Write a line per month under "Log" below.

## Posts

| #   | Planned | Habit                                            | Answer          | Slides                         |
| --- | ------- | ------------------------------------------------ | --------------- | ------------------------------ |
| 0   | first   | Intro: what Whose Habits is (pin it)             |                 | `intro-1.png`, `intro-2.png`   |
| 1   | week 1  | Friday the 17th is the unlucky day (`it-007`)    | Italy           | `it-007-1.png`, `it-007-2.png` |
| 2   | week 2  | Furniture through the window (`nl-007`)          | The Netherlands | `nl-007-1.png`, `nl-007-2.png` |
| 3   | week 3  | Fried chicken delivered to the park (`kr-003`)   | South Korea     | `kr-003-1.png`, `kr-003-2.png` |
| 4   | week 4  | Sitting down in silence before a trip (`ua-001`) | Ukraine         | `ua-001-1.png`, `ua-001-2.png` |

Slides live in `docs/brand/instagram/`. To make the next batch, add posts to `posts.json` (statement id + 4 flag options) and run `node docs/brand/instagram/make.mjs`.

### Captions for batch 1

**0. Intro (pin it)**

> A party game about the little habits that make every country feel like home 🌍
>
> One phone each, 2–12 players, 10 countries, 780+ everyday habits. Guess whose habit it is.
>
> Free, no app, no sign-up: link in bio.
>
> #whosehabits #partygame #gamenight #expatlife #internationalfriends

**1. Italy**

> Whose habit is this? 🤔 Guess in the comments before you swipe.
>
> Every country has its own unlucky number.
>
> Play 780+ habits like this with your friends: link in bio. Free, no app.
>
> #whosehabits #partygame #superstitions #culturequiz #italianculture

**2. The Netherlands**

> Whose habit is this? 🤔 Guess in the comments before you swipe.
>
> Moving day looks very different in some cities.
>
> Play 780+ habits like this with your friends: link in bio. Free, no app.
>
> #whosehabits #partygame #expatlife #culturequiz #dutchculture

**3. South Korea**

> Whose habit is this? 🤔 Guess in the comments before you swipe.
>
> Picnic level: expert 🍗
>
> Play 780+ habits like this with your friends: link in bio. Free, no app.
>
> #whosehabits #partygame #foodculture #culturequiz #koreanculture

**4. Ukraine**

> Whose habit is this? 🤔 Guess in the comments before you swipe.
>
> Do you have a ritual before a long trip?
>
> Play 780+ habits like this with your friends: link in bio. Free, no app.
>
> #whosehabits #partygame #traditions #culturequiz #ukrainianculture

## Log

- 2026-10-27: account set up; plan and first batch made.
