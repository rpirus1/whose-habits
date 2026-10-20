# Statement review notes

The bank has 500 draft rows: 50 per culture for PL, UA, NL, BR, MX, US, TR, IT, FR and KR, with `comments` = `draft`. Each row has a `source` URL, except 47 marked `AI-generated` (filter on that value). Reviewers: check the rows below first. They're the most likely to be regional, outdated, too close to an off-limits topic, or tagged with the wrong `fits`. The research behind the sources is in `docs/research/statements/`.

## Facts that may be regional, outdated or disputed

| id     | why to check                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------- |
| pl-002 | Name days: sources say birthdays are taking over among younger people. Still "almost a second birthday"?  |
| pl-016 | Live carp in the bathtub: still common, or mostly a memory?                                               |
| pl-029 | "On L4": still said now that sick notes are digital?                                                      |
| pl-030 | Hot meal after work: corporate lunch breaks are now common. Still true for most office workers?           |
| pl-047 | Post-office loophole for Sunday trading: may have been narrowed by newer rules.                           |
| ua-017 | New Year as the biggest family night: since 2023, Christmas is officially on 25 December. Reword?          |
| ua-018 | First haircut at age one (postryzhyny): widespread, or mostly traditional families?                       |
| ua-027 | Women's Day: popularity dropped sharply since 2017, and it's often framed as Soviet-era. Keep or drop?     |
| ua-029 | Company stamps: possibly no longer required since about 2017. Possibly outdated.                          |
| ua-042 | Vyshyvanka Day: fine as a clothing custom, or too close to national symbols?                              |
| nl-005 | Payment request for your exact share: also normal in the US (Venmo), FR and KR? Consider adding them.      |
| nl-008 | One biscuit with coffee: sources disagree; partly a stereotype.                                           |
| nl-032 | Builders' holiday convoy: now staggered by region.                                                        |
| br-006 | Tax ID on the receipt: mainly a São Paulo programme; the note says "some states".                         |
| br-010 | Clapping at the gate: mostly smaller towns?                                                               |
| br-044 | Nappy party sizes printed on the invitation: the size detail comes from search snippets only.             |
| mx-004 | Senior baggers: still standard at big chains?                                                             |
| mx-007 | Main meal "2 to 4 pm": Wikipedia says noon to 2; 2 to 4 is typical of Mexico City.                        |
| mx-012 | Street tents for family parties: everywhere, or mainly some cities?                                       |
| us-007 | Mailbox flag: kerbside boxes only (suburban and rural).                                                   |
| us-025 | "Kitty-corner" is northern and western; the South says "catty-corner".                                    |
| us-045 | "Bless your heart" is a Southern phrase.                                                                  |
| tr-002 | Basket from the window: fading, old neighbourhoods only.                                                  |
| tr-050 | Meetings running late: sources disagree for business settings.                                           |
| it-001 | Pay at the till first: big cities and tourist areas; small bars let you pay after.                       |
| it-045 | Split working day: mostly the south and public offices.                                                   |
| fr-009 | 15 minutes late on purpose: not every French person expects it.                                           |
| fr-023 | New Year cash for the caretaker: fading (one poll says 18% still give).                                   |
| fr-024 | Firefighters' calendars: some cities restrict door-to-door selling.                                       |
| kr-006 | Fan timers ("fan death"): mostly older people now.                                                        |
| kr-023 | The senior pays: most people under 30 now split the bill.                                                 |
| kr-043 | Two ages: the old system was officially dropped in 2023.                                                  |

## Fits set by judgement, not by a source

The `fits` audit covered all 500 rows against all ten cultures. These additions are the least certain:

- **fr-001, fr-003** (greeting in shops and waiting rooms): added PL, UA, IT. Do Poles, Ukrainians and Italians expect it as strongly?
- **pl-007** (secret mushroom spots): added IT, FR.
- **pl-021** (no smiling at strangers): added FR, KR.
- **pl-026** (switching to first names): added FR, IT, TR.
- **ua-026** (diminutives for food): added MX, BR, NL. Very broad now; maybe reword it to something specifically Slavic.
- **ua-029** (stamps on documents): added KR (company seals).
- **nl-010** (shoes on indoors): added FR, IT, MX. Is BR closer to "on" or "off"?
- **br-007** (doorman): added TR (kapıcı) and KR (apartment guards).
- **tr-013** (never return a plate empty): added PL.
- **it-005** (wet hair makes you ill): added PL, TR.
- **it-039** (desk lunch looks odd): added KR, BR.

