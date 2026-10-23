import { Check, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Flag } from '@/components/Flag'
import { CULTURES, MAX_CULTURES, MIN_CULTURES } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'
import { STATEMENTS } from '@/content/statements'
import { eligibleStatements } from '@/game/selection'
import { MODE_COPY, withMode } from '@/lib/gameMode'
import { isRandom, ROUND_OPTIONS, SECONDS_OPTIONS } from '@/game/types'
import type { GameMode, Settings } from '@/game/types'
import { cn } from '@/lib/utils'

/** The settings screen's first step: two big cards. Tapping one picks it and moves on. */
export function ModeCards({
  value,
  onPick,
}: {
  value: GameMode | undefined
  onPick: (mode: GameMode) => void
}) {
  return (
    <div className="flex flex-col gap-3" role="list">
      {(['pick', 'random'] as const).map((mode) => {
        const { title, line, icon: Icon } = MODE_COPY[mode]
        return (
          <button
            key={mode}
            type="button"
            role="listitem"
            onClick={() => onPick(mode)}
            className={cn(
              'bg-card flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors',
              value === mode ? 'border-primary' : 'border-border hover:border-primary/50',
            )}
          >
            <span className="bg-primary/15 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-6" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-lg font-semibold">{title}</span>
              <span className="text-muted-foreground text-sm leading-snug">{line}</span>
            </span>
            <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

/** The lobby's compact mode switch, above the country grid. */
function ModeSwitch({ value, onChange }: { value: GameMode; onChange: (mode: GameMode) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-3 font-medium">Countries</legend>
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-full p-1" role="radiogroup">
        {(['pick', 'random'] as const).map((mode) => {
          const Icon = MODE_COPY[mode].icon
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => onChange(mode)}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-full font-medium transition-colors',
                mode === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {mode === 'pick' ? 'Choose' : 'Random'}
            </button>
          )
        })}
      </div>
      <p className="text-muted-foreground text-sm">{MODE_COPY[value].line}</p>
    </fieldset>
  )
}

/** "2 of 2–6": how many countries are picked, in the Pick countries step's header. */
export function CountryCount({ count }: { count: number }) {
  return (
    <span className="text-muted-foreground shrink-0 text-sm font-normal tabular-nums">
      {count} of {MIN_CULTURES}–{MAX_CULTURES}
    </span>
  )
}

/** The country grid with its hint. */
export function CountryPicker({
  value,
  onChange,
  keepMinimum = false,
}: {
  value: Settings
  onChange: (settings: Settings) => void
  /** Refuse to untick below the minimum (in the lobby, where the game must stay valid). */
  keepMinimum?: boolean
}) {
  // The culture the host just tried to tick or untick past a limit, which limit, and a counter so
  // repeat taps shake again.
  const [refused, setRefused] = useState<{
    code: CultureCode
    limit: 'min' | 'max'
    n: number
  } | null>(null)
  useEffect(() => {
    if (!refused) return
    const id = window.setTimeout(() => setRefused(null), 2500)
    return () => clearTimeout(id)
  }, [refused])

  const toggleCulture = (code: CultureCode) => {
    const selected = value.cultures.includes(code)
    const limit =
      !selected && value.cultures.length >= MAX_CULTURES
        ? 'max'
        : selected && keepMinimum && value.cultures.length <= MIN_CULTURES
          ? 'min'
          : null
    if (limit) {
      setRefused((r) => ({ code, limit, n: (r?.n ?? 0) + 1 }))
      return
    }
    const cultures = selected ? value.cultures.filter((c) => c !== code) : [...value.cultures, code]
    // Keep the list in the canonical order so the answer buttons are always in the same place.
    onChange({
      ...value,
      cultures: CULTURES.map((c) => c.code).filter((c) => cultures.includes(c)),
    })
  }

  const hint = refused
    ? refused.limit === 'max'
      ? `Up to ${MAX_CULTURES} countries. Untick one to swap it.`
      : `Keep at least ${MIN_CULTURES} countries.`
    : ''

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Countries</legend>
      <div className="grid grid-cols-2 gap-2">
        {CULTURES.map((culture) => {
          const selected = value.cultures.includes(culture.code)
          return (
            <button
              key={culture.code}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleCulture(culture.code)}
              className={cn(
                'relative flex min-h-14 items-center gap-3 rounded-xl border-2 px-3 text-left font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary/15'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              <span
                // A new key restarts the shake on every refused tap.
                key={refused?.code === culture.code ? refused.n : 0}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3',
                  refused?.code === culture.code && 'motion-safe:animate-shake',
                )}
              >
                <Flag code={culture.code} className={cn(!selected && 'opacity-60')} />
                <span className={cn('min-w-0 flex-1', selected && 'text-foreground')}>
                  {culture.name}
                </span>
              </span>
              {selected && (
                <Check className="text-primary absolute top-1.5 right-1.5 size-4" strokeWidth={3} />
              )}
            </button>
          )
        })}
      </div>
      {/* Always rendered (sr-only when empty) so screen readers announce the hint. */}
      <p className={cn('text-muted-foreground text-sm', !hint && 'sr-only')} aria-live="polite">
        {hint}
      </p>
    </fieldset>
  )
}

/** Rounds and the answer timer. */
export function GameOptions({
  value,
  onChange,
}: {
  value: Settings
  onChange: (settings: Settings) => void
}) {
  const pool =
    !isRandom(value) && value.cultures.length >= MIN_CULTURES
      ? eligibleStatements(STATEMENTS, value.cultures).length
      : Infinity

  return (
    <>
      <OptionPicker
        label="Rounds"
        options={ROUND_OPTIONS}
        value={value.rounds}
        onChange={(rounds) => onChange({ ...value, rounds })}
      />
      {pool < value.rounds && (
        <p className="text-muted-foreground -mt-4 text-sm">
          Only {pool} statements fit this mix of countries, so the game will have {pool} rounds.
        </p>
      )}

      <OptionPicker
        label="Time to answer"
        options={SECONDS_OPTIONS}
        format={(s) => `${s}s`}
        value={value.seconds}
        onChange={(seconds) => onChange({ ...value, seconds })}
      />
    </>
  )
}

/** Everything on one panel: the host menu in the lobby, where changes apply at once. */
export function SettingsForm({
  value,
  onChange,
}: {
  value: Settings
  onChange: (settings: Settings) => void
}) {
  const mode = value.mode ?? 'pick'
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <ModeSwitch value={mode} onChange={(m) => onChange(withMode(value, m))} />
        {mode === 'pick' && <CountryPicker value={value} onChange={onChange} keepMinimum />}
      </div>
      <GameOptions value={value} onChange={onChange} />
    </div>
  )
}

function OptionPicker<T extends number>({
  label,
  options,
  value,
  onChange,
  format = String,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  format?: (value: T) => string
}) {
  return (
    <fieldset>
      <legend className="mb-3 font-medium">{label}</legend>
      <div className="bg-muted grid grid-flow-col gap-1 rounded-full p-1" role="radiogroup">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            onClick={() => onChange(option)}
            className={cn(
              'h-12 rounded-full text-lg font-medium transition-colors',
              option === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
