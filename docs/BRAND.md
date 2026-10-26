# Brand

Decisions on name, positioning and brand basics. Checks were run on 2026-10-19; recheck availability before buying.

## 1. Name: **Whose Habits**

Replaces the working name "Culture Clash", which sounded like a competition between cultures (the content rules exist to prevent exactly that).

Why this name:

- Says what the game is: you guess whose habit a statement describes.
- Short, easy to say at a party ("let's play Whose Habits"), easy to type.
- About everyday habits, not about nations being compared.
- Clean: no existing game or app with the name, no trademark hits in TMview (EU, UK, Benelux and other offices), all domains free.

### Domains

| Domain           | Status (registry RDAP) | Price per year (Cloudflare Registrar) | Plan                                         |
| ---------------- | ---------------------- | ------------------------------------- | -------------------------------------------- |
| whosehabits.com  | **registered 2026-10-20** at Cloudflare, expires 2027-10-20, auto-renew | $10.46, renews at $10.46 | Main domain. Not connected to the Worker yet: connect after statement review and the brand changes (LAUNCH.md, gates 1–3). |
| whoshabits.com   | free                   | $10.46                                | Optional: covers the "who's" typo, redirect. |
| whosehabit.com   | free                   | $10.46                                | Optional: singular, redirect.                |
| whosehabits.app  | free                   | $8.20 first year, renews at $14.20    | Skip unless .com is lost.                    |
| whosehabits.nl   | free                   | not sold by Cloudflare, ~€5–15 elsewhere | Skip for now.                             |

Notes:

- Buy at Cloudflare: the Worker already runs there, so DNS and the custom domain are one dashboard, and the price has no markup.
- Avoid `.fun` (renews at $30.20), `.game` ($300.20 a year) and `.party` (cheap, but a history of spam that can hurt link previews and email).
- Connecting the domain is also the launch switch for metrics: events on workers.dev are stored as tests (`src/lib/events.ts` `isPreviewHost`).

### Names considered and dropped

| Name          | Why dropped                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| So Typical    | sotypical.com is for sale by a domain broker; sotypical.nl is an active Dutch party-entertainment company called So Typical; EU trademark SOTYPICALME (classes 9, 16, 40) and UK NOT SO TYPICAL (classes 35, 41). |
| Habipedia     | Clean, but sounds like a reference site, not a party game. Could later name a content or SEO section of the site.    |
| Small Customs | Clean and clever, but nobody searches for "customs" when they want a party game.                                     |
| Habitude      | .com, .app and .nl taken; several habit-tracker apps use the name.                                                   |
| Habifun       | .com registered by someone else since 2023; unclear pronunciation.                                                   |
| Localish, Folkways, Whereish, Homeways, Local Habits, Small Habits | .com taken.                                                      |

## 2. Wording: "countries", not "cultures"

"Cultures" can feel sensitive in an expat-heavy group. In what players see:

- Setup: **countries** ("Pick 2–6 countries"), which matches the flags.
- Questions: avoid the noun: **"Where is this most typical?"**
- If regions (Catalonia, Scotland, Bavaria) are ever added, switch to **places**.

The UI change belongs to the UI polish chat; nothing in the app is renamed yet.

## 3. Positioning

**One-line pitch:** A party game about the little habits that make every country feel like home. No app, no sign-up, just your phones.

### Who it's for

- **Main group:** friends from different countries at someone's home. Expats in Amsterdam are the first market: almost every friend group there is mixed.
- **Second group:** couples and friends where someone is from another country ("finally a game about *your* family's rules").
- **Later, not in the pitch:** language schools, international teams, meetups. Keep the pitch a party game, not a workplace tool.

### When

At home with a drink, 3–12 people, 15–20 minutes: before dinner, between other games, or when the conversation runs dry.

### What makes it different

- **Statements, not trivia.** You don't need to know facts, only to have noticed people. Someone who has lived in a country for two months can still play.
- **Every answer teaches something.** The note after each reveal explains why, so wrong answers are fun too.
- **Starts in 30 seconds.** No app, no accounts. Players join by link or QR code with just a name.
- **Respectful by design.** Everyday habits, never politics, religion or rankings. Nobody is the punchline.
- **Free and private.** No ads, no cookies, no personal data.

Nearby alternatives: Kahoot (quiz-shaped, not social at home), Jackbox (paid, needs a shared screen, no cultural angle), travel trivia apps (test facts, not shared lives). None sit in "mixed group, everyday habits, learn something".

### Tone of voice

- **Warm and curious, not snarky.** Laugh with a country, never at it.
- **Friendly, not snobbish.** Short sentences, everyday words, a wink rather than a punchline.
- **Confident about habits, humble about people:** "most associated with", never "all Dutch people".

| ✅ Like this                                                                       | ❌ Not like this                    |
| ---------------------------------------------------------------------------------- | ----------------------------------- |
| "Gezellig is less a word than a mood. Now you know why they light candles in the daytime." | "Classic Dutch, being stingy again 😂" |

**Use:** habits, countries, "where is this most typical?", guess, learn, home.
**Avoid:** clash, culture war, stereotypes, "real" Dutch/Polish, "only", "all".

