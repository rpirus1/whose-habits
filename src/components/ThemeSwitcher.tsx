import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'system', label: 'Auto', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const

/** Light, dark or follow the phone. Saved on this device only. Same pill as Rounds and Time. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset>
      <legend className="mb-3 font-medium">Theme</legend>
      <div className="bg-muted grid grid-flow-col gap-1 rounded-full p-1" role="radiogroup">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-full font-medium transition-colors',
              theme === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
