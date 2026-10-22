import vine from '@vinejs/vine'

/**
 * Setting or correcting a start date. Whether it is a real date and not in the
 * future depends on the user's timezone, so the service decides that.
 */
export const cleanTimeValidator = vine.create({
  startDate: vine.string().trim(),
})

/**
 * Starting a new clean period must be confirmed. The page asks first, and the
 * server insists on it too.
 */
export const newCleanPeriodValidator = vine.create({
  startDate: vine.string().trim(),
  confirmed: vine.accepted(),
})
