# Search and AI crawlers

What the build gives crawlers, and the steps that have to be done by hand in Cloudflare, Google and Bing.

## What is indexable

Only `/` is indexable: the prerendered lander. Everything else is kept out of results:

| Path           | Status | Kept out by                                                                        |
| -------------- | ------ | ---------------------------------------------------------------------------------- |
| `/`            | 200    | (indexable) canonical, robots meta, JSON-LD                                        |
| `/new`         | 200    | `X-Robots-Tag: noindex` (worker/routes.ts)                                         |
| `/r/<room>`    | 200    | `X-Robots-Tag: noindex, nofollow`, no-referrer (worker/routes.ts, public/_headers) |
| `/app` (shell) | 200    | `X-Robots-Tag: noindex` (public/_headers)                                          |
| `/llms.txt`    | 200    | `X-Robots-Tag: noindex`: it repeats the lander, so it shouldn't compete with it    |
| unknown pages  | 404    | the status                                                                         |
| `/api/*`       |        | `Disallow` in robots.txt                                                           |
| stats Worker   |        | Cloudflare Access, plus `noindex` header and meta (stats/)                         |

`/r/` and `/new` are deliberately **not** disallowed in robots.txt. A crawler that's not allowed to fetch a page can't see its `noindex`. The URL could then still show up in results with no snippet.

Every absolute URL comes from `VITE_SITE_URL` (`src/lander/site.ts`): canonical, `og:url`, `og:image`, JSON-LD, sitemap, robots and llms.txt. `scripts/check-dist.ts` fails the build if the prerender, robots or llms.txt break.

## AI crawlers

`robots.txt` allows every crawler, AI crawlers included, and names the main ones (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot) so the choice is explicit.

Why allow them:

- The point of the page is to be found and recommended, including when someone asks an assistant for "a party game for international friends".
- The page is marketing copy; nothing on it is private.
- Training crawlers (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot) are what make the game known to future models. Search and user crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot, the `-User` agents) are what make assistants cite the page today.
- Google-Extended only controls Gemini training and grounding. It has no effect on Google Search ranking either way.

`/llms.txt` is the lander as plain Markdown: summary, facts, how to play, example habits, FAQ and links. It's built from `src/lander/content.ts`, so it can't drift from the page. No major assistant has said it reads llms.txt, so treat it as a cheap extra, not a ranking factor. There is no `llms-full.txt`: the site is one page, so llms.txt already holds all of it.

## Structured data

The JSON-LD has `WebSite`, `VideoGame` (free, 2–12 players, browser, author with LinkedIn) and `FAQPage`. Since 2023 Google shows FAQ rich results only for government and health sites, so don't expect FAQ dropdowns in Search. The data still helps Google, Bing and assistants understand the page. Test it with the Rich Results Test and the Schema Markup Validator (below).

## Manual steps (Ruslan)

Do these once https://www.whosehabits.com serves the new build with `VITE_SITE_URL=https://www.whosehabits.com`.

### 1. Cloudflare: don't block the AI crawlers

New Cloudflare zones block AI crawlers by default, and this would quietly override the robots.txt above.

1. Cloudflare dashboard → whosehabits.com → **AI Crawl Control** (older dashboards: Security → Bots).
2. Turn off **Block AI bots** / set the crawlers to **Allow**.
3. Turn off **Managed robots.txt** (Cloudflare's content-signals robots.txt), so the site's own robots.txt is served as is.
4. Leave **Bot Fight Mode** off. It can challenge crawlers that aren't on Cloudflare's verified list.
5. Check: `https://www.whosehabits.com/robots.txt` should match `dist/robots.txt` exactly.

### 2. Google Search Console

1. Go to https://search.google.com/search-console → **Add property** → **Domain** → `whosehabits.com`. A Domain property covers www, the apex and http/https.
2. Google shows a TXT record (`google-site-verification=…`). Cloudflare → whosehabits.com → **DNS** → **Add record**: Type `TXT`, Name `@`, Content the whole string, TTL Auto → Save.
3. Back in Search Console, click **Verify**. It usually works within minutes; DNS can take up to an hour.
4. **Sitemaps** → enter `https://www.whosehabits.com/sitemap.xml` → Submit. The status should turn "Success".
5. **URL inspection** → `https://www.whosehabits.com/` → **Test live URL**. Check "URL is available to Google", then **View tested page** → Screenshot and HTML. The HTML should hold the full lander. Then click **Request indexing**.
6. Optional: inspect `https://www.whosehabits.com/r/test-test-test`. It should say "Excluded by noindex".
7. After a few days, **Pages** should show `/` indexed. The apex and workers.dev URLs show up as "Page with redirect", which is expected.

### 3. Bing Webmaster Tools (also feeds DuckDuckGo, Yahoo and ChatGPT search)

1. Go to https://www.bing.com/webmasters → sign in → **Import from Google Search Console**. This copies the verified site and the sitemap in one go. Or add the site by hand and verify with a DNS record, the same way as Google.
2. **Sitemaps**: check that `https://www.whosehabits.com/sitemap.xml` is listed, and submit it if not.
3. **URL Inspection** → `/` → **Request indexing**.
4. Optional: **Settings → IndexNow** isn't needed for a single page.

### 4. Check the share preview

The page has to be live on the domain first; each tool fetches the page itself.

- **LinkedIn**: https://www.linkedin.com/post-inspector/ → paste `https://www.whosehabits.com/` → Inspect. This also refreshes LinkedIn's cache.
- **Facebook / WhatsApp**: https://developers.facebook.com/tools/debug/ → paste → **Debug**, then **Scrape again** if it shows an old preview. WhatsApp uses the same tags but caches per chat, so test in a new chat.
- **X**: paste the link into a draft post; the card shows in the composer.
- **Telegram**: send the link to yourself. If the preview is stale, send `@WebpageBot` the URL to refresh it.
- **Structured data**: https://search.google.com/test/rich-results and https://validator.schema.org with the live URL. There should be no errors. "No rich results detected" for the FAQ is expected (see above).
- Every preview should show the title "Whose Habits: guess whose habit it is", the og-image and the www URL.

### 5. Later, if the copy changes

The title and description are in `index.html` (shared with room links) and `src/lander/site.ts` (JSON-LD and llms.txt). Change both together. The FAQ, steps and samples are in `src/lander/content.ts` and update the page, JSON-LD and llms.txt at once. After a big change, request indexing again in Search Console.
