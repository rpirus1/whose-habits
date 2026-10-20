import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import type { Snapshot } from '@/game/protocol'
import type { Choice } from '@/game/types'
import { QuestionView } from '@/screens/room/QuestionView'
import { RevealView } from '@/screens/room/RevealView'

// Dev only (not in production builds): the Question and Reveal screens with made-up data,
// for polishing the UI without a live room. Open /dev on a phone on the same Wi-Fi.

const VIEWS = [
  { id: 'question', label: 'Question' },
  { id: 'right', label: 'Reveal ✓' },
  { id: 'wrong', label: 'Reveal ✗' },
] as const

const ME = 'me'

function mockSnapshot(view: string, endsAt: number): Snapshot {
  const players = [
    { id: ME, name: 'You', score: 7, connected: true, isHost: true },
    { id: 'p2', name: 'Olena', score: 5, connected: true, isHost: false },
    { id: 'p3', name: 'Joost', score: 9, connected: true, isHost: false },
    { id: 'p4', name: 'Ana', score: 4, connected: true, isHost: false },
    { id: 'p5', name: 'Kuba', score: 6, connected: true, isHost: false },
  ]
  const right = view === 'right'
  return {
    v: 1,
    seq: 1,
    hostId: ME,
    roomCode: 'preview',
    gameId: 'preview',
    phase: view === 'question' ? 'question' : 'reveal',
    paused: false,
    settings: { cultures: ['PL', 'UA', 'NL', 'BR', 'MX', 'US'], rounds: 10, seconds: 20 },
    players,
    question:
      view === 'question'
        ? {
            roundId: 'r4',
            index: 3,
            total: 10,
            text: 'Cycling to a wedding in a suit is completely normal.',
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
            answer: 'NL',
            note: 'The Netherlands has more bikes than people, and arriving by bike in formal clothes surprises no one.',
            split: { NL: right ? 3 : 2, PL: right ? 1 : 2, US: 1 },
            correctIds: right ? [ME, 'p3', 'p4'] : ['p3', 'p4'],
            bonusId: right ? ME : 'p3',
            points: right ? { [ME]: 2, p3: 1, p4: 1 } : { p3: 2, p4: 1 },
            choices: { [ME]: right ? 'NL' : 'PL', p2: 'PL', p3: 'NL', p4: 'NL', p5: 'US' },
          },
    viewing: false,
    final: null,
  }
}

export function DevScreensScreen() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') ?? 'question'
  const [endsAt, setEndsAt] = useState(() => Date.now() + 20_000)
  const [choice, setChoice] = useState<Choice | null>(null)

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
    setEndsAt(Date.now() + 20_000)
    setChoice(null)
  }

  const snapshot = mockSnapshot(view, endsAt)

  return (
    <Screen>
      <div className="flex flex-col gap-2 border-b pb-3">
        <Segmented options={VIEWS} value={view} onChange={(v) => set('view', v)} />
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
        <RevealView key={view} snapshot={snapshot} meId={ME} onNext={() => {}} />
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
