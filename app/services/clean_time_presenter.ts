import type { CleanTimeSummary, PreviousPeriod } from '#services/clean_time_service'
import { longDate } from '#services/date_labels'

/**
 * Clean time as the pages receive it: the numbers from the service plus the
 * date text to show next to them.
 */
export function presentCleanTime(summary: CleanTimeSummary) {
  if (summary.status === 'not_started') {
    return summary
  }
  return {
    status: summary.status,
    startDate: summary.startDate,
    startDateLabel: longDate(summary.startDate),
    daysClean: summary.daysClean,
  }
}

export function presentPreviousPeriods(periods: PreviousPeriod[]) {
  return periods.map((period) => ({
    ...period,
    startDateLabel: longDate(period.startDate),
    endedOnLabel: longDate(period.endedOn),
  }))
}
