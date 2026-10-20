// The public landing page at "/". Prerendered at build time (scripts/prerender.ts) and
// hydrated in the browser, so the first render must not read localStorage, window or the
// theme: anything device-specific appears after mount.
import {
  ChevronRight,
  Globe,
  QrCode,
  Settings2,
  Smartphone,
  Trophy,
  UserRoundCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Flag } from '@/components/Flag'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CULTURES, getCulture } from '@/content/cultures'
import { MAX_PLAYERS, MIN_PLAYERS_TO_START } from '@/game/types'
import { listSavedRooms } from '@/lib/savedRooms'
import { cn } from '@/lib/utils'
import { FAQ, HERO_OPTIONS, SAMPLES } from './content'
import { JoinWithCode } from './JoinWithCode'
import { CONTACT_EMAIL, LINKEDIN_URL } from './site'
import { useHydrated } from './useHydrated'

// theme.ts touches window when imported, so the switcher loads in the browser only.
const ThemeSwitcher = lazy(async () => ({
  default: (await import('@/components/ThemeSwitcher')).ThemeSwitcher,
}))

const PLAYERS = `${MIN_PLAYERS_TO_START}–${MAX_PLAYERS}`
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
        <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold">
          <img src="/favicon.svg" alt="" width={28} height={28} className="size-7" />
          Whose Habits
        </Link>
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

