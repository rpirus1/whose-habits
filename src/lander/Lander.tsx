// The public landing page at "/". Prerendered at build time (scripts/prerender.ts) and
// hydrated in the browser, so the first render must not read localStorage, window or the
// theme: anything device-specific appears after mount.
import {
  ArrowUpRight,
  ChevronRight,
  Globe,
  Smartphone,
  UserRoundCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Brand } from '@/components/Brand'
import { Flag } from '@/components/Flag'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CULTURES, getCulture } from '@/content/cultures'
import { MAX_PLAYERS, MIN_PLAYERS_TO_START } from '@/game/types'
import { lastRoom } from '@/lib/savedRooms'
import { cn } from '@/lib/utils'
import hostArt from './art/step-1-host.svg'
import joinArt from './art/step-2-join.svg'
import scoreArt from './art/step-3-score.svg'
import makerPhoto from './art/maker.webp'
import { FAQ, HERO_QUESTION, SAMPLES } from './content'
import { CountryCarousel } from './CountryCarousel'
import { FlipCard } from './FlipCard'
import { JoinWithCode } from './JoinWithCode'
import { COFFEE_URL, FEEDBACK_EMAIL, LINKEDIN_URL } from './contact'
import { useHydrated } from './useHydrated'
import './lander.css'

// theme.ts touches window when imported, so the switcher loads in the browser only.
const ThemeSwitcher = lazy(async () => ({
  default: (await import('@/components/ThemeSwitcher')).ThemeSwitcher,
}))

const PLAYERS = `${MIN_PLAYERS_TO_START}–${MAX_PLAYERS}`
/** A–Z, with "The Netherlands" under N. */
const COUNTRIES = [...CULTURES].sort((a, b) =>
  a.name.replace(/^The /, '').localeCompare(b.name.replace(/^The /, ''), 'en'),
)
const container = 'mx-auto w-full max-w-5xl px-4'
const h2 = 'font-heading text-2xl font-bold tracking-tight text-balance md:text-3xl'

export function Lander() {
  return (
    <>
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-full px-4 py-2 font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className={cn(container, 'flex h-16 items-center justify-between')}>
        <Brand />
        <Button asChild variant="ghost" size="lg" className="-mr-2.5">
          <Link to="/new">Host a game</Link>
        </Button>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <HowToPlay />
        <WhyItsDifferent />
        <Samples />
        <FaqSection />
        <About />
      </main>

      <Footer />
    </>
  )
}

/** A full-width section. `background` gives it a tinted band and pattern (lander.css). */
function Section({
  id,
  title,
  intro,
  children,
  background,
  narrow = false,
}: {
  id: string
  title: string
  intro?: string
  children: ReactNode
  background?: 'dots' | 'marks'
  /** Desktop: a centred column, 60% of the container. */
  narrow?: boolean
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        'py-14 md:py-20',
        background && 'lander-band',
        background === 'dots' && 'lander-dots',
        background === 'marks' && 'lander-marks',
      )}
    >
      <div className={container}>
        <div className={cn(narrow && 'md:mx-auto md:w-3/5')}>
          <h2 id={`${id}-title`} className={h2}>
            {title}
          </h2>
          {intro && <p className="text-muted-foreground mt-2 max-w-2xl text-base">{intro}</p>}
          <div className={intro ? 'mt-10 md:mt-12' : 'mt-6 md:mt-8'}>{children}</div>
        </div>
      </div>
    </section>
  )
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className={cn(
        container,
        'grid items-center gap-10 pt-4 pb-14 md:grid-cols-[1fr_minmax(0,24rem)] md:gap-16 md:pt-12 md:pb-20',
      )}
    >
      <div className="flex flex-col gap-8">
        <div>
          <Badge variant="highlight" className="h-7 px-3 text-sm">
            Free party game · {PLAYERS} players
          </Badge>
          <h1
            id="hero-title"
            className="font-heading mt-5 text-5xl font-bold tracking-tight md:text-6xl"
          >
            Whose Habits
          </h1>
          <p className="mt-2 text-2xl font-semibold text-balance md:text-3xl">
            Guess whose habit it is.
          </p>
          <p className="text-muted-foreground mt-4 max-w-xl text-base text-pretty">
            A party game for international friends. Read a small everyday habit, guess which country
            it comes from, and find out who knows their friends best. One phone each, no app.
          </p>
        </div>

        {/* The Host button and the join pill share one width: full on phones, 21rem on desktop. */}
        <div className="flex w-full max-w-md flex-col gap-6 md:w-[21rem]">
          <div className="flex flex-col gap-2">
            <Button asChild size="xl" className="w-full">
              <Link to="/new">Host a game</Link>
            </Button>
            <ResumeGame />
          </div>
          <JoinWithCode />
        </div>
      </div>

      <ExampleQuestion />
    </section>
  )
}

