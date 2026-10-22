import { ContentSources } from '#constants/content_sources'
import DailyContent from '#models/daily_content'
import { monthDayOf, type CalendarDate } from '#services/calendar_dates'

export type Reading = {
  title: string | null
  content: string
  quote: { text: string; reference: string | null } | null
  closing: string | null
}

/**
 * One source's slot for a date. `reading` is null when that source has nothing
 * for the day; the page says so rather than showing something else.
 */
export type SourceReading = { slug: string; name: string; reading: Reading | null }

/**
 * Sources in the order the page shows them.
 */
const SOURCES = [ContentSources.THE_DAILY_STOIC, ContentSources.JFT]

/**
 * Looks up the imported readings for a calendar date. Readings repeat every
 * year, so they are found by source, month and day; see
 * docs/adr/0001-time-and-timezone-handling.md for how February 29 behaves.
 */
export default class DailyReadingService {
  async forDate(date: CalendarDate): Promise<SourceReading[]> {
    const { month, day } = monthDayOf(date)

    const rows = await DailyContent.query()
      .join('content_sources', 'content_sources.id', 'daily_contents.content_source_id')
      .whereIn(
        'content_sources.slug',
        SOURCES.map((source) => source.slug)
      )
      .where('daily_contents.month', month)
      .where('daily_contents.day', day)
      .select('daily_contents.*', 'content_sources.slug as source_slug')

    const bySlug = new Map(rows.map((row) => [row.$extras.source_slug as string, row]))

    return SOURCES.map((source) => ({
      slug: source.slug,
      name: source.name,
      reading: this.toReading(bySlug.get(source.slug)),
    }))
  }

  private toReading(row: DailyContent | undefined): Reading | null {
    if (!row) {
      return null
    }

    const metadata = (row.metadata ?? {}) as {
      closing?: string | null
      quote?: { text?: string | null; reference?: string | null } | null
    }
    const quoteText = metadata.quote?.text?.trim()

    return {
      title: row.title.trim() || null,
      content: row.content,
      quote: quoteText ? { text: quoteText, reference: metadata.quote?.reference || null } : null,
      closing: metadata.closing?.trim() || null,
    }
  }
}
