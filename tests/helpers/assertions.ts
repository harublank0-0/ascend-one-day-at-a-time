import { errors } from '@vinejs/vine'

/**
 * Awaits a promise that is expected to fail validation on `field` and returns
 * the reported message. Anything else (no failure, or a different failure)
 * fails the test.
 */
export async function rejectsWithFieldError(promise: Promise<unknown>, field: string) {
  try {
    await promise
  } catch (error) {
    if (!(error instanceof errors.E_VALIDATION_ERROR)) {
      throw error
    }
    const reported = error.messages.find((message: { field: string }) => message.field === field)
    if (!reported) {
      throw new Error(`Validation failed, but not on "${field}": ${JSON.stringify(error.messages)}`)
    }
    return reported.message as string
  }
  throw new Error(`Expected a validation error on "${field}", but the promise resolved`)
}
