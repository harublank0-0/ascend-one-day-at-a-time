import { DateTime } from 'luxon'
import type User from '#models/user'
import { localToday, normalizeTimeZone, type CalendarDate } from '#services/calendar_dates'

/**
 * The calendar date it is right now for this user, in their saved timezone.
 *
 * A user without a timezone has not finished setup and must not get this far
 * (the setup middleware sends them there first), so a missing one is a bug
 * rather than something to quietly guess at.
 */
export function todayFor(
  user: Pick<User, 'timezone'>,
  now: DateTime = DateTime.now()
): CalendarDate {
  if (!user.timezone) {
    throw new Error('Cannot work out the local date for a user without a timezone')
  }
  return localToday(user.timezone, now)
}

/**
 * Cookie that page script (inertia/lib/guest_timezone.ts) uses to tell the
 * server which timezone a signed-out visitor's browser is in.
 */
export const GUEST_TIMEZONE_COOKIE = 'guest_timezone'

/**
 * The timezone a signed-out visitor is read in. They have no saved zone, so it
 * is the one their browser reported, and UTC when there is none or it is not a
 * real zone. The cookie is user input, so it is checked like any other.
 */
export function guestTimeZone(cookie: unknown): string {
  return normalizeTimeZone(cookie) ?? 'UTC'
}