## 4. Brand basics

Built from the app's HeroUI "Rabbit" dark theme (`src/index.css`): background `#090504`, card `#211512`, primary orange `#ff4d06` (oklch 0.6678 0.2232 36.66, clipped to sRGB), text `#fffaf7`, muted `#ac9c97`, border `#2e2725`, font Geist.

**Tagline (home screen, under the name):** Guess whose habit it is.

### Icon

A white speech bubble with a dark question mark on Rabbit orange: "guess" plus "talking at the table". Readable at 16 px.

Files in `docs/brand/` (sources are SVG; PNGs rendered with headless Chrome):

| File                     | Use                                                         |
| ------------------------ | ----------------------------------------------------------- |
| `icon.svg`               | `public/favicon.svg` (replaces Vite's logo)                 |
| `favicon-32.png`         | PNG fallback favicon                                        |
| `apple-touch-icon.png`   | 180×180, full-bleed (iOS rounds the corners itself)         |
| `icon-192.png`, `icon-512.png` | Web app manifest icons                                |
| `icon-maskable.svg`, `icon-maskable-512.png` | Manifest icon with `"purpose": "maskable"` |

### Share preview (WhatsApp, iMessage, Telegram, LinkedIn)

`docs/brand/og-image.png` (1200×630, ~95 KB; WhatsApp needs under 600 KB). Source: `og-image.html` (self-contained; flags from country-flag-icons, MIT). The sample statement is the draft `pl-012`; swap it if that statement changes in review.

Meta tags for `index.html`. `og:image` and `og:url` must be absolute URLs, so use the workers.dev URL until whosehabits.com is connected, then switch:

```html
<title>Whose Habits: guess whose habit it is</title>
<meta name="description" content="A party game about the little habits that make every country feel like home. No app, no sign-up, just your phones." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Whose Habits" />
<meta property="og:title" content="Whose Habits: guess whose habit it is" />
<meta property="og:description" content="A party game about the little habits that make every country feel like home. No app, no sign-up, just your phones." />
<meta property="og:url" content="https://whosehabits.com/" />
<meta property="og:image" content="https://whosehabits.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Whose Habits: a statement card with six country flags to choose from." />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

`manifest.webmanifest`: `name` "Whose Habits", `short_name` "Whose Habits", `background_color` and `theme_color` `#090504`, `display` "standalone", icons 192, 512 and maskable 512.

WhatsApp caches a link's preview for a long time. Test with a fresh URL (add `?v=2`) after changing tags.

### Copy in the app

| Where                         | Now                                                                   | New                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `HomeScreen.tsx`, `GuestRoom.tsx` headings | Culture Clash                                            | Whose Habits (home adds the tagline below)                                                                  |
| `QrShare.tsx` share title     | Join my Culture Clash game                                            | Join my Whose Habits game                                                                                   |
| `FinalView.tsx` share         | Culture Clash / "A party game: guess which culture each statement fits. Free, no app needed." | Whose Habits / "A party game about the little habits that make every country feel like home. Free, no app, no sign-up." |
| Setup and question wording    | cultures                                                              | countries; "Where is this most typical?" (section 2)                                                        |

## 5. Palette and font experiment (2026-10-21)

Testing in the UI polish chat: **orchid** accent and **Bricolage Grotesque**, to replace Rabbit orange and Geist. Not final; the icon and share image stay orange until it's confirmed.

- Why violet: the six flags use red, white, blue, yellow and green. Orange blends with the PL, MX and US reds on the selected-country ring; violet appears in no flag and stays apart from green "Correct" and red "wrong".
- Why orchid over electric violet: more playful and distinctive (electric violet sits near Twitch and generic tech purples).
- Dark: primary `oklch(0.68 0.24 318)` `#d358f5` with **dark** button text (6.1:1; white is only 3.2:1); background `#0c070d`, card `#1d1520`, neutrals tinted to hue 318.
- Light: primary `oklch(0.55 0.25 318)` `#aa1dcc` with white text (5.6:1).
- Celebration only (scores, final screen): warm yellow `#fdc436`.
- Mockups: `docs/brand/palette-options.png` (today vs four violets), `docs/brand/palette-c-e-dark-light.png`.

## 6. Content note (lander, 2026-10-22)

Short and honest, near the sample cards and as a FAQ entry; no banner or pop-up. Don't write "we don't intend to offend" (defensive, plants the idea): say what we do instead.

> **How we write the habits**
> These are playful generalisations, not rules about people: plenty of Brazilians have never clapped at a gate. We use AI to research and polish the first drafts, and a person checks each one before it goes in. Spotted one that's wrong or feels unfair? Tap Report in the game and we'll fix it.

Only claim the human check if every statement is really reviewed before it ships; otherwise end with "…and we keep improving them with your reports."

> **Are the habits true for everyone?**
> No. Each one is a habit people most associate with a country, not something everyone there does. We research the statements with AI, check each one by hand, and leave out politics, religion and anything that ranks countries. If a habit feels wrong or unfair, tap Report on that question: your feedback is how the game gets better.