## Close to the off-limits list

- **Holidays with a religious origin**: pl-013, pl-015, pl-017, br-015, it-014, it-015, it-016, fr-017, fr-018, fr-035, tr-026 (Bayram), mx-031, mx-032, mx-035. The text describes only the custom. Check the tone.
- **br-014** (seven waves): linked to offerings to Iemanjá, an Afro-Brazilian religion.
- **tr-030** ("Estağfurullah"): the word has a religious origin, but it's used as a fixed politeness phrase. It appears only in the note.
- **kr-026** (chopsticks in rice): explained as a funeral association; the note avoids ancestor rites.
- **Food habits**: pl-017, nl-015, br-030, br-050, fr-013, kr-003, kr-028, it-047. These describe habits, not national dishes. Check they don't read as food clichés.
- **Drinks**: nl-050, fr-034, kr-027 mention drinks at work or the table. The text is about the social ritual, not alcohol.
- **Possibly awkward at a party**: br-003 (toilet paper bin), nl-039 ("an angel peeing on your tongue"), mx-017 (albures are usually sexual innuendo; the note stays vague).

## Extended bank (v3): `content/statements-extended.csv`

The extended file is the 500 rows above plus 333 new drafts (833 rows; PL 83, UA 73, NL 86, BR 83, MX 79, US 91, TR 79, IT 83, FR 85, KR 91). New rows continue the ids from xx-051 and have `comments` = `draft v3; theme: <theme>`, sometimes followed by a remark on what's uncertain. Filter on that remark first. 16 new rows are `AI-generated`. Many sources were checked from search summaries rather than read in full, so open the link before approving. Research notes per batch: `docs/research/statements/v3/`. Build it with `STATEMENTS=content/statements-extended.csv npm run content`.

Themes: money, transport, shopping, neighbours, gifts, parties, office, banter, messaging, paperwork, school, weddings, leisure, public, weather, table, milestones, sayings.

### Facts to check

| id     | why to check                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------ |
| kr-052 | Loser of the bill buys the coffee: the source supports taking turns, not this exact rule.        |
| tr-055 | "Güle güle kullanın": AI-generated, needs a native check.                                         |
| pl-052 | Online gift pot: fits BR UA NL are guesses.                                                       |
| nl-053 | Dutch reach: not confirmed as taught in driving tests.                                            |
| mx-052 | Hoy No Circula: Mexico City area only.                                                            |
| pl-057 | Parapetówka named after the window ledge: etymology not confirmed by the source.                  |
| kr-060 | Gifts set aside unopened: fits PL IT TR rest on thin sources.                                     |
| fr-059 | Right to disconnect: really a duty to negotiate; the Italian half is unsourced.                   |
| pl-081 | Wedding ring on the right hand: TR, BR, NL may be the engagement ring, not the wedding band.       |
| tr-074 | Host peels fruit after a meal: AI-generated; KR fit unchecked.                                    |
| it-071 | Revenue stamp: may be on its way out as payments go digital.                                      |
| br-072 | Mother's full name as a security question: AI-generated.                                          |
| mx-074 | "Hora loca": Latin American generally, not clearly Mexican.                                       |

### Close to the off-limits list

- **Religious roots, secular custom described**: mx-055 (dawn rockets on fiesta days), mx-058 (office posada), ua-071 (rushnyk at the wedding), tr-066 (Hıdırellez), pl-066 (cold gardeners named after saints' days).
- **Politics-adjacent**: nl-061 (New Year's Eve comedy review, a satire genre), mx-070 (voter card as ID), us-077 (jury duty).
- **Drinks**: pl-074 ("bitter!" toast at weddings).
- **Health folk remedies**: kr-074 (thumb pricking for indigestion). The note says it isn't advice.
- **Food habits**: tr-073 (weekend breakfast), it-077 (no cappuccino after lunch), fr-077 (onion soup at weddings), fr-082 (cream-puff wedding cake), kr-073 (rainy-day pancakes). Check they don't read as food clichés.
