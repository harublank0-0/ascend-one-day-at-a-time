import { CleanPeriodSchema } from '#database/schema'

/**
 * A stretch of clean time. The period without an "endedOn" is the user's current
 * one; earlier periods are kept as history.
 */
export default class CleanPeriod extends CleanPeriodSchema {}
