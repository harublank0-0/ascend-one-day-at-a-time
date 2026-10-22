import { DateTime } from 'luxon'
import type { CalendarDate } from '#services/calendar_dates'

/**
 * Human-readable text for calendar dates. A calendar date has no zone, so these
 * are formatted from the date itself and cannot drift with the server's zone.
 */
const read = (date: CalendarDate) => DateTime.fromISO(date, { zone: 'utc', locale: 'en-US' })

/** "March 1, 2026" */
export const longDate = (date: CalendarDate) => read(date).toFormat('LLLL d, yyyy')

/** "Tuesday, March 10" */
export const weekdayDate = (date: CalendarDate) => read(date).toFormat('cccc, LLLL d')

/** "Tuesday, March 10, 2026" */
export const fullDate = (date: CalendarDate) => read(date).toFormat('cccc, LLLL d, yyyy')

/**
 * The calendar date `days` after (or before, if negative) `date`.
 */
export function shiftDate(date: CalendarDate, days: number): CalendarDate {
  return read(date).plus({ days }).toISODate()!
}
