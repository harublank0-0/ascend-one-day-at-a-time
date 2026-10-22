/**
 * Shapes the server sends to the pages. They mirror what the controllers pass
 * to `inertia.render`, which is checked against the page props at build time.
 */

export type CleanTime =
  | { status: 'not_started' }
  | { status: 'active'; startDate: string; startDateLabel: string; daysClean: number }

export type Reading = {
  title: string | null
  content: string
  quote: { text: string; reference: string | null } | null
  closing: string | null
}

export type SourceReading = { slug: string; name: string; reading: Reading | null }

export type PreviousPeriod = {
  startDate: string
  startDateLabel: string
  endedOn: string
  endedOnLabel: string
  days: number
}

export function pluralDays(count: number) {
  return count === 1 ? 'day' : 'days'
}
