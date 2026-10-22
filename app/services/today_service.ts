import { DateTime } from 'luxon'
import type User from '#models/user'
import CleanTimeService from '#services/clean_time_service'
import { presentCleanTime } from '#services/clean_time_presenter'
import DailyReadingService from '#services/daily_reading_service'
import JournalService, { MAX_JOURNAL_LENGTH } from '#services/journal_service'
import { shiftDate, fullDate, weekdayDate } from '#services/date_labels'
import { localToday, parseCalendarDate, type CalendarDate } from '#services/calendar_dates'

/**
 * Which day the Today page is showing, and where its navigation leads.
 */
export type Day = {
  date: CalendarDate
  todayDate: CalendarDate
  isToday: boolean
  previousDate: CalendarDate
  /** Null on today: there is nothing to read or write beyond it. */
  nextDate: CalendarDate | null
  /** True when a date was asked for but could not be used (invalid or in the future). */
  corrected: boolean
}

/**
 * Builds the Today page for one selected local date.
 *
 * A signed-in user gets clean time, both readings and their journal entry, all
 * keyed to that date. A guest gets the readings and nothing personal.
 */
export default class TodayService {
  private cleanTime = new CleanTimeService()
  private readings = new DailyReadingService()
  private journal = new JournalService()

  /**
   * Works out the day to show. No date means today. A date that is not real, or
   * has not come yet, falls back to today and is flagged so the caller can
   * redirect to the address that matches what is shown.
   */
  resolveDay(timeZone: string, requested: unknown, now: DateTime = DateTime.now()): Day {
    const todayDate = localToday(timeZone, now)
    const parsed = parseCalendarDate(requested)
    const usable = parsed !== null && parsed <= todayDate
    const date = usable ? parsed : todayDate

    return {
      date,
      todayDate,
      isToday: date === todayDate,
      previousDate: shiftDate(date, -1),
      nextDate: date < todayDate ? shiftDate(date, 1) : null,
      corrected: requested !== undefined && !usable,
    }
  }

  /**
   * The page for a signed-in user.
   */
  async memberPage(user: User, day: Day, now: DateTime = DateTime.now()) {
    const [cleanTime, readings, entry] = await Promise.all([
      this.cleanTime.summary(user, now),
      this.readings.forDate(day.date),
      this.journal.find(user, day.date),
    ])

    return {
      ...day,
      isGuest: false as const,
      dateLabel: this.dateLabel(day),
      cleanTime: presentCleanTime(cleanTime),
      readings,
      entry: entry ? { body: entry.body } : null,
      maxJournalLength: MAX_JOURNAL_LENGTH,
    }
  }

  /**
   * The page for someone who is not signed in. It reads only the shared
   * readings table: no clean time and no journal, so there is nothing private
   * for it to leak. `timeZone` is the zone the day was worked out in.
   */
  async guestPage(day: Day, timeZone: string) {
    return {
      ...day,
      isGuest: true as const,
      timeZone,
      dateLabel: this.dateLabel(day),
      readings: await this.readings.forDate(day.date),
    }
  }

  private dateLabel(day: Day) {
    const sameYear = day.date.slice(0, 4) === day.todayDate.slice(0, 4)
    return sameYear ? weekdayDate(day.date) : fullDate(day.date)
  }
}
