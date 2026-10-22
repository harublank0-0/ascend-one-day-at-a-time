import { DateTime } from 'luxon'
import type User from '#models/user'
import { localToday, type CalendarDate } from '#services/calendar_dates'

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
