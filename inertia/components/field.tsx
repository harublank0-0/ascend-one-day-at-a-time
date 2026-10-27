import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

type FieldProps = React.ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
}

/**
 * A labelled input with its hint and error wired up for assistive technology.
 * The error is announced when it appears. A password input gets a button that
 * shows or hides what was typed.
 */
export function Field({
  label,
  error,
  hint,
  id,
  name,
  className,
  type,
  ...inputProps
}: FieldProps) {
  const fieldId = id ?? name
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const [revealed, setRevealed] = React.useState(false)
  const isPassword = type === 'password'

  const input = (
    <Input
      id={fieldId}
      name={name}
      type={isPassword && revealed ? 'text' : type}
      className={`h-11 md:h-9 ${isPassword ? 'pr-11 md:pr-9' : ''} ${className ?? ''}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
      {...inputProps}
    />
  )

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      {isPassword ? (
        <div className="relative">
          {input}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 size-11 text-muted-foreground md:size-9"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
      ) : (
        input
      )}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
