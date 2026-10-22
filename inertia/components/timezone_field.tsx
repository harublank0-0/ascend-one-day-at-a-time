import { useMemo, useState } from 'react'
import { Label } from '~/components/ui/label'

/**
 * The timezone the browser reports, if it reports one. Only a suggestion: the
 * server checks whatever is submitted.
 */
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/**
 * Today's calendar date in a timezone, as YYYY-MM-DD. Used only to stop the
 * date picker offering days that have not happened; the server decides for real.
 */
export function todayIn(timeZone: string) {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone })
  } catch {
    return undefined
  }
}

type TimezoneFieldProps = {
  /** The saved timezone. When absent, the browser's is suggested. */
  value?: string | null
  error?: string
  onChange?: (timeZone: string) => void
}

export function TimezoneField({ value, error, onChange }: TimezoneFieldProps) {
  // Pages are not server-rendered (see config/inertia.ts), so the browser's own
  // zone can seed the initial state directly. With SSR on, this would need to
  // move into an effect to avoid a hydration mismatch.
  const [suggested] = useState(() => (value ? null : browserTimeZone()))
  const [selected, setSelected] = useState(() => value ?? suggested ?? 'UTC')

  const zones = useMemo(() => {
    const listed = new Set<string>(['UTC', ...Intl.supportedValuesOf('timeZone')])
    // Keep whatever is selected selectable even when the list spells it differently.
    listed.add(selected)
    return [...listed].sort((a, b) => a.localeCompare(b))
  }, [selected])

  const describedBy = [suggested ? 'timezone-hint' : null, error ? 'timezone-error' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="timezone">Timezone</Label>
      <select
        id="timezone"
        name="timezone"
        value={selected}
        onChange={(event) => {
          setSelected(event.target.value)
          onChange?.(event.target.value)
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:h-9 md:text-sm dark:bg-input/30"
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll('_', ' ')}
          </option>
        ))}
      </select>
      {suggested && selected === suggested && (
        <p id="timezone-hint" className="text-sm text-muted-foreground">
          Chosen from your browser. Change it if it isn&rsquo;t right.
        </p>
      )}
      {error && (
        <p id="timezone-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