/** Closed the tab mid-game? A quiet way back into the most recent room. */
function ResumeGame() {
  const hydrated = useHydrated()
  const room = useMemo(() => (hydrated ? lastRoom() : undefined), [hydrated])
  if (!room) return null

  return (
    <Button asChild variant="ghost" size="lg" className="text-primary-soft self-center">
      <Link to={`/r/${room.roomCode}`}>
        Back to the last game
        <ChevronRight data-icon="inline-end" aria-hidden />
      </Link>
    </Button>
  )
}

/** A still of the question screen. Not interactive: the options are plain text. */
function ExampleQuestion() {
  const question = HERO_QUESTION
  return (
    // Tilted in 3D like a product shot, so it reads as a picture of the game, not a control.
    // Still real text (crisp, translatable, read by screen readers); only the transform is new.
    // Dark mode swaps the (invisible) shadow for a sunflower glow underneath.
    <div className="relative isolate mx-auto w-full max-w-sm max-md:-my-8">
      <div className="example-halo" aria-hidden />
      <figure className="example-tilt bg-card ring-border w-full rounded-3xl p-5 shadow-2xl ring-1 select-none dark:shadow-none">
        <figcaption className="text-muted-foreground flex items-center justify-between text-sm">
          <span>Example question</span>
          <span className="tabular-nums">Round 3 of 10</span>
        </figcaption>
        <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full" aria-hidden>
          <div className="bg-primary h-full w-2/3 rounded-full" />
        </div>
        <blockquote className="mt-5 text-xl leading-snug font-semibold text-balance">
          {question.text}
        </blockquote>
        <p className="text-muted-foreground mt-5 mb-3 text-sm">Whose habit is it?</p>
        <ul className="grid grid-cols-2 gap-2">
          {question.options.map((code) => (
            <li
              key={code}
              className="bg-background flex min-h-14 items-center gap-2 rounded-2xl px-3 py-2 leading-tight font-semibold"
            >
              <Flag code={code} />
              {getCulture(code).name}
            </li>
          ))}
        </ul>
      </figure>
    </div>
  )
}

// Edit the pictures in src/lander/art/*.svg (plain SVG, opens in Figma). Each one moves with a
// small CSS animation in its own <style>.
const STEPS: { title: string; text: string; art: string }[] = [
  {
    art: hostArt,
    title: 'Host a game',
    text: 'Pick 2 to 6 countries, the number of rounds and the time per question.',
  },
  {
    art: joinArt,
    title: 'Friends join',
    text: 'They scan the QR code or open the link on their own phone. No app, no account.',
  },
  {
    art: scoreArt,
    title: 'Guess and score',
    text: 'Read the habit, pick the country. A point for every right answer, a bonus for the first one in.',
  },
]

