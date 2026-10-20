import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Flag } from '@/components/Flag'
import { CULTURES, MAX_CULTURES, MIN_CULTURES } from '@/content/cultures'
import type { CultureCode } from '@/content/schema'
import { STATEMENTS } from '@/content/statements'
import { eligibleStatements } from '@/game/selection'
import { ROUND_OPTIONS, SECONDS_OPTIONS } from '@/game/types'
import type { Settings } from '@/game/types'
import { cn } from '@/lib/utils'

/** Culture picker, rounds and timer. Used on the settings screen and in the host panel. */
export function SettingsForm({
  value,
  onChange,
  keepMinimum = false,
}: {
  value: Settings
  onChange: (settings: Settings) => void
  /** Refuse to untick below the minimum (in the lobby, where the game must stay valid). */
  keepMinimum?: boolean
}) {
  // The culture the host just tried to untick, and a counter so repeat taps shake again.
  const [refused, setRefused] = useState<{ code: CultureCode; n: number } | null>(null)
  useEffect(() => {
    if (!refused) return
    const id = window.setTimeout(() => setRefused(null), 2500)
    return () => clearTimeout(id)
  }, [refused])

  const toggleCulture = (code: CultureCode) => {
    const selected = value.cultures.includes(code)
    if (!selected && value.cultures.length >= MAX_CULTURES) return
    if (selected && keepMinimum && value.cultures.length <= MIN_CULTURES) {
      setRefused((r) => ({ code, n: (r?.n ?? 0) + 1 }))
      return
    }
    const cultures = selected ? value.cultures.filter((c) => c !== code) : [...value.cultures, code]
    // Keep the list in the canonical order so the answer buttons are always in the same place.
    onChange({
      ...value,
      cultures: CULTURES.map((c) => c.code).filter((c) => cultures.includes(c)),
    })
  }

  const enough = value.cultures.length >= MIN_CULTURES
  const hint = refused
    ? `Keep at least ${MIN_CULTURES} countries.`
    : enough
      ? ''
      : `Pick at least ${MIN_CULTURES} countries.`
  const pool = enough ? eligibleStatements(STATEMENTS, value.cultures).length : 0

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 flex w-full items-baseline justify-between font-medium">
          Countries
          <span className="text-muted-foreground text-sm font-normal">
            {value.cultures.length} of {MIN_CULTURES}–{MAX_CULTURES}
          </span>
        </legend>
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
                  <Check
                    className="text-primary absolute top-1.5 right-1.5 size-4"
                    strokeWidth={3}
                  />
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

      <OptionPicker
        label="Rounds"
        options={ROUND_OPTIONS}
        value={value.rounds}
        onChange={(rounds) => onChange({ ...value, rounds })}
      />
      {enough && pool < value.rounds && (
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
