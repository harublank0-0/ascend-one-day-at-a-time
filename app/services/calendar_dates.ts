import { DateTime, IANAZone } from 'luxon'

/**
 * A calendar date is a plain "YYYY-MM-DD" string. It names a day on the user's
 * wall calendar and carries no time or zone, so it is never converted through
 * a JavaScript Date. See docs/adr/0001-time-and-timezone-handling.md.
 */
export type CalendarDate = string

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME_ZONE_NAME = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)*$/

/**
 * Returns the value when it is a real calendar date written as YYYY-MM-DD
 * (so "2027-02-29" is rejected), otherwise null.
 */
export function parseCalendarDate(value: unknown): CalendarDate | null {
  if (typeof value !== 'string' || !CALENDAR_DATE.test(value)) {
    return null
  }
  return DateTime.fromISO(value, { zone: 'utc' }).isValid ? value : null
}

const KNOWN_TIME_ZONES = new Map(
  Intl.supportedValuesOf('timeZone').map((zone) => [zone.toLowerCase(), zone])
)

/**
 * Returns the IANA name for a time zone, or null when the value is not a named
 * zone. UTC offsets such as "+05:30" are not accepted: an offset cannot tell us
 * when daylight saving starts.
 *
 * The spelling is kept as given, apart from repairing the casing of zones the
 * runtime lists. ICU rewrites some valid names to legacy aliases (for example
 * Asia/Kathmandu becomes Asia/Katmandu), and browsers report either spelling.
 */
export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== 'string' || !TIME_ZONE_NAME.test(value) || !IANAZone.isValidZone(value)) {
    return null
  }
  return KNOWN_TIME_ZONES.get(value.toLowerCase()) ?? value
}

/**
 * The calendar date it currently is for a user in the given time zone.
 */
export function localToday(timeZone: string, now: DateTime = DateTime.now()): CalendarDate {
  return now.setZone(timeZone).toISODate()!
}

/**
 * Whole calendar days from `from` to `to` (negative when `to` is earlier).
 * Both dates are read at UTC midnight so a 23- or 25-hour daylight-saving day
 * cannot shift the result.
 */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const start = DateTime.fromISO(from, { zone: 'utc' })
  const end = DateTime.fromISO(to, { zone: 'utc' })
  return Math.round(end.diff(start, 'days').days)
}

/**
 * The month and day a daily reading is keyed by. Readings repeat every year,
 * so the year is deliberately dropped.
 */
export function monthDayOf(date: CalendarDate): { month: number; day: number } {
  const parsed = DateTime.fromISO(date, { zone: 'utc' })
  return { month: parsed.month, day: parsed.day }
}
