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

## Reels

Feed posts mostly reach followers; Reels are how strangers find the account. Every quiz also gets a short Reel (about 13 seconds): the game screen with the timer running, a tap on a wrong country, the reveal ("Not quite"), then a closing screen that sends people to the profile.

- Render with `npm run reels` in `docs/brand/instagram/` (first time: `npm install` there; it uses your Chrome and a bundled ffmpeg). The videos land in `reels/`.
- The `wrong` field in `posts.json` is the country "I" pick. Choose a plausible guess, not a silly one.
- The video has no sound: add a trending track in Instagram when posting (Reels with music reach further).
- Post the Reel a few days after the carousel, or use **Trial Reels** (shown only to non-followers) to test it first.
- Caption: "I got this one wrong 🙈 Would you? Guess in the comments." plus the usual hashtags.

### Reel formats

The first two game-play Reels (one slow habit, 15 s) reached mostly non-followers (85%) but got few likes, no comments, no follows. The opening frame was a static screen, and nothing asked for a 5-second reply. Formats to test, one at a time:

1. **Speed round** (`npm run speed`, `speed.json`): "Can you get 3/3? ⏱️", 3 habits with a 3-second countdown each, the answer flashes green with a reaction, then "How many did you get? Comment your score". A habit is on screen from the first frame. Fast cuts make people rewatch; the score is an easy comment.
2. **POV: game night with international friends** (`npm run pov`, `pov.json`): 4 players (emoji faces with flags) vote at the same time, the split bars fill up, the "obvious" country is wrong and the group reacts. Shows the game is social, which is the point of it.
3. **Painting reaction**: the reveal followed by a public-domain painting with a caption (e.g. Munch's The Scream: "Me finding out Friday the 13th is fine in Italy"). Classic-art memes are popular with 25–44, and paintings by artists who died over 70 years ago are free to use (Wikimedia Commons marks them "public domain").

Legal rules for memes: no screenshots of films, TV or celebrities and no stock photos of popular meme templates (they're copyrighted). Use public-domain art, our own graphics, Noto emoji (open licence), and Instagram's own music and GIF stickers, added in the Instagram editor (licensed for use there).

Measure each Reel after 2 days: views, average watch time and "skip rate" in Insights, comments, shares, follows. Keep the format that wins.

## Getting followers (free, about 15 minutes a week)

On posting day, in this order:

1. **Comment on 3–5 bigger accounts** in the niche (expats in the Netherlands, culture and "you know you're Dutch when" meme pages, language-learning and travel-fact accounts), from the Whose Habits account, within 30 minutes of their post. Say something specific or funny that adds to the post ("In Italy it'd be Friday the 17th 😅"). No links, no "check out my page", never the same comment twice: that gets flagged as spam.
2. **Share the post to Stories** with a Quiz sticker.
3. **DM it to 2–3 friends** from that country. DM shares are one of the strongest signals for Instagram.
4. **Reply to every comment** with a question back, so the thread keeps going.

Once, or now and then:

- Share the intro on your personal Story; use "Invite friends" in the profile menu.
- **Collab posts:** ask an international friend or a small expat/language account to co-post a habit from their country (Instagram's Collab feature puts it on both profiles). Ideally with one line of their own: "As a Ukrainian, yes, we really do this".
- Tag the location (Amsterdam). Add the Instagram handle to LinkedIn and your email signature.

Never: buying followers, follow/unfollow, engagement pods. They bring fake followers and Instagram limits the account's reach.

## Extras

Only when there's something real:

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
- 2026-10-28: 2 game-play Reels: 148 and 172 views (85% non-followers), 5 and 3 likes, 0 comments, 0 follows. Intro carousel: 503 views, 11 likes. Audience 25–44. Next: speed-round Reel.
