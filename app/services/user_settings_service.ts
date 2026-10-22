import type User from '#models/user'
import CleanTimeService from '#services/clean_time_service'
import { fieldError } from '#services/field_error'
import { normalizeTimeZone } from '#services/calendar_dates'

/**
 * The per-user choices that decide how Ascend reads the calendar.
 */
export default class UserSettingsService {
  private cleanTime = new CleanTimeService()

  /**
   * Finishes first-visit setup. The timezone is required; the clean start date
   * is optional and can be set later in Settings.
   *
   * Nothing is saved unless everything is valid, so a bad start date cannot
   * leave a user half set up.
   */
  async completeSetup(user: User, input: { timezone: string; startDate?: string | null }) {
    user.timezone = this.validTimeZone(input.timezone)

    // The start date is judged against the zone being chosen right now, which
    // is why the zone is set on the user (but not yet saved) before this runs.
    if (input.startDate) {
      await this.cleanTime.start(user, input.startDate)
    }

    await user.save()
  }

  async changeTimezone(user: User, timezone: string) {
    user.timezone = this.validTimeZone(timezone)
    await user.save()
  }

  private validTimeZone(value: string) {
    const timezone = normalizeTimeZone(value)
    if (!timezone) {
      throw fieldError('timezone', 'Choose a timezone from the list.')
    }
    return timezone
  }
}
