# Batch 2: table, milestones, sayings (draft v3)

84 rows in `batch2_table_milestones_sayings.csv`. Split by obviousness: 27 x 1, 36 x 2, 21 x 3. 9 rows are `AI-generated`. Rows are ordered by theme (table, milestones, sayings), then by country.

General caveats for the reviewer:
- Web searches returned summaries; I did not read every page in full. Wiktionary URLs returned HTTP 200. gazetasp.com.br, kizlarsoruyor.com and theculturetrip.com blocked or timed out my link check, but they appeared in search results.
- Many `fits` lists were widened on purpose (e.g. PL UA TR for bread customs). A few of those extra fits come from my own knowledge, not from the source. They are marked "from knowledge" in the row comments.
- Rows with a religious or alcohol-adjacent flavour are flagged in `comments` (bread kissing, rushnyk, "gorzko").

## Table (topic daily / hosting)
- PL/UA/TR bread: kissed when dropped (https://blogs.transparent.com/polish/polski-chleb/, Polish only). UA and TR fits from knowledge. Upside-down bread superstition is AI-generated.
- PL/UA/TR cold starters on the table first: https://en.wikipedia.org/wiki/Zakuski. A search hit linked zakuski to the Russian Empire, so the text and note say nothing about that.
- Soup before main (PL UA): only a general Wikipedia source. Kompot: https://en.wikipedia.org/wiki/Kompot.
- UA tea concentrate row was dropped (no source). PL "esencja" is dated.
- NL early dinner: https://dutchreview.com/dutch-quirks/dutch-quirk-4-eat-dinner-ridiculously-early/. Vla: https://en.wikipedia.org/wiki/Vla. Cheese slicer: Wikipedia only, "Dutch" part unverified.
- BR: palito row, MX and KR fits from knowledge. Afternoon coffee: Brazilian academic piece (periodicos.ufmg.br).
- MX: tortilla scoop (ocweekly), cena and sopa seca (sanmiguelrealestate.com; that page covers meal times, the course structure is from knowledge).
- US: zigzag (gentlemansgazette), doggy bag (Wikipedia), order edits (AI-generated).
- TR: weekend breakfast (goturkiye). Peeled fruit is AI-generated, KR fit to check.
- IT: migaku table-manners guide covers pasta as primo, cappuccino and fork-only twirling. It notes some older families used a spoon.
- FR: kitchen hours (frenchentree), goûter (Wikipedia). Baguette heel nibbling is AI-generated.
- KR: culturetrip guide. It says some people lift bowls in casual settings, and some call communal dipping rude. Reviewer should check the stew row.

## Milestones (topic family)
- PL: pasowanie na ucznia (Education News Canada report plus Polish school pages). Poprawiny from knowledge: the search did not explain it. UA fit to check.
- Right-hand wedding rings (PL UA BR TR NL): Wikipedia plus the USC folklore entry on Brazilian engagement rings. Check whether TR/BR/NL mean the engagement ring or the wedding band.
- UA/PL/TR groom "buys" the bride: Wikipedia Traditional Ukrainian wedding. TR door-blocking is from knowledge.
- "Gorzko/гірко": inyourpocket.com. Text mentions only the kiss and "toast".
- Rushnyk step: drinkteatravel.com. Church-wedding context, flag as religious.
- NL: bag on flagpole (dutchreview). Stork garden decorations (dutchreview). Copper wedding at 12.5 years: a C&A retailer page only. Denmark and Germany also mark it.
- BR: trote (academic article; paint detail not confirmed, hazing is sensitive). Comissão de formatura (Tribuna PR). Mesversário is AI-generated.
- MX: money dance (Wikipedia). Padrinos sponsors is AI-generated. Kindergarten gowns: Wikipedia Graduation, BR fit from knowledge.
- US: move-in day is AI-generated. Rehearsal dinner (Wikipedia). Yearbook (Wikipedia).
- TR: lohusa şerbeti (Wikipedia). Çeyiz (meer.com article; IT, UA, PL fits from knowledge). Diş buğdayı (yemek.com). One source says it is served to guests, not handed to neighbours, so the text says "family and neighbours are served".
- IT: notte prima degli esami (LaPresse). Diciottesimo: a CIEE blog says sweet sixteen is not celebrated, and a Dartmouth folklore informant mentions the pooled gift. The informant is a single source.
- FR: bac results day (letudiant.fr). The NL fit exists because Dutch results also come out on one day. Pièce montée (Wikipedia).
- KR: miyeok-guk (tastingtable), Coming-of-Age Day (linguasia; the kiss is described in blogs only), suneung day (Korea JoongAng Daily).
- Dropped ideas: UA graduates walking all night to dawn (not found in any source), IT naming after grandparents (mostly historical), NL stork and 12.5 anniversary are kept despite thin sourcing.

## Sayings (topic language / humour)
- PL: "z choinki się urwałeś" and "szukać wiatru w polu" are known idioms. Only a Polish school page lists the second. The first is AI-generated. A "kill me, I don't know" row was cut for lack of a source.
- UA: "надвоє баба ворожила" (Telegraf). "ні сіло, ні впало" is AI-generated. A "cow licked it off" row was cut for lack of a source.
- NL: pijpenstelen and appeltje-eitje (dutchreview bizarre idioms). Alsjeblieft handing (understandingdutch). TR and IT fits (buyurun, prego) from knowledge.
- BR: chutar o balde and pulga atrás da orelha (Gazeta SP, which blocked my link check). Cair a ficha (semantica-portuguese; the MX equivalent "me cayó el veinte" is documented on mexicodesconocido.com.mx).
- MX: ni modo, a poco (Wiktionary), "ya nos cargó el payaso" (inklingo). A "hacerse el occiso" row was cut for lack of a source.
- US: raining cats and dogs, break a leg, my bad (Wiktionary). The first two are British phrases too, but the UK is not one of the ten cultures.
- TR: üzüm/bağcı (milligazete), ağzıyla kuş tutsa (a forum thread), kafayı yemek (Wiktionary).
- IT: al verde (The Local; origin disputed), mangiare la foglia (Focus). "Mamma mia" is obviousness 1, so some may call it a cliche.
- FR: poser un lapin (frenchlearner), avoir la pêche (frenchlearner listing), à tes souhaits (Wiktionary). It overlaps with the TR sneeze row, though the phrase is different.
- KR: daebak, 발이 넓다 (Wiktionary), nunchi (migaku idiom guide).

Overlap check: I grepped the 622 existing rows by keyword. Related existing rows: pl-012 (birthday song) and pl-030 (hot meal at 4 pm), mx-007 (big meal 2-4 pm), tr-012 (spoon on glass), ua-015 (bread and salt), tr-020 (pinned coins), tr-022 (foot race), nl-045 (apple and egg for price) and fr-044 (raining ropes). None repeat my rows, but the reviewer should compare tr-new "pin banknotes" (mx-new money dance fits TR) with tr-020.
