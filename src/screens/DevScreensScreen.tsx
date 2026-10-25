import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { AppBar } from '@/components/AppBar'
import { PlayerMenu } from '@/components/PlayerMenu'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import type { Snapshot } from '@/game/protocol'
import { NEXT_COUNTDOWN_MS, type Choice } from '@/game/types'
import type { CultureCode } from '@/content/schema'
import { QuestionView } from '@/screens/room/QuestionView'
import { RevealView } from '@/screens/room/RevealView'

// Dev only (not in production builds): the Question and Reveal screens with made-up data,
// for polishing the UI without a live room. Open /dev on a phone on the same Wi-Fi.

const ME_ID = 'me'
const ME = ME_ID

const VIEWS = [
  { id: 'question', label: 'Question' },
  { id: 'bonus', label: '✓ +2' },
  { id: 'right', label: '✓ +1' },
  { id: 'wrong', label: '✗' },
  { id: 'unknown', label: '?' },
] as const

const ROLES = [
  { id: 'host', label: 'As host' },
  { id: 'player', label: 'As player' },
] as const

/** The reveal for each view: who got it, and what "you" picked. */
const RESULTS = {
  bonus: { correctIds: [ME_ID, 'p3', 'p4'], bonusId: ME_ID, mine: 'NL', points: 2 },
  right: { correctIds: [ME_ID, 'p3', 'p4'], bonusId: 'p3', mine: 'NL', points: 1 },
  wrong: { correctIds: ['p3'], bonusId: 'p3', mine: 'PL', points: 0 },
  unknown: { correctIds: ['p3', 'p4'], bonusId: 'p3', mine: 'unknown', points: 0 },
} as const

const OPTIONS: CultureCode[] = ['PL', 'UA', 'NL', 'BR', 'MX', 'US']

function mockSnapshot(view: string, endsAt: number, nextAt: number | null): Snapshot {
  const players = [
    { id: ME, name: 'You', score: 7, connected: true, isHost: true },
    { id: 'p2', name: 'Olena', score: 5, connected: true, isHost: false },
    { id: 'p3', name: 'Joost', score: 9, connected: true, isHost: false },
    { id: 'p4', name: 'Ana', score: 4, connected: true, isHost: false },
    { id: 'p5', name: 'Kuba', score: 6, connected: true, isHost: false },
  ]
  const result = RESULTS[view as keyof typeof RESULTS] ?? RESULTS.right
  return {
    v: 1,
    seq: 1,
    hostId: ME,
    roomCode: 'preview',
    gameId: 'preview',
    phase: view === 'question' ? 'question' : 'reveal',
    paused: false,
    settings: { mode: 'pick', cultures: OPTIONS, rounds: 10, seconds: 20 },
    players,
    question:
      view === 'question'
        ? {
            roundId: 'r4',
            index: 3,
            total: 10,
            text: 'Cycling to a wedding in a suit is completely normal.',
            options: OPTIONS,
            endsAt,
            remainingMs: null,
            answeredIds: ['p2', 'p3'],
            answeringIds: players.map((p) => p.id),
          }
        : null,
    reveal:
      view === 'question'
        ? null
        : {
            index: 3,
            total: 10,
            statementId: 'preview',
            text: 'Cycling to a wedding in a suit is completely normal.',
            options: OPTIONS,
            answer: 'NL',
            note: 'The Netherlands has more bikes than people, and arriving by bike in formal clothes surprises no one.',
            split: { NL: result.correctIds.length, PL: 2, US: 1 },
            correctIds: [...result.correctIds],
            bonusId: result.bonusId,
            points: { [ME]: result.points, p3: result.bonusId === 'p3' ? 2 : 1, p4: 1 },
            choices: {
              [ME]: result.mine,
              p2: 'PL',
              p3: 'NL',
              p4: (result.correctIds as readonly string[]).includes('p4') ? 'NL' : 'PL',
              p5: 'US',
            },
          },
    viewing: false,
    final: null,
    holdUntil: null,
    nextAt,
  }
}

export function DevScreensScreen() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') ?? 'question'
  const [endsAt, setEndsAt] = useState(() => Date.now() + 20_000)
  const [choice, setChoice] = useState<Choice | null>(null)
  const role = params.get('as') ?? 'host'
  const [nextAt, setNextAt] = useState<number | null>(null)
  // Plays the Next countdown, then stays on this reveal (there's no next question here).
  function startCountdown() {
    const at = Date.now() + NEXT_COUNTDOWN_MS
    setNextAt(at)
    window.setTimeout(() => setNextAt((n) => (n === at ? null : n)), NEXT_COUNTDOWN_MS)
  }

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
    setEndsAt(Date.now() + 20_000)
    setChoice(null)
    setNextAt(null)
  }

  const snapshot = mockSnapshot(view, endsAt, nextAt)

  return (
    <Screen>
      <AppBar menu={() => <PlayerMenu name="Anna" onLeave={() => {}} />} />
      <div className="flex flex-col gap-2 border-b pb-3">
        <Segmented options={VIEWS} value={view} onChange={(v) => set('view', v)} />
        {view !== 'question' && (
          <div className="flex gap-1">
            <Segmented options={ROLES} value={role} onChange={(v) => set('as', v)} />
            {role === 'player' && (
              <Button size="sm" variant="secondary" disabled={!!nextAt} onClick={startCountdown}>
                Host taps Next
              </Button>
            )}
          </div>
        )}
      </div>
      {view === 'question' ? (
        <QuestionView
          key={endsAt}
          snapshot={snapshot}
          meId={ME}
          myChoice={choice}
          confirmed
          clockOffset={0}
          onChoose={setChoice}
        />
      ) : (
        <RevealView
          key={`${view}-${role}-${endsAt}`}
          snapshot={snapshot}
          meId={ME}
          clockOffset={0}
          onNext={role === 'host' ? startCountdown : undefined}
          onReport={{ open: () => {}, done: () => {} }}
        />
      )}
    </Screen>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: readonly { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <Button
          key={o.id}
          size="sm"
          variant={o.id === value ? 'default' : 'ghost'}
          className="flex-1"
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}
