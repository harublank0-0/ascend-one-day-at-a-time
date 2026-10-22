import { DateTime } from 'luxon'
import JournalEntry from '#models/journal_entry'
import type User from '#models/user'
import { fieldError } from '#services/field_error'
import { todayFor } from '#services/user_calendar'
import { parseCalendarDate, type CalendarDate } from '#services/calendar_dates'

export const MAX_JOURNAL_LENGTH = 20_000

const EXCERPT_LENGTH = 160

export type JournalHistoryItem = { date: CalendarDate; excerpt: string }

export type JournalHistoryPage = {
  items: JournalHistoryItem[]
  page: number
  lastPage: number
  total: number
}

/**
 * A user's private journal: one plain-text entry per calendar date.
 *
 * Every method is scoped to the user it is given. Callers pass the signed-in
 * user and a date; no entry id or user id from a request is ever trusted, so
 * there is nothing for someone to guess.
 */
export default class JournalService {
  find(user: User, date: string) {
    const entryDate = parseCalendarDate(date)
    if (!entryDate) {
      return Promise.resolve(null)
    }
    return JournalEntry.query().where('userId', user.id).where('entryDate', entryDate).first()
  }

  /**
   * Creates the entry for a date, or replaces its text if one already exists.
   */
  async save(user: User, date: string, body: string, now: DateTime = DateTime.now()) {
    const entryDate = parseCalendarDate(date)
    if (!entryDate) {
      throw fieldError('entryDate', 'Choose a real date.')
    }
    if (entryDate > todayFor(user, now)) {
      throw fieldError('entryDate', 'You can’t write an entry for a day that hasn’t come yet.')
    }
    if (body.trim().length === 0) {
      throw fieldError('body', 'Write something before saving.')
    }
    if (body.length > MAX_JOURNAL_LENGTH) {
      throw fieldError(
        'body',
        `Entries can be up to ${MAX_JOURNAL_LENGTH.toLocaleString('en-US')} characters.`
      )
    }

    const keys = { userId: user.id, entryDate }
    try {
      return await JournalEntry.updateOrCreate(keys, { body })
    } catch (error) {
      // Another save for the same date landed between our lookup and insert;
      // the unique constraint stopped the duplicate, so update that entry.
      if ((error as { code?: string }).code === '23505') {
        return JournalEntry.updateOrCreate(keys, { body })
      }
      throw error
    }
  }

  /**
   * Returns whether an entry existed to delete.
   */
  async delete(user: User, date: string): Promise<boolean> {
    const entryDate = parseCalendarDate(date)
    if (!entryDate) {
      return false
    }
    const result = await JournalEntry.query()
      .where('userId', user.id)
      .where('entryDate', entryDate)
      .delete()
    return Number(Array.isArray(result) ? result[0] : result) > 0
  }

  /**
   * The user's entries, newest date first.
   */
  async history(user: User, page: number, perPage = 20): Promise<JournalHistoryPage> {
    const entries = await JournalEntry.query()
      .where('userId', user.id)
      .orderBy('entryDate', 'desc')
      .paginate(page, perPage)

    return {
      items: entries.all().map((entry) => ({
        date: entry.entryDate,
        excerpt: this.excerptOf(entry.body),
      })),
      page: entries.currentPage,
      lastPage: entries.lastPage,
      total: entries.total,
    }
  }

  private excerptOf(body: string) {
    const flattened = body.replace(/\s+/g, ' ').trim()
    return flattened.length > EXCERPT_LENGTH
      ? `${flattened.slice(0, EXCERPT_LENGTH).trimEnd()}…`
      : flattened
  }
}
