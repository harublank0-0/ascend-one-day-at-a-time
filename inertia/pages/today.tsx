import { Head } from '@inertiajs/react'
import { CleanTimeSummary } from '~/components/clean_time_summary'
import { DayNavigation } from '~/components/day_navigation'
import { JournalEditor } from '~/components/journal_editor'
import { ReadingSection } from '~/components/reading_section'
import type { CleanTime, SourceReading } from '~/lib/types'

type TodayProps = {
  date: string
  dateLabel: string
  isToday: boolean
  todayDate: string
  previousDate: string
  nextDate: string | null
  cleanTime: CleanTime
  readings: SourceReading[]
  entry: { body: string } | null
  maxJournalLength: number
}

export default function Today({
  date,
  dateLabel,
  isToday,
  previousDate,
  nextDate,
  cleanTime,
  readings,
  entry,
  maxJournalLength,
}: TodayProps) {
  return (
    <>
      <Head title={isToday ? 'Today' : dateLabel} />

      <DayNavigation
        dateLabel={dateLabel}
        isToday={isToday}
        previousDate={previousDate}
        nextDate={nextDate}
      />

      <CleanTimeSummary cleanTime={cleanTime} compact={!isToday} />

      {readings.map((source) => (
        <ReadingSection key={source.slug} {...source} />
      ))}

      <JournalEditor
        date={date}
        dateLabel={dateLabel}
        isToday={isToday}
        entry={entry}
        maxLength={maxJournalLength}
      />
    </>
  )
}
