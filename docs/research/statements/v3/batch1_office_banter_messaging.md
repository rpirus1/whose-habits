# Batch 1 research notes: office, banter, messaging

48 rows in `batch1_office_banter_messaging.csv` (no header). Sources were opened with a fetch unless marked "search only". Several sites returned 403/404 on re-check; those rows are marked.

Per country: PL 4, UA 4, NL 6, BR 6, MX 5, US 6, TR 2, IT 4, FR 4, KR 7. One row is AI-generated (us "I'm good"). Obviousness mix: 5 x 1, 19 x 2, 24 x 3 (skews to 3; these themes are mostly insider detail).

## Office (work)

- PL: leave on demand, 4 days (zielonalinia.gov.pl, opened; courts allow refusal in rare abuse/harm cases). Saturday holiday gives a replacement day (poradnikprzedsiebiorcy.pl, opened; contract workers excluded).
- UA: pay at least twice a month, max 16 days apart (kadroland.com, opened). The "advance" label is practice, not a legal term. MX added to fits because of `mx-029` quincena (guess).
- NL: first names with the boss (welcometothejungle.com, opened). Christmas hamper (hrpraktijk.nl, opened: about 7.4M employees, avg EUR 45). Italian side is thin (commercial pages only, search only), so `IT` in fits is a guess.
- BR/MX/NL leave bonus: Brazil one-third (brazilcounsel.com, opened); Mexico 25% prima vacacional (expansion.mx, search only); Dutch vakantiegeld not tied to taking leave, so NL fit is loose. Overlaps `nl-048`, `mx-027`, `br-028` in theme but not in habit.
- BR: bolão (moneytimes.com.br, opened; the page says friends, coworkers or relatives). US office-pool fit is a guess.
- MX: holidays moved to Monday (mexperience.com, opened, still current in 2026). US fit from general knowledge. Posada (pluxee.mx, opened; religious origin, secular office party only; flag). "Ponerse la camiseta" (factorial.mx, opened; the Brazilian "vestir a camisa" is NOT sourced).
- US: "per my last email" (thesector.com.au, opened; Preply survey of 1,000). Employer health insurance (Wikipedia for the ~60% figure; open-enrollment timing from search summaries, NerdWallet/Gusto/Investopedia blocked). Casual Friday (mentalfloss.com, opened).
- TR: no office row. Searches found only generic etiquette guides; existing rows (tr-045 to tr-050) already cover the best material. Nothing verifiable and new.
- IT: coffee treat (fastitalianlearning.com, opened). The page covers "offro io" but not rotation; may overlap `tr-015` and `it-040`.
- FR: RTT (connexionfrance.com, opened). Right to disconnect (thelocal.fr, opened; it is a duty to negotiate and rarely enforced; the Italian equivalent is from memory).
- KR: iced coffee after lunch (koreatimes.co.kr, opened). Second round of a team dinner (expatguidekorea.com, opened; mentions a bar or karaoke; alcohol-adjacent).
- UA office: no row. Searches gave only generic guides, and pooled-gift ideas are already covered by `br-024`, `us-029`, `nl-028`.

## Banter (humour / language)

- PL: "don't praise the day before sunset" (blogs.transparent.com/polish/?p=4560, opened; the wprost.pl quiz lists it too but returns 403). The Ukrainian equivalent in fits is unsourced.
- UA: "ni pukha, ni pera" and the "do bisa" reply (glavred.net, opened; a hunting superstition). Davai (ukrainianlessons.com, opened; shared with neighbouring languages).
- NL: head above the field (delta.tudelft.nl, opened). Oudejaarsconference (learndutch.org, opened; 1954 date from a search summary; the genre is political satire, so flag against the politics rule).
- BR: zoeira (opovo.com.br column, opened; the meme sense came from an academic paper in search results, not opened). The football-club question was dropped: no source backed it as an opener.
- MX/TR/BR forms of address (chilango.com, opened; lists the Mexican terms only). Turkish and Brazilian terms are from general knowledge.
- US: honor-roll bumper stickers (barrypopik.com, opened). "I'm good" is AI-generated.
- IT: filler "cioè" (thelocal.it, opened).
- FR: "bof" (thelocal.fr, opened).
- KR/TR: deflecting compliments (koreanclass101.com, opened). Turkish part leans on `tr-030`.
- TR banter: no row, nothing new and verifiable.
- Reviewer suggestions for existing rows (not in the CSV):
  - `pl-020`: add `MX` to fits (Pepito is the Spanish-language "Little Johnny").
  - `br-019` (daily good-morning pictures): Turkey does the same, so `TR` may belong in fits.

## Messaging (daily / language)

- PL: BLIK (stripe.com guide, opened). A payment habit, not messaging, but fits "phones".
- UA: ")))" (en.wiktionary.org, opened). The Viber-leads row was dropped: the only survey (KMIS/thepage.ua) was blocked, and newer data (dev.ua, opened) says Telegram leads.
- NL: answering with name (blogs.transparent.com/dutch, opened). "Appen" (dutchnews.nl, opened; covers "whatsappen" only).
- BR: voice notes (olhardigital.com.br, opened; Brazil sends about 4x more voice messages than any other country). MX/IT/TR fits come from language blogs (search only). "Zap" (bahianoticias.com.br, opened). Stickers (folhabv.com.br, opened; KR half via asiatimes.com, opened).
- MX: jajaja (baselang.com, opened). The same convention exists across Spanish-speaking countries; Mexico is the only one in the ten.
- US: green bubble (loopinsight.com, opened; 87% of US teens on iPhones). A "text before calling" row was dropped: the source only supports a texting preference, and it was a UK survey.
- TR: tmm/slm/nbr (turkishclass101.com, opened). Efendim (elon.io, opened); forums disagree on how common it is. Same spirit as `mx-023`.
- IT: pronto (dailyitalianwords.com, opened). Missed ring "squillo" (thelocal.it, opened; BR/TR/MX fits are guesses).
- FR: mdr (thelocal.fr, opened).
- KR: Kakao is on about 90% of smartphones (asiatimes.com, opened; the gift-service detail is from a blocked Business of Fashion page). Unread "1" (assist-all.co.jp, opened; Japanese blog). Consonant-only chat (migaku.com, opened). Yeoboseyo (koreanclass101.com, opened; the "look here" origin is from learner guides only).

## Least certain rows

1. `ua-new` "Pay comes in two parts": the MX fit is a guess.
2. `br-new` "extra payment on top of your usual salary": the NL fit is loose.
3. `fr-new` right to disconnect: the legal nuance and the Italian half (unsourced).
4. `us-new` "I'm good": AI-generated, no source.
5. `mx-new` "company shirt": the Brazilian equivalent is unsourced.
6. `br-new` voice-note row: MX/IT/TR fits rest on blogs only.
7. `it-new` squillo: BR/TR/MX fits are guesses, and the habit is fading.
8. `nl-new` oudejaarsconference: political-satire genre, flagged against the politics rule.
