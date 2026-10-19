# Culture Clash (working title)

A phone-based party game for mixed groups. The host picks 2–6 cultures, friends join by link or QR, and everyone guesses which culture each statement fits best.

See [docs/PLAN.md](docs/PLAN.md) for the product and technical plan and [docs/CONTENT_RULES.md](docs/CONTENT_RULES.md) for how statements are written and reviewed.

## Develop

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and publishable key
npm run dev                  # also reachable from phones on the same Wi-Fi
```

| Script                            | What it does                                                              |
| --------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                     | Compile statements, start Vite                                            |
| `npm run content`                 | Validate `content/statements.csv` and write `src/content/statements.json` |
| `npm test`                        | Unit tests (Vitest)                                                       |
| `npm run build`                   | Content + type check + production build                                   |
| `npm run lint` / `npm run format` | Oxlint / Prettier                                                         |

## Editing statements

Open `content/statements.csv` in Google Sheets or Excel, edit, export as CSV (UTF-8) over the same file, then run `npm run content`. Errors point to the row number.
