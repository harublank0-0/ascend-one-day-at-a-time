import * as React from 'react'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

type FieldProps = React.ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
}

/**
 * A labelled input with its hint and error wired up for assistive technology.
 * The error is announced when it appears.
 */
export function Field({ label, error, hint, id, name, className, ...inputProps }: FieldProps) {
  const fieldId = id ?? name
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        name={name}
        className={`h-11 md:h-9 ${className ?? ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...inputProps}
      />
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