function Section({
  id,
  title,
  intro,
  children,
  className,
}: {
  id: string
  title: string
  intro?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn(container, 'py-12 md:py-16', className)}>
      <h2 id={`${id}-title`} className={h2}>
        {title}
      </h2>
      {intro && <p className="text-muted-foreground mt-3 max-w-2xl text-lg">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className={cn(
        container,
        'grid items-center gap-10 pt-6 pb-12 md:grid-cols-[1fr_minmax(0,24rem)] md:gap-16 md:pt-12 md:pb-16',
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <Badge variant="soft" className="h-7 px-3 text-sm">
            Free party game · {PLAYERS} players
          </Badge>
          <h1
            id="hero-title"
            className="font-heading text-5xl font-bold tracking-tight md:text-6xl"
          >
            Whose Habits
          </h1>
          <p className="text-2xl font-semibold text-balance md:text-3xl">
            Guess whose habit it is.
          </p>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">
            A party game for international friends. Read a small everyday habit, guess which country
            it comes from, and find out who knows their friends best. One phone each, no app.
          </p>
        </div>

        <ResumeGames />

        <Button asChild size="xl" className="w-full sm:w-fit sm:px-10">
          <Link to="/new">Host a game</Link>
        </Button>

        <div className="max-w-md">
          <JoinWithCode />
        </div>
      </div>

      <ExampleQuestion />
    </section>
  )
}

/** Closed the tab mid-game? Offer the way back in (as the old home screen did). */
function ResumeGames() {
  const hydrated = useHydrated()
  const rooms = useMemo(
    () =>
      hydrated
        ? listSavedRooms()
            .filter((r) => !r.finished)
            .slice(0, 2)
        : [],
    [hydrated],
  )
  if (rooms.length === 0) return null

  return (
    <ul className="flex max-w-md flex-col gap-2">
      {rooms.map((room) => (
        <li key={`${room.role}-${room.roomCode}`}>
          <Link
            to={`/r/${room.roomCode}`}
            className="bg-card ring-border flex min-h-14 items-center gap-3 rounded-xl px-4 ring-1"
          >
            <span className="flex-1">
              <span className="block font-medium">Back to your game</span>
              <span className="text-muted-foreground text-sm">
                {room.role === 'host' ? 'You are hosting' : `Playing as ${room.name}`}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** A still of the question screen. Not interactive: the options are plain text. */
function ExampleQuestion() {
  const sample = SAMPLES[0]
  return (
    <figure className="bg-card ring-border mx-auto w-full max-w-sm rounded-3xl p-5 shadow-sm ring-1">
      <figcaption className="text-muted-foreground flex items-center justify-between text-sm">
        <span>Example question</span>
        <span className="tabular-nums">Round 3 of 10</span>
      </figcaption>
      <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full" aria-hidden>
        <div className="bg-primary h-full w-2/3 rounded-full" />
      </div>
      <blockquote className="mt-5 text-xl leading-snug font-semibold text-balance">
        {sample.text}
      </blockquote>
      <p className="text-muted-foreground mt-5 mb-3 text-sm">Whose habit is it?</p>
      <ul className="grid grid-cols-2 gap-2">
        {HERO_OPTIONS.map((code) => (
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
  )
}

const STEPS: { title: string; text: string; Icon: LucideIcon }[] = [
  {
    title: 'Host a game',
    text: 'Pick 2 to 6 countries, the number of rounds and the time per question.',
    Icon: Settings2,
  },
  {
    title: 'Friends join',
    text: 'They scan the QR code or open the link on their own phone. No app, no account.',
    Icon: QrCode,
  },
  {
    title: 'Guess and score',
    text: 'Read the habit, pick the country. A point for every right answer, a bonus for the first one in.',
    Icon: Trophy,
  },
]

function HowToPlay() {
  return (
    <Section id="how" title="How to play" intro="Set up in a minute, play in ten.">
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ title, text, Icon }, i) => (
          <li key={title} className="bg-card ring-border rounded-2xl p-5 ring-1">
            <div className="flex items-center gap-3">
              <span className="bg-primary/15 text-primary-soft flex size-10 items-center justify-center rounded-full">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-muted-foreground text-sm font-medium tabular-nums">
                Step {i + 1}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1">{text}</p>
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
  { title: `${CULTURES.length} countries`, text: 'From Poland to South Korea.', Icon: Globe },
  { title: `${PLAYERS} players`, text: 'A dinner table or a full living room.', Icon: Users },
]

function WhyItsDifferent() {
  return (
    <Section
      id="why"
      title="Made for game night with friends from everywhere"
      intro="A culture quiz for expat get-togethers, mixed friend groups and anyone who has ever said “wait, you do that too?”"
    >
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {PERKS.map(({ title, text, Icon }) => (
          <li key={title} className="flex flex-col gap-2">
            <Icon className="text-primary-soft size-6" aria-hidden />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm">{text}</p>
          </li>
        ))}
      </ul>
      <h3 className="mt-10 font-semibold">The countries</h3>
      <ul className="mt-4 flex flex-wrap gap-2">
        {CULTURES.map((c) => (
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
      intro="Every game has habits like these. Guess first, then check."
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {SAMPLES.map((s) => (
          <li key={s.id} className="bg-card ring-border flex flex-col rounded-2xl p-5 ring-1">
            <p className="text-lg leading-snug font-semibold text-balance">{s.text}</p>
            <details className="group mt-auto pt-5">
              <summary className="text-primary-soft flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                  aria-hidden
                />
                <span className="group-open:hidden">Show answer</span>
                <span className="hidden group-open:inline">Answer</span>
              </summary>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
                {s.fits.map((code) => (
                  <span key={code} className="flex items-center gap-2">
                    <Flag code={code} />
                    {getCulture(code).name}
                  </span>
                ))}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">{s.note}</p>
            </details>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function FaqSection() {
  return (
    <Section id="faq" title="Questions">
      <div className="divide-border max-w-3xl divide-y border-y">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-medium [&::-webkit-details-marker]:hidden">
              <h3>{q}</h3>
              <ChevronRight
                className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>
            <p className="text-muted-foreground pb-4">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

function About() {
  return (
    <Section id="about" title="About the maker">
      <div className="max-w-2xl space-y-4 text-lg">
        <p>
          Hi, I’m Ruslan, a product person in Amsterdam. I made Whose Habits for game nights with
          friends from all over, where the best stories start with “wait, you do that too?”
        </p>
        <p>
          It’s a side project, built in the open and free to play. Ideas, bugs and habits from your
          country are very welcome.
        </p>
        <p className="flex flex-wrap gap-x-6 gap-y-2">
          <a
            href={LINKEDIN_URL}
            className="text-primary-soft font-medium underline underline-offset-4"
          >
            Ruslan on LinkedIn
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary-soft font-medium underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
      <div className="bg-card ring-border mt-12 flex flex-col items-start gap-4 rounded-3xl p-6 ring-1 md:flex-row md:items-center md:justify-between md:p-8">
        <p className="font-heading text-2xl font-bold text-balance">Got friends over tonight?</p>
        <Button asChild size="xl" className="w-full md:w-fit md:px-10">
          <Link to="/new">Host a game</Link>
        </Button>
      </div>
    </Section>
  )
}

const CREDITS = [
  { name: 'HeroUI “Rabbit” theme', license: 'MIT', href: 'https://heroui.com' },
  {
    name: 'country-flag-icons',
    license: 'MIT',
    href: 'https://gitlab.com/catamphetamine/country-flag-icons',
  },
  { name: 'Lucide icons', license: 'ISC', href: 'https://lucide.dev' },
  { name: 'Geist font', license: 'OFL', href: 'https://vercel.com/font' },
]

function Footer() {
  const hydrated = useHydrated()

  return (
    <footer className="bg-card/50 border-t">
      <div className={cn(container, 'grid gap-10 py-12 text-sm md:grid-cols-2')}>
        <section aria-labelledby="privacy-title" className="space-y-3">
          <h2 id="privacy-title" className="text-base font-semibold">
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
                statement someone reported.
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
                pages.
              </li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Questions or a request? Write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </details>
        </section>

        <div className="space-y-8">
          <section aria-labelledby="credits-title" className="space-y-3">
            <h2 id="credits-title" className="text-base font-semibold">
              Credits
            </h2>
            <ul className="text-muted-foreground space-y-1">
              {CREDITS.map((c) => (
                <li key={c.name}>
                  <a href={c.href} className="text-foreground underline underline-offset-2">
                    {c.name}
                  </a>{' '}
                  ({c.license})
                </li>
              ))}
            </ul>
          </section>

          {hydrated && (
            <Suspense>
              <div className="max-w-xs">
                <ThemeSwitcher />
              </div>
            </Suspense>
          )}

          <p className="text-muted-foreground">
            Feedback:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">
              {CONTACT_EMAIL}
            </a>
            <br />© 2026 Ruslan Pirus
          </p>
        </div>
      </div>
    </footer>
  )
}
