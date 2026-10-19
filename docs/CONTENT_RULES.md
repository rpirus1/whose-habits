# Content rules

Statements are the product. A good one makes the table argue for ten seconds and the note makes everyone learn something, including the people who got it wrong.

## Target for launch

- 6 cultures × 30 statements = 180 (PL, UA, NL, BR, MX, US)
- Per culture, roughly: 10 × obviousness 1, 12 × obviousness 2, 8 × obviousness 3
- Spread across all six topics, at least 3 per topic per culture

## A good statement

- Describes a **behaviour, habit or phrase** that people from that culture recognise from daily life.
- Is **most associated with** one culture, not exclusive to it. Never write "only" or "all".
- Can be read on a phone in about 5 seconds: **max 160 characters**, ideally under 110.
- Doesn't name the country, language or a giveaway word (avoid "gefeliciteerd" in the text; put it in the note).
- Is written for an international group: no untranslated jargon in the text.

## A good note

- One line, max 200 characters.
- Explains **why** or **where it comes from**, or gives the local word. It should teach something even to someone who answered correctly.

## Topics (`topic` column)

| key        | covers                                      |
| ---------- | ------------------------------------------- |
| `daily`    | routines, shops, transport, home habits     |
| `hosting`  | visiting, guests, parties, being a guest    |
| `family`   | birthdays, holidays, rituals, generations   |
| `humour`   | humour and small talk                       |
| `work`     | work etiquette, meetings, colleagues        |
| `language` | phrases, expressions, ways of saying things |

## Off limits

Politics, war, religion, ethnicity, bodies and appearance, alcohol stereotypes, and anything that ranks cultures or says one is better or worse. Also avoid flags, national food clichés and famous landmarks: they're too easy and they aren't what people actually live.

## Ambiguity: the `fits` column

List **every** culture in the six that the statement reasonably fits, e.g. `PL UA` for house slippers for guests. A game uses a statement only if exactly one of the selected cultures is in `fits`. So with `PL UA`, the statement appears in a Poland + Brazil game but never in a Poland + Ukraine game. When in doubt, add the culture: a statement that's held back loses less than a dispute at the table.

## Obviousness

- **1:** most people in a mixed group would guess it.
- **2:** people who've lived there or have friends from there would know.
- **3:** insiders only, a fun surprise at the reveal.

## Review workflow

1. Claude drafts rows in `content/statements.csv` with `reviewed` left empty.
2. Import the CSV into Google Sheets and give each reviewer a filtered view of their culture.
3. The reviewer fixes the wording or note, adjusts `fits` and `obviousness`, adds their name in `reviewer`, puts remarks in `comments`, and writes `yes` in `reviewed`. Rows they reject: delete them (never reuse the id).
4. Export the sheet as CSV (UTF-8) over `content/statements.csv` and run `npm run content`. Errors name the row to fix.
5. Launch builds use `ONLY_REVIEWED=1`, so only approved rows ship.

## Report button

Players can report a statement at the reveal. Only the statement id is logged. Review reports before each content update.
