import vine from '@vinejs/vine'

/**
 * First-visit setup. The timezone is checked against real IANA zones by the
 * service; here we only make sure something was sent.
 */
export const setupValidator = vine.create({
  timezone: vine.string().trim(),
  startDate: vine.string().trim().optional(),
})

export const timezoneValidator = vine.create({
  timezone: vine.string().trim(),
})
