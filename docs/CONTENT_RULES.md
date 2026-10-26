# Content rules

Statements are the product. A good one makes the table argue for ten seconds and the note makes everyone learn something, including the people who got it wrong.

## Target for launch

- 10 countries (PL, UA, NL, BR, MX, US, TR, IT, FR, KR), at least 50 statements each. The bank in
  `content/statements-extended.csv` has 783 (UA is the thinnest with 53, US the largest with 90).
  `content/statements.csv` is the older 500-row bank, kept for reference only: the game doesn't read it.
- Per culture, roughly: 15 × obviousness 1, 20 × obviousness 2, 15 × obviousness 3
- Spread across all 13 topics, at least 3 per topic per culture (`npm run content` lists the gaps)
- Every 2-culture pair keeps at least 30 eligible statements (`npm run content` prints the smallest pool)

## A good statement

- Describes a **behaviour, habit or phrase** that people from that culture recognise from daily life.
- Is **most associated with** one culture, not exclusive to it. Never write "only" or "all".
- Can be read on a phone in about 5 seconds: **max 160 characters**, ideally under 110.
- Doesn't name the country, language or a giveaway word (avoid "gefeliciteerd" in the text; put it in the note).
- Is written for an international group: no untranslated jargon in the text.

## A good note

- One line, max 200 characters.
- Explains **why** or **where it comes from**, or gives the local word. It should teach something even to someone who answered correctly.
- If `fits` lists more than one culture, the note must make sense whichever of them is the answer: keep it neutral, or name the local version per culture ("Polish 'obiad', Ukrainian 'obid'").

## Topics (`topic` column)

The same 13 groups for every culture, used for analytics and a future "pick topics" setting. File each statement where a player would expect to find it.

| key         | covers                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| `home`      | home life, housework, flats, neighbours, building rules                   |
| `money`     | paying, prices, tipping, banks, shopping, markets, opening hours          |
| `transport` | driving, buses, trains, cycling, streets, queues, behaviour in public     |
| `table`     | meal times, eating habits, table manners (habits, not dishes)             |
| `hosting`   | visiting, guests, being a guest, parties at home, gifts                   |
| `holidays`  | public and seasonal holidays, festivals, New Year (the custom, not faith) |
| `family`    | family roles, babies, birthdays, weddings, coming of age, couples         |
| `school`    | school, exams, graduation, university                                     |
| `work`      | offices, colleagues, meetings, leave, pay, paperwork and bureaucracy      |
| `language`  | sayings, idioms, set phrases, forms of address, texting conventions       |
| `humour`    | jokes, teasing, banter, small talk, complaining                           |
| `weather`   | weather talk, seasons, superstitions, luck, folk remedies                 |
| `leisure`   | free time, sports, hobbies, beach, outings, TV and entertainment habits   |

## Off limits

Politics, war, religion, ethnicity, bodies and appearance, alcohol stereotypes, and anything that ranks cultures or says one is better or worse. Per culture, also: Soviet and Russian comparisons (UA), Atatürk and Kurdish or Armenian topics (TR), North Korea and military service (KR), mafia (IT), crime (BR, MX). Customs on religious holidays are fine when the text describes only the secular custom; flag them for review. Also avoid flags, national food clichés and famous landmarks: they're too easy and they aren't what people actually live.

## Ambiguity: the `fits` column

List **every** culture of the ten that the statement reasonably fits, e.g. `PL UA` for house slippers for guests. A game uses a statement only if exactly one of the selected cultures is in `fits`. So with `PL UA`, the statement appears in a Poland + Brazil game but never in a Poland + Ukraine game. When in doubt, add the culture: a statement that's held back loses less than a dispute at the table.

## Sources (`source` column)

For internal use only; never shipped to players. Each row has one URL where the claim can be checked (an expat guide, a language blog, a news feature, Wikipedia as a last resort), or `AI-generated` when no verifiable source was found. Reviewers check `AI-generated` rows with extra care. Research notes behind the sources live in `docs/research/statements/`.

## Obviousness

- **1:** most people in a mixed group would guess it.
- **2:** people who've lived there or have friends from there would know.
- **3:** insiders only, a fun surprise at the reveal.

## Review workflow

1. Claude drafts rows in `content/statements-extended.csv` (the bank the game ships) with `reviewed` left empty.
2. Import the CSV into Google Sheets and give each reviewer a filtered view of their culture.
3. The reviewer fixes the wording or note, adjusts `fits` and `obviousness`, adds their name in `reviewer`, puts remarks in `comments`, and writes `yes` in `reviewed`. Rows they reject: delete them (never reuse the id).
4. Export the sheet as CSV (UTF-8) over `content/statements-extended.csv` and run `npm run content`. Errors name the row to fix.
5. `ONLY_REVIEWED=1 npm run content` builds from approved rows only. Production builds do **not** set it yet: the live game ships every row, reviewed or not, until the review is finished (201 of 783 so far: PL, UA and NL).

## Where statements live

The bank is never sent to browsers as a whole, so it can't be copied from the site in one go.

- `npm run content` (every dev start and build runs it) writes the bank to `worker/statements.json`. It's bundled into the Worker and never served as a file.
- When the host's lobby opens, their phone asks `POST /api/deck` for one game's statements: the planned rounds plus 2 spares per answer country (for Skip and all-"I don't know"). Recently played statements come last, as before. The engine plans the game from that deck, and the host's saved game keeps it, so a refresh carries on.
- The app only gets `src/content/pool.json`: each statement's `fits`, so the setup screen can count how many statements a mix of countries has.
- `/api/deck` takes 10 requests a minute per IP address and only from our own pages. Copying the bank takes dozens of decks, which shows in Workers Logs.
- `npm run build` fails if any statement's note shows up in `dist/` (except the lander's samples).
- Updating statements doesn't change: edit the CSV, run `npm run content`, push. The deploy updates the Worker's bank; games already running keep their deck. In local dev, `npm run dev` answers `/api/deck` itself (`vite.config.ts`).

## Report button

Players can report a statement at the reveal and pick a reason (incorrect, outdated, not unique, offensive). Only the statement id and the reason are logged; the private stats site lists them. Review reports before each content update.
