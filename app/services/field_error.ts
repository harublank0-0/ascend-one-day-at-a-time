import { errors } from '@vinejs/vine'

/**
 * A rule a service enforces that the request validator cannot see, reported
 * against one form field. It is a validation error, so the exception handler
 * sends it back to the form exactly like a failed validator would.
 */
export function fieldError(field: string, message: string) {
  return new errors.E_VALIDATION_ERROR([{ field, message, rule: 'domain' }])
}
