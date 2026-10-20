import { useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseJoinInput } from './join'
import { useHydrated } from './useHydrated'

const ERROR = "That code doesn't look right. It's 12 letters and numbers, like k7m2-x9qp-4tdv."

/**
 * Type the code a friend reads out, or paste their link. Without JS (or before it loads)
 * the form goes to /join, where the Worker checks the code and redirects.
 */
export function JoinWithCode() {
  const navigate = useNavigate()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const hydrated = useHydrated()
  // null until the player submits or types. Before that, show the error only if the Worker
  // sent a bad no-JS submit back here (?join=invalid); after hydration, so markup matches.
  const [checked, setInvalid] = useState<boolean | null>(null)
  const invalid =
    checked ?? (hydrated && new URLSearchParams(location.search).get('join') === 'invalid')

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = parseJoinInput(new FormData(e.currentTarget).get('code'))
    if (!code) {
      setInvalid(true)
      inputRef.current?.focus()
      return
    }
    void navigate(`/r/${code}`)
  }

  return (
    <form id="join" action="/join" method="get" noValidate onSubmit={submit}>
      <label htmlFor={`${id}-code`} className="mb-2 block font-medium">
        Join with a code
      </label>
      {/* One pill: the field with the Join button inside it, as wide as the Host button. */}
      <div
        data-invalid={invalid || undefined}
        className="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 data-invalid:border-destructive data-invalid:ring-destructive/20 flex h-14 items-center rounded-full border p-1.5 pl-1 transition-colors focus-within:ring-3 data-invalid:ring-3 dark:bg-input/30"
      >
        <Input
          ref={inputRef}
          id={`${id}-code`}
          name="code"
          placeholder="k7m2-x9qp-4tdv"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint`}
          onChange={() => setInvalid(false)}
          className="h-full min-w-0 flex-1 rounded-full border-0 bg-transparent px-4 text-lg tabular-nums focus-visible:ring-0 aria-invalid:ring-0 md:text-lg dark:bg-transparent"
        />
        <Button type="submit" size="lg" className="h-full px-5 text-base" variant="secondary">
          Join
        </Button>
      </div>
      <p
        id={`${id}-hint`}
        aria-live="polite"
        className={invalid ? 'text-destructive mt-2 text-sm' : 'text-muted-foreground mt-2 text-sm'}
      >
        {invalid ? ERROR : 'Got a link or a QR code instead? Just open it.'}
      </p>
    </form>
  )
}
