# Landing page plan

The public one-pager at `/`. It replaces the temporary HomeScreen and is the way into the game.
Status: **built 2026-10-20** (agreed plan below; decisions in section 7). Lighthouse mobile after the first feedback round: 96 / 100 / 100 / 100.

## 1. Goals

- Someone who hears "let's play Whose Habits" lands here, gets the idea in five seconds and taps
  **Host a game**, or types the code a friend read out.
- Crawlers and link previews (WhatsApp, LinkedIn, iMessage) get real HTML, not an empty `<div id="root">`.
- It's a portfolio piece too, so it should look good on a laptop, not only a phone.
- The game routes (`/new`, `/r/:code`, `/dev`) keep working exactly as now.

## 2. Rendering approach

Today: Vite SPA, `createBrowserRouter`, Cloudflare Worker serving `dist/` as static assets with
`not_found_handling = "single-page-application"` (every unknown path gets `index.html`).

### Options

|                     | A. Own prerender script (react-dom/server)                                                                                                                                   | B. React Router framework mode, `prerender: ['/']`                                                                                   | C. Headless-browser snapshot (Puppeteer, vite-prerender-plugin and the like) |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| How                 | After `vite build`, a small Node script builds an SSR bundle of the lander, renders it with `react-dom/server` and writes it into `dist/index.html`. The client hydrates it. | Switch from library mode (`createBrowserRouter`) to the React Router Vite plugin with `routes.ts`, `ssr: false`, `prerender: ['/']`. | Build the SPA, open `/` in headless Chrome, save the DOM.                    |
| New dependencies    | None (react-dom/server, Vite SSR build are already there)                                                                                                                    | `@react-router/dev`, a new app structure                                                                                             | Puppeteer/Chromium (~150 MB), or a plugin that may lag Vite 8                |
| Touches game routes | No, only the entry point and router setup                                                                                                                                    | Yes: every route moves to a route module; HostRoom/GuestRoom plumbing changes                                                        | No                                                                           |
| CI cost             | A second, small Vite build (seconds)                                                                                                                                         | Same as today                                                                                                                        | Downloads a browser on every CI run                                          |
| Risk                | We own ~60 lines of build glue                                                                                                                                               | Big migration for one static page; touches files owned by the UI session                                                             | Flaky; the snapshot can bake in client-only state (theme, saved rooms)       |

**Recommendation: A.** It's the smallest change that gives real HTML, has no new dependencies, and
leaves the game code alone. B is the "proper" framework answer but is a migration of the whole app
for one page; worth it only if we later want many content pages (country pages, a blog).

### How A works

1. **Two HTML files in `dist/`.**
   - `dist/index.html`: the prerendered lander (served at `/`), with canonical, JSON-LD and the full page markup.
   - `dist/app.html`: today's empty shell, for every game route. It keeps the OG tags, so room links
     shared in WhatsApp still get the preview card.
2. **Build.** `npm run build` gains one step after `vite build`: `node scripts/prerender.ts`
   - `vite build --ssr src/lander/entry-server.tsx --outDir dist-ssr` (lander only, no Supabase, no game code);
   - import it, `renderToString(<Lander />)`, put the result into `<div id="root">` of a copy of the
     built `index.html`, add the head tags (section 4), write `dist/index.html`;
   - write the untouched shell as `dist/app.html`, and generate `dist/sitemap.xml` and `dist/robots.txt`.