function HowToPlay() {
  return (
    <Section
      id="how"
      title="How to play"
      intro="Set up in a minute, play in ten."
      background="dots"
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ title, text, art }, i) => (
          <li key={title} className="bg-card ring-border rounded-2xl p-5 ring-1 md:p-6">
            <div className="bg-muted flex justify-center rounded-xl py-5">
              <img src={art} alt="" width={160} height={96} className="h-24 w-auto" />
            </div>
            <p className="text-muted-foreground mt-5 text-sm font-medium tabular-nums">
              Step {i + 1}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1.5">{text}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

const PERKS: { title: string; text: string; Icon: LucideIcon }[] = [
  { title: 'Free', text: 'No ads, no paywall.', Icon: Wallet },
  { title: 'No app', text: 'Runs in the browser on any phone.', Icon: Smartphone },
  { title: 'No sign-up', text: 'Type a name, that’s it.', Icon: UserRoundCheck },
  { title: `${CULTURES.length} countries`, text: 'From Brazil to South Korea.', Icon: Globe },
  { title: `${PLAYERS} players`, text: 'A dinner table or a full living room.', Icon: Users },
]

function WhyItsDifferent() {
  return (
    <Section
      id="why"
      title="Made for game night with friends from everywhere"
      intro="A culture quiz for expat get-togethers, mixed friend groups and anyone who has ever said “wait, you do that too?”"
    >
      {/* Phones: one benefit per row, icon on the left. Desktop: five columns. */}
      <ul className="grid gap-6 md:grid-cols-5 md:gap-4">
        {PERKS.map(({ title, text, Icon }) => (
          <li key={title} className="flex items-start gap-4 md:flex-col md:gap-3">
            <span className="bg-primary/15 text-primary-soft flex size-11 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-0.5 text-sm">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-14 flex items-center gap-3 md:mt-16">
        <h3 className="font-semibold">Countries in the game</h3>
        <Badge variant="highlight">More coming</Badge>
      </div>
      {/* Phones: a drifting row you can swipe. Desktop: all chips, wrapped. */}
      <div className="mt-5 md:hidden">
        <CountryCarousel countries={COUNTRIES} />
      </div>
      <ul className="mt-5 hidden flex-wrap gap-2 md:flex">
        {COUNTRIES.map((c) => (
          <li
            key={c.code}
            className="bg-card ring-border flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-sm font-medium ring-1"
          >
            <Flag code={c.code} />
            {c.name}
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Samples() {
  return (
    <Section
      id="samples"
      title="Try a few"
      intro="Every game has habits like these. Guess first, then flip the card."
      background="marks"
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {SAMPLES.map((s) => (
          <FlipCard key={s.id} sample={s} />
        ))}
      </ul>
      <aside
        aria-labelledby="habits-note-title"
        className="text-muted-foreground mt-8 max-w-2xl md:mt-10"
      >
        <h3 id="habits-note-title" className="text-foreground font-semibold">
          How I write the habits
        </h3>
        <p className="mt-1.5">
          They’re playful generalisations, not rules about people: plenty of Brazilians have never
          clapped at a gate. I research and polish them with help from AI, and your feedback is what
          makes them better. Spotted one that’s wrong or feels unfair? Tap Report in the game. I
          read every report and fix or remove the statement.
        </p>
      </aside>
    </Section>
  )
}

function FaqSection() {
  return (
    <Section id="faq" title="Questions" narrow>
      <div className="divide-border divide-y border-y">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-medium [&::-webkit-details-marker]:hidden">
              <h3>{q}</h3>
              <ChevronRight
                className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>
            <p className="text-muted-foreground pb-5">
              <WithEmailLink text={a} />
            </p>
          </details>
        ))}
      </div>
    </Section>
  )
}

/** A link to another site: opens in a new tab, and says so (icon, and text for screen readers). */
function ExternalLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <ArrowUpRight className="ml-0.5 inline size-[0.9em] align-[-0.1em]" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** Plain text with the feedback address turned into a mailto link. */
function WithEmailLink({ text }: { text: string }) {
  const [before, after] = text.split(FEEDBACK_EMAIL)
  if (after === undefined) return text
  return (
    <>
      {before}
      <a href={`mailto:${FEEDBACK_EMAIL}`} className="text-foreground underline underline-offset-2">
        {FEEDBACK_EMAIL}
      </a>
      {after}
    </>
  )
}

function About() {
  return (
    <Section id="about" title="About the maker">
      {/* Phones: photo above the text. Desktop: photo beside it. */}
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <img
          src={makerPhoto}
          alt="Ruslan Pirus"
          width={256}
          height={256}
          loading="lazy"
          decoding="async"
          className="size-28 shrink-0 rounded-full md:size-36"
        />
        <div className="max-w-2xl space-y-4 text-lg">
          <p>
            Hi, I’m Ruslan, a product person in Amsterdam. I made Whose Habits for game nights with
            friends from all over, where the best stories start with “wait, you do that too?”
          </p>
          <p>
            It’s a side project, built in the open and free to play. Ideas, bugs and habits from
            your country are very welcome.
          </p>
          <p>
            <ExternalLink
              href={LINKEDIN_URL}
              className="text-primary-soft font-medium whitespace-nowrap underline underline-offset-4"
            >
              Ruslan on LinkedIn
            </ExternalLink>
          </p>
          <p>
            Do you like what I do?{' '}
            <ExternalLink
              href={COFFEE_URL}
              className="text-primary-soft font-semibold whitespace-nowrap underline underline-offset-4"
            >
              Buy me a coffee
            </ExternalLink>
          </p>
        </div>
      </div>
      <div className="bg-card ring-border lander-dots mt-12 flex flex-col items-start gap-4 rounded-3xl p-6 ring-1 md:flex-row md:items-center md:justify-between md:p-8">
        <p className="font-heading text-2xl font-bold text-balance">Got friends over tonight?</p>
        <Button asChild size="xl" className="w-full md:w-fit md:px-10">
          <Link to="/new">Host a game</Link>
        </Button>
      </div>
    </Section>
  )
}

const CREDITS = [
  { name: 'HeroUI components', license: 'MIT', href: 'https://heroui.com' },
  {
    name: 'country-flag-icons',
    license: 'MIT',
    href: 'https://gitlab.com/catamphetamine/country-flag-icons',
  },
  { name: 'Lucide icons', license: 'ISC', href: 'https://lucide.dev' },
  {
    name: 'Bricolage Grotesque font',
    license: 'OFL',
    href: 'https://github.com/ateliertriay/bricolage',
  },
]

/** Footer headings: Theme, Privacy and Credits share this style. */
const footerHeading = 'text-base font-semibold'

function Footer() {
  const hydrated = useHydrated()

  return (
    <footer className="bg-card/50 border-t">
      <div className={cn(container, 'flex flex-col gap-10 py-12 text-sm')}>
        {/* The switcher reads the saved theme, so it renders after hydration; the box keeps
            its space meanwhile. Its legend gets the same look as the headings below. */}
        <div
          className={cn(
            'min-h-[5.5rem] md:max-w-xs',
            '[&_legend]:mb-3 [&_legend]:text-base [&_legend]:font-semibold',
          )}
        >
          {hydrated && (
            <Suspense>
              <ThemeSwitcher />
            </Suspense>
          )}
        </div>

        <section aria-labelledby="privacy-title" className="space-y-3">
          <h2 id="privacy-title" className={footerHeading}>
            Privacy
          </h2>
          <p className="text-muted-foreground">
            No cookies, no ads, no tracking scripts. The game sends a few anonymous events to our
            own database, to see whether people enjoy it and which settings work. No names, no
            player ids, no IP addresses are stored. This page sends nothing.
          </p>
          <details className="group">
            <summary className="text-foreground flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                aria-hidden
              />
              What exactly is collected
            </summary>
            <ul className="text-muted-foreground mt-2 list-disc space-y-2 pl-5">
              <li>
                A game started: number of players, the countries, rounds and seconds per question,
                and whether it was a replay. A game finished: rounds played, players at the start
                and end, whether it ended early. Each game has a random id.
              </li>
              <li>
                Votes on “play again?”, taps on Share and “Host your own game”, and the id of a
                statement someone reported with the reason they picked.
              </li>
              <li>
                Names you type go to the other players in your room while you play, through Supabase
                (servers in Ireland). They are not stored.
              </li>
              <li>
                Your phone remembers your theme and the rooms you can rejoin (for 12 hours). That
                stays on your phone.
              </li>
              <li>
                Cloudflare hosts the site and, like any web host, sees IP addresses to deliver the
                pages. It also keeps request logs for 3 days, so we can catch errors.
              </li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Questions or a request? Write to{' '}
              <a href={`mailto:${FEEDBACK_EMAIL}`} className="text-foreground underline">
                {FEEDBACK_EMAIL}
              </a>
              .
            </p>
          </details>
        </section>

        <section aria-labelledby="credits-title" className="space-y-3">
          <h2 id="credits-title" className={footerHeading}>
            Credits
          </h2>
          <ul className="text-muted-foreground grid gap-x-8 gap-y-1 md:grid-cols-2">
            {CREDITS.map((c) => (
              <li key={c.name}>
                <ExternalLink
                  href={c.href}
                  className="text-foreground underline underline-offset-2"
                >
                  {c.name}
                </ExternalLink>{' '}
                ({c.license})
              </li>
            ))}
          </ul>
        </section>

        <p className="text-muted-foreground">
          Feedback:{' '}
          <a href={`mailto:${FEEDBACK_EMAIL}`} className="text-foreground underline">
            {FEEDBACK_EMAIL}
          </a>
          <br />© 2026 Ruslan Pirus
        </p>
      </div>
    </footer>
  )
}
