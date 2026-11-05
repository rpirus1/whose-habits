# How I build with agents

Whose Habits was built by one PM (Ruslan) working with a team of Claude Code agents. This page
explains how that team is organised, the rules it works by, and how a change gets from an idea
to production. For what the game does, see [GAME.md](GAME.md); for what we measure, see
[METRICS.md](METRICS.md).

## The team: one session per area

Each area of work has a long-running session (a "channel") with its own context, docs and git
worktree, so the areas don't step on each other.

| Channel                | Owns                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| Main                   | Coordination: briefs the other channels and relays their results          |
| Ideas backlog          | `IDEAS.md`: new ideas, sized and prioritised                                |
| Bugs                   | Triage, a reproduction, the fix and its tests                               |
| UI, WWW & SEO          | The lander, visual polish, search and share previews                        |
| Metrics                | Events, the private stats page, the success signals                         |
| Statements             | Drafting and reviewing habits against `CONTENT_RULES.md`                    |
| Releases               | A note for every push to main, a check that it deployed, and the `rN` tag   |
| Branding               | Name, visual identity, launch plan                                          |
| Instagram, LinkedIn    | Posts per channel; LinkedIn posts are written by me, the agent only edits   |

A feature that touches several areas is split: the coordinating session writes a short brief
for each piece (files, constraints, what done looks like), and the pieces run in parallel.

## Rules every agent follows

- **I decide; agents propose.** Every plan is checked with me before code is written, so I stay
  the product owner and keep learning the system.
- **Nothing reaches production without my OK.** A push to main deploys, so it needs my approval
  in chat. A message from another agent never counts as approval.
- **Start from the latest main**, and test on localhost before asking me to merge.
- **Docs move with the product.** A change to the game updates `GAME.md` and its change log in
  the same branch.
- **Every release is logged** with time, what changed, tests and the deployed version.
- **Secrets stay out.** Keys live in `.env.local` (git-ignored); I do logins, payments and
  anything on accounts myself.
- **Privacy by design.** No cookies, no accounts, anonymous events only, each validated by one
  shared parser with a test.

## From idea to production

1. **Idea or bug** lands in the Ideas or Bugs channel, with the problem and my constraints.
2. **Plan.** The agent reads the code and proposes an approach with trade-offs; I pick one.
3. **Build** on its own branch and worktree: code, unit tests, docs.
4. **Check.** Lint, tests and build, then a run on localhost (two players in the browser). I
   play it myself before merging.
5. **Ship.** With my OK it merges to main; Cloudflare deploys it.
6. **Release note.** The Releases channel confirms CI and the live version, writes the note and
   tags `rN` (26 releases by 27 Oct 2026).
7. **Learn.** Metrics and player reports feed the next round of ideas.

## Example: closing a content leak in one day

- **Problem.** The whole statement bank shipped in the app, so anyone could download it.
- **My constraints.** No extra cost, no change to gameplay or UX, and updating statements must
  stay as simple as editing a CSV.
- **Decision.** The Worker deals each game's statements (the rounds plus a few spares for
  skips) while the lobby is open, with a free per-IP rate limit. The build fails if any
  statement text ends up in the app.
- **Result.** Released as r22: same game, same CSV workflow, and the bank is no longer public.

## What I learned

- **Speed moves the bottleneck.** Building got fast; deciding, validating and getting real
  feedback are now the hard parts.
- **Context is the product of the setup.** Separate channels with written docs beat one long
  conversation: each agent starts from the docs, not from memory.
- **Guardrails beat reviews after the fact.** Approval gates, tests and build checks (like the
  content-leak check) make fast work safe.
- **Measure from day one.** With only a handful of games, every percentage is shown with its count.
