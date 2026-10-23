# Ideas backlog

Ideas for Whose Habits, stored here so they don't get lost. Only items under "Next up" are planned; the rest are not committed to.
For what is being built now, see [PLAN.md](PLAN.md).

Each entry: what and why, date added, where it came from.

## Next up

### "Buy Me a Coffee" link on the lander

An optional way to support the maker. It unlocks nothing and stays out of the game itself.
Added 2026-10-22. From Ruslan, via the main chat. Approach approved, start planned for 2026-10-23 in the lander chat.

**Approach**

- A plain link to `https://buymeacoffee.com/<handle>`, styled as our own button (Lucide Coffee icon, orchid styling). Reuse `ExternalLink` in `src/lander/Lander.tsx`.
- Don't use BMC's script widget or hosted button image. Both load from BMC on every visit and would break the "No cookies, no ads, no tracking scripts" promise in the footer, FAQ and README. A plain link sends nothing until someone taps it, and it works on the prerendered page without JavaScript.
- Placement: in "About the maker" next to LinkedIn ("Enjoying it? Buy me a coffee."), plus a small text link in the footer next to Feedback. Not in the hero, the Host CTA or the game screens.

**Copy**

- FAQ "Is it really free?": add "If you like it, you can buy me a coffee. It unlocks nothing."
- "Free: no ads, no paywall" stays true as long as BMC memberships and the shop aren't used.
- Privacy footer, one added line: the link goes to buymeacoffee.com, nothing loads from BMC until you tap it, BMC and Stripe handle the payment, and the maker sees a supporter's name or message only if they leave one.

**Metrics**

- No new event. The BMC dashboard counts supporters.
- An optional `support_click` event would need schema, Worker and privacy-text changes.

**Ruslan's own steps**

- Create the BMC page and set up payouts (5% fee plus processing). Ko-fi, with 0% on one-off donations, is the alternative.
- NL tax: donations are usually taxable income, so check with the Belastingdienst.

**Build steps (about 1 hour)**

1. Add `SUPPORT_URL` to `src/lander/contact.ts` and hide the button while it's empty.
2. Add the About button and the footer link.
3. Update the FAQ, privacy text, `README.md` and `docs/LANDER.md`.
4. Add a test that the lander loads no third-party scripts.

## Ideas

### Extra culture packs

More countries, so more groups find their own background in the game and replays stay fresh.
Added 2026-10-19. From the brief. Partly done on 2026-10-21: TR, IT, FR and KR joined the first six (10 in total).

### Custom statements written by the host

The host types their own statements (inside jokes, a specific country or friend group) before the game starts. Makes each session personal.
Added 2026-10-19. From the brief.

### Vibe mode

A scoring mode where you get points for matching the room's majority answer instead of the "correct" culture. Lighter, more social, and less about knowing facts.
Added 2026-10-19. From earlier discussion.

### A second game on the same room engine

Reuse the room, join-by-link/QR and host-runs-the-game setup for a different party game. Shows the engine is reusable.
Added 2026-10-19. From earlier discussion.

### Paid tier

Paid extras (for example packs or custom statements). Needs a business registration first.
Added 2026-10-19. From earlier discussion.

### TV / shared-screen mode for the host

The host shows questions and results on a TV or laptop while players answer on their phones, like Kahoot or Jackbox.
Added 2026-10-19. From earlier discussion.

### "Lock room" toggle

The host can lock the room so nobody new joins mid-game.
Added 2026-10-19. From earlier discussion.

### "Notify me about new culture packs"

Start as a button that only counts clicks, to test demand without collecting anything. Later, if demand is there, a hosted email form (needs a privacy check).
Added 2026-10-19. From earlier discussion.

### Host migration

If the host's phone dies or leaves, another player takes over as host so the game continues.
Added 2026-10-19. From earlier discussion (also listed in PLAN.md edge cases).

### Player-submitted statements for the shared base

Players can submit their own statements. Ruslan reviews them and adds the good ones to the general statement base, so the content grows with the community. Submitters can optionally add a nickname that is shown with the statement as credit. No personal details are collected.
Added 2026-10-19. From Ruslan.

### Undecided edge cases from PLAN.md

The open questions in [PLAN.md, section 9](PLAN.md): back pressed during a question, host leaving for good, disconnects mid-question, cultures changed in the lobby, two tabs with the same playerId, late joiners, everyone but the host leaving, ties in the ranking and first-correct bonus, settings leaving too few statements, a room link opened after the game ended, and the message when Supabase limits are hit.
Added 2026-10-19. From the brief (PLAN.md).