3. **Client.** `main.tsx` checks `#root`: if it has children (the prerendered lander) it calls
   `hydrateRoot`, otherwise `createRoot` as today. Both render the same `RouterProvider`.
   The game screens become `lazy` routes, so the lander's JS doesn't carry Supabase, the engine and
   the game screens. (Route paths and behaviour don't change.)
4. **Worker / assets.** The SPA fallback would serve the lander's HTML on `/r/...`, so it changes:
   - `wrangler.toml`: `not_found_handling = "none"`. Requests that match no file reach the Worker.
   - `worker/index.ts`: for `GET` navigations, `/new` and `/r/*` get `app.html` (200); `/join?code=…`
     redirects to `/r/<code>` (the no-JS join form, see 3.1); anything else gets `app.html` with
     **status 404**, so unknown URLs stop being soft 404s.
   - The Worker adds `X-Robots-Tag: noindex, nofollow` and `Referrer-Policy: no-referrer` to `/r/*`
     itself, because `_headers` rules match the asset path (`/app`), not the original URL.
     `_headers` keeps them too, as a backstop.
5. **Dev.** `vite` serves the shell for every path and the lander renders client-side, as now.
   `npm run build && npm run preview` (or `dev:api`) shows the real prerendered page.
6. **Hydration rules for the lander.** Nothing that reads `localStorage`, `window` or the theme
   renders on the first pass:
   - "Back to your game" (`listSavedRooms`) and the theme toggle appear after mount (`useEffect`);
   - the theme is already set on `<html>` by the inline script in `index.html`, so no flash and no mismatch;
   - `src/lib/theme.ts` touches `window` when imported, so the server entry must not import it
     (the lander gets the theme hook only on the client).

## 3. Sections

Mobile-first, single column on phones. From `md` up: wider container (`max-w-5xl`), hero in two
columns (text left, a sample question card right), steps and benefits in a row.
Landmarks: `header` (logo + theme toggle), `main` with one `h1` and an `h2` per section, `footer`.

### 3.1 Hero

- `h1` **Whose Habits**, subline "Guess whose habit it is." and one sentence:
  "A free party game for international friends: read an everyday habit, guess which country it's from. One phone each."
- Primary button **Host a game** → `/new` (orange, `size="xl"`).
- **Back to your game** card, above the buttons, when `listSavedRooms()` has an unfinished room
  (same as HomeScreen today: up to 2, host or guest label). Client-only.
- **Join with a code** (secondary). UX:
  - A secondary button "Join with a code" opens an inline form right below it (no modal):
    one text input labelled "Room code", placeholder `k7m2-x9qp-4tdv`, `autocapitalize="off"`,
    `autocomplete="off"`, `spellcheck="false"`, `enterkeyhint="go"`, and a **Join** button.
  - Accepts any case, spaces or no dashes (`normalizeRoomCode` already does this), and also a pasted
    full link (takes what comes after `/r/`).
  - Wrong length or letters: inline error under the field, linked with `aria-describedby`:
    "That code doesn't look right. It's 12 letters and numbers, like k7m2-x9qp-4tdv."
  - Valid: navigate to `/r/<code>`. A code for a room that doesn't exist lands on GuestRoom's
    existing "not found" state, so nothing new is needed there.
  - Without JS: the form is a plain `<form action="/join" method="get">` that is open by default
    (JS collapses it on hydrate); the Worker normalises the code and redirects.
  - Helper text: "Got a link or QR code from a friend? Just open it."
- **Game-side change needed (UI session, ask first):** today the lobby only shows the full URL under
  the QR code. For codes read out loud, `QrShare` (or LobbyView) should show the code on its own
  line, large and `tabular-nums`, e.g. "Room code: k7m2-x9qp-4tdv", maybe with a "Copy code" button.
  Twelve characters is fine to type "in a pinch" (as `roomCode.ts` says) but not lovely: the lander
  form treats the code as the fallback and links/QR stay the main way in.
- Hero visual: a static sample question card (statement text + 4 country buttons with flags),
  built from `Flag` and the card/button styles. `aria-hidden` is not used: it's a labelled figure
  ("Example question"), but the buttons in it are not interactive (plain spans).

### 3.2 How to play (3 steps)

Numbered list (`ol`), each with a Lucide icon:

1. **Host a game.** Pick the countries and the number of rounds. (Icon: `Settings2`)
2. **Friends join.** They scan the QR code or open the link on their own phone. (Icon: `QrCode`)
3. **Guess and score.** Read the habit, pick the country, see who knew. Fastest right answers get a bonus. (Icon: `Trophy`)

Copy to be checked against the actual scoring before writing.

### 3.3 Why it's different

Five short items in a grid, each an icon + a few words:

- **Free.** No ads, no paywall.
- **No app.** Runs in the browser on any phone.
- **No sign-up.** Type a name, that's it.
- **10 countries.** Poland, Ukraine, the Netherlands, Brazil, Mexico, the United States, Türkiye,
  Italy, France and South Korea (with flags; list from `CULTURES`, so it stays in sync).
- **2–12 players.** From `MIN_PLAYERS_TO_START` and `MAX_PLAYERS`.

### 3.4 Sample statements

Three cards, read from `STATEMENTS` by id at build time (text never copied by hand), each with a
**Show answer** toggle (`<details>/<summary>`, works without JS) revealing the flag(s), country name
and the note. Candidates, chosen for being fun, safe under CONTENT_RULES and covering 3 regions:

- `nl-038` "The lock on a bike is often worth more than the bike itself." → the Netherlands
- `br-001` "Arriving 30 minutes late to a house party is normal…" → Brazil and Mexico (shows that one habit can fit several countries)
- `kr-013` "Couples celebrate their 100th day together…" → South Korea

All three are still `draft` in the CSV: please confirm them, or name others. A unit test fails the
build if an id disappears.

### 3.5 FAQ

`h2` + a list of `<details>` items, plus `FAQPage` JSON-LD generated from the **same array**, so the
two can't drift. Draft questions:

- Is it really free? Yes, no ads, no in-app purchases.
- Do we need to download an app or sign up? No.
- Does everyone need a phone? Yes, one each, including the host.
- How many people can play? 2 to 12.
- Can we play over a video call? Yes, share the link in the chat. (to verify: nothing in the game needs the same room)
- Which countries are in it? The ten above; more are planned.
- Can a habit belong to more than one country? Yes, then every right country counts. (to verify against scoring)
- Isn't this about stereotypes? We stay away from politics, religion, appearance and clichés; it's about small everyday things (from CONTENT_RULES).
- What language is it in? English, for now.

### 3.6 About the maker

Two or three sentences, first person, plus one link. Draft:
"Hi, I'm Ruslan, a product person in Amsterdam. I made Whose Habits for game nights with friends
from all over, where the best stories start with 'wait, you do that too?'."
Link: LinkedIn.

### 3.7 Footer

- **Privacy** (short paragraph, can open a `<details>` with the full list). What actually happens,
  from `src/lib/analytics.ts`, `src/lib/events.ts` and the realtime code:
  - No cookies, no ads, no tracking scripts, no third-party analytics.
  - The game sends a few anonymous game events to our own server (Cloudflare D1): a game started
    (number of players, countries, rounds, seconds per question, replay or not), a game finished
    (rounds played, players at start and end, ended early), the play-again vote, clicks on Share and
    "Host your own game", and a reported statement's id. Each carries a random game id.
    **No names, no player ids, no IP addresses are stored.** The lander itself sends nothing.
  - Names you type travel to the other players in the room through Supabase Realtime while you
    play; they aren't stored on a server.
  - Your phone keeps your theme choice and rooms you can rejoin in `localStorage` (rooms expire after 12 hours).
  - Hosting: Cloudflare serves the site and, like any web host, sees IP addresses to deliver pages.
  - Wording aimed at an EU visitor: what, why (to see if people enjoy the game and which settings
    work), no profiling, contact for questions. Supabase runs in the EU (Ireland).
- **Feedback / contact:** feedback@whosehabits.com (also for reports and privacy questions).
- **Credits:** HeroUI components (MIT), country-flag-icons (MIT), Lucide icons (ISC), Bricolage Grotesque font (OFL).
  Each name links to its project.
- © 2026 Ruslan Pirus (or no copyright line; your call).

## 4. SEO

All absolute URLs come from **one constant**, `SITE_URL` (env `VITE_SITE_URL`, default
`https://culture-clash.ruslan-pirus.workers.dev`). Switching to `https://whosehabits.com` is a
one-line change; it updates canonical, og:url, og:image, sitemap, robots and JSON-LD at once.
(`index.html`'s hard-coded og:url/og:image also move to this constant.)

- **Title** (≤ 60 chars): `Whose Habits: a free party game for international friends`
- **Description** (≤ 155): "Guess which country an everyday habit comes from. A free culture quiz
  for expat game nights and international friends. No app, no sign-up, one phone each."
- `<link rel="canonical" href="{SITE_URL}/">` on the lander only. Game routes get none and keep
  `noindex` on `/r/*`.
- Open Graph and Twitter: as in `index.html` today, plus `og:locale=en`, `twitter:title`,
  `twitter:description`, `twitter:image`.
- `robots.txt`: allow all, `Disallow: /api/` and `/stats`, `Sitemap: {SITE_URL}/sitemap.xml`.
  `/r/` is **not** disallowed: crawlers must be able to fetch it to see `noindex`.
- `sitemap.xml`: just `/`, with `lastmod` = build date.
- JSON-LD (one `@graph` in the lander's head):
  - `WebSite` (name, url, inLanguage `en`);
  - `VideoGame` (name, description, url, image, genre `["Party game", "Trivia"]`, `gamePlatform`
    "Web browser", `playMode` "MultiPlayer", `numberOfPlayers` 2–12, `offers` price 0 EUR,
    `author` Person Ruslan Pirus, `inLanguage` en);
  - `FAQPage` from the FAQ array.
- **Keyword angle**, worked into headings and copy naturally (no stuffing): _expat game night_,
  _party game for international friends_, _culture quiz_, _guess the country_, _game night with
  friends from different countries_, _no app party game_. The FAQ and "Why it's different" carry
  most of the long-tail terms.
- Later, once the domain is live: Google Search Console + submit sitemap.

## 5. Quality targets and how they're checked

| Target                                                                     | How                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse 95+ on Performance, Accessibility, Best Practices, SEO (mobile) | Run once locally with `npx lighthouse` against `npm run preview` (needs Chrome on this machine), report saved in the PR. Perf levers: prerendered HTML, lazy game routes, preloaded font woff2, no images above the fold apart from inline SVG flags.       |
| WCAG 2.2 AA                                                                | axe-core run in the browser pane on the built page, both themes; manual pass: focus order, visible focus, 24×24 px targets (2.5.8), contrast of muted text and orange on both backgrounds, `lang="en"`, skip link.                                          |
| Semantic structure                                                         | One `h1`, `h2` per section, `header`/`main`/`footer`, lists for steps and FAQ.                                                                                                                                                                              |
| Works without JS                                                           | Everything is in the HTML; FAQ and answers use `<details>`; join form posts to `/join`. Checked with JS disabled.                                                                                                                                           |
| Reduced motion                                                             | Only `motion-safe:` animations (from `src/lib/motion.ts`); no scroll-jacking.                                                                                                                                                                               |
| Light and dark                                                             | Uses the existing tokens only; checked at 375 px in both.                                                                                                                                                                                                   |
| Prerender didn't silently break                                            | `scripts/check-dist.ts`, run at the end of `npm run build` (so CI runs it): `dist/index.html` contains the `h1`, the FAQ JSON-LD and the canonical; `dist/app.html` has an empty `#root`; `sitemap.xml`/`robots.txt` exist; the sample statement ids exist. |
| Worker routing                                                             | Unit tests for the new routing function (`/` untouched, `/new`, `/r/x` → shell, `/join?code=` → redirect, unknown → 404, `/r/*` headers).                                                                                                                   |

Lighthouse/axe in CI would need a browser download on every run; I'd leave that out and offer it as
a follow-up.

## 6. Files

New: `src/lander/` (`Lander.tsx`, sections, `content.ts` with FAQ/steps/sample ids, `entry-server.tsx`,
`JoinWithCode.tsx`), `scripts/prerender.ts`, `scripts/check-dist.ts`, tests.
Changed: `src/main.tsx` (hydrate vs create), `src/router.tsx` (`/` → Lander, game routes `lazy`),
`index.html` (title/description, `SITE_URL` placeholders), `worker/index.ts`, `wrangler.toml`,
`package.json` (build script), `public/_headers` comment.
Removed: `src/screens/HomeScreen.tsx` (its rejoin list moves to the lander).
Not touched: `src/screens/room/*`, SettingsScreen, game components, AppBar/menus, theme tokens in
`index.css`. The lander reuses `Button`, `Card`, `Badge`, `Flag`, `ThemeSwitcher`.

## 7. Decisions (2026-10-20)

1. Rendering: option A. Revisit B (React Router framework mode) if we add more content pages.
2. Join with a code: inline form on the lander, and the UI session is asked to show the room code as
   text in the lobby.
3. Sample statements: nl-038, br-001, kr-013.
4. About links to LinkedIn (https://www.linkedin.com/in/ruslanpirus/) only. Email: feedback@whosehabits.com
   (footer, privacy note, FAQ). It only works once the domain is bought and its email routing is set up.
5. Supabase runs in eu-west-1 (Ireland), so the privacy note says game traffic stays in the EU.

## 8. Feedback round 1 (2026-10-20)

- Hero: the Join button sits inside the code field (one pill). Host button and pill share one width:
  full width on phones, 18rem on desktop. Phones get an illustration above the H1 (src/lander/art.tsx,
  inline SVG coloured by --art-* variables in src/lander/lander.css); desktop keeps the example question.
- How to play: small step illustrations instead of icons; dotted band behind the section.
- Why it's different: one benefit per row on phones; more space between the three parts; countries
  sorted A–Z (the Netherlands under N) with a "More coming" chip. Phones: a slowly drifting, swipeable
  row with a Pause button (WCAG 2.2.2), no drift with reduced motion; desktop keeps the wrapped chips.
- Try a few: flip cards on all screens (both faces in one grid cell, so heights never change); the
  hidden face is inert and focus follows the flip; no JS shows both faces. Band with faint question marks.
- FAQ: a "how can I report a statement" entry; 60% wide and centred on desktop.
- About: LinkedIn only.

## 9. Feedback round 2 (2026-10-20)

- Phone hero illustration removed; the maker will draw one in Figma and it goes back above the H1.
- One "Back to the last game" link (tertiary, under the Host button) instead of a list of rooms.
- Host button and join pill: 21rem on desktop, so the hint fits on one line.
- Hero paragraph and section intros at 16px (3 lines on desktop, 4 on phones for the hero).
- Harder examples (obviousness 3): hero br-010 (options MX, BR, IT, TR); samples nl-017, tr-022, br-027.
- Step pictures are plain SVG files in src/lander/art/ (hex colours, open in Figma); the page
  imports them, so editing a file is enough. The same file shows in both themes.
- "Countries in the game"; footer order: Theme, Privacy, Credits (two columns on desktop), feedback
  and copyright. The Theme legend has the same style as the Privacy and Credits headings.

## 10. Polish round (2026-10-22)

- About: "Do you like what I do? Buy me a coffee" (https://buymeacoffee.com/ruslan.p) under the
  LinkedIn link. A plain link that opens in a new tab: no widget script, so the page still loads
  nothing from other sites.
- Hero example question: on phones it is 15% smaller and nudged 1% left, since the 3D tilt made it
  look off-centre. Dark mode replaces its shadow with a soft sunflower glow; light mode keeps the shadow.
- Step pictures move: a small CSS animation inside each SVG's own `<style>`, so there's no script and
  no extra request. They stay still with reduced motion. Don't write a literal tag such as `<img>` in
  those comments: the file is XML and won't load.
- Spacing: the title and intro sit closer together, with more space before the section content; H1 and
  tagline form one unit; more room around the step pictures; a little more space under the header.
- Footer theme switcher: full width on phones.
- About: the maker's photo (src/lander/art/maker.webp, 256 px, 10 KB), above the text on phones and beside it
  on desktop. Lazy-loaded.
