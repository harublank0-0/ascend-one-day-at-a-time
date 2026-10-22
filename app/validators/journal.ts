import vine from '@vinejs/vine'

/**
 * Only the text comes from the form. The date is in the URL and the owner is
 * always the signed-in user, so anything else in the request (a user id, an
 * entry id) is dropped here and never reaches the service.
 *
 * A blank body is allowed through so the service can answer with a useful
 * message instead of a generic "field is required".
 */
export const journalValidator = vine.create({
  body: vine.string().optional(),
})
