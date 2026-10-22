import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import CleanPeriod from '#models/clean_period'
import type User from '#models/user'
import { longDate } from '#services/date_labels'
import { fieldError } from '#services/field_error'
import { todayFor } from '#services/user_calendar'
import { daysBetween, parseCalendarDate, type CalendarDate } from '#services/calendar_dates'

export type CleanTimeSummary =
  { status: 'not_started' } | { status: 'active'; startDate: CalendarDate; daysClean: number }

export type PreviousPeriod = { startDate: CalendarDate; endedOn: CalendarDate; days: number }

/**
 * Clean time for one user, kept apart from anything else they do in the app.
 *
 * Counting convention: the start date is 0 days clean and each following local
 * calendar date adds one, so the number is completed local days. Only a date is
 * recorded, so hours are never shown.
 *
 * Methods take `now` so tests can place "now" on either side of a user's local
 * midnight; callers outside tests leave it out.
 */
export default class CleanTimeService {
  async summary(user: User, now: DateTime = DateTime.now()): Promise<CleanTimeSummary> {
    const current = await this.currentPeriod(user)
    if (!current) {
      return { status: 'not_started' }
    }

    // Moving to an earlier timezone can leave the start date a day "ahead";
    // show 0 rather than a negative count.
    const daysClean = Math.max(0, daysBetween(current.startDate, todayFor(user, now)))
    return { status: 'active', startDate: current.startDate, daysClean }
  }

  /**
   * Begins clean-time tracking for a user who has not set a start date.
   */
  async start(user: User, startDate: string, now: DateTime = DateTime.now()) {
    const date = this.validStartDate(user, startDate, now)

    if (await this.currentPeriod(user)) {
      throw fieldError('startDate', 'You already have a start date. Correct it instead.')
    }

    return this.open(user, date)
  }

  /**
   * Fixes the start date of the current period (a typo, or remembering the
   * real day), without ending it or counting as a new beginning.
   */
  async correctStartDate(user: User, startDate: string, now: DateTime = DateTime.now()) {
    const date = this.validStartDate(user, startDate, now)

    const current = await this.currentPeriod(user)
    if (!current) {
      throw fieldError('startDate', 'Set a start date first.')
    }

    const previous = await this.latestClosedPeriod(user)
    if (previous && date < previous.endedOn!) {
      throw fieldError(
        'startDate',
        `This period begins after your last one ended on ${longDate(previous.endedOn!)}.`
      )
    }

    current.startDate = date
    await current.save()
    return current
  }

  /**
   * Closes the current period on `startDate` and opens a new one that begins
   * the same day. The old period stays in history; nothing else is touched.
   */
  async startNewPeriod(user: User, startDate: string, now: DateTime = DateTime.now()) {
    const date = this.validStartDate(user, startDate, now)

    return db.transaction(async (trx) => {
      const current = await CleanPeriod.query({ client: trx })
        .where('userId', user.id)
        .whereNull('endedOn')
        .forUpdate()
        .first()

      if (current) {
        if (date < current.startDate) {
          throw fieldError(
            'startDate',
            `Your current period began on ${longDate(current.startDate)}; choose that day or later.`
          )
        }
        current.useTransaction(trx)
        current.endedOn = date
        await current.save()
      }

      return CleanPeriod.create({ userId: user.id, startDate: date }, { client: trx })
    })
  }

  /**
   * Earlier periods, most recent first.
   */
  async previousPeriods(user: User): Promise<PreviousPeriod[]> {
    const periods = await CleanPeriod.query()
      .where('userId', user.id)
      .whereNotNull('endedOn')
      .orderBy('startDate', 'desc')

    return periods.map((period) => ({
      startDate: period.startDate,
      endedOn: period.endedOn!,
      days: daysBetween(period.startDate, period.endedOn!),
    }))
  }

  private currentPeriod(user: User) {
    return CleanPeriod.query().where('userId', user.id).whereNull('endedOn').first()
  }

  private latestClosedPeriod(user: User) {
    return CleanPeriod.query()
      .where('userId', user.id)
      .whereNotNull('endedOn')
      .orderBy('endedOn', 'desc')
      .first()
  }

  private async open(user: User, startDate: CalendarDate) {
    try {
      return await CleanPeriod.create({ userId: user.id, startDate })
    } catch (error) {
      // Two requests raced past the check above; the partial unique index caught it.
      if ((error as { code?: string }).code === '23505') {
        throw fieldError('startDate', 'You already have a start date. Correct it instead.')
      }
      throw error
    }
  }

  private validStartDate(user: User, value: string, now: DateTime): CalendarDate {
    const date = parseCalendarDate(value)
    if (!date) {
      throw fieldError('startDate', 'Enter a real date.')
    }
    if (date > todayFor(user, now)) {
      throw fieldError('startDate', 'The start date can’t be in the future.')
    }
    return date
  }
}
