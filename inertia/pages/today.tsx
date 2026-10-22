import { Head } from '@inertiajs/react'
import { CleanTimeSummary } from '~/components/clean_time_summary'
import { DayNavigation } from '~/components/day_navigation'
import { GuestPrompt } from '~/components/guest_prompt'
import { JournalEditor } from '~/components/journal_editor'
import { ReadingSection } from '~/components/reading_section'
import { useRememberBrowserTimeZone } from '~/lib/guest_timezone'
import type { CleanTime, SourceReading } from '~/lib/types'

type TodayProps = {
  date: string
  dateLabel: string
  isToday: boolean
  todayDate: string
  previousDate: string
  nextDate: string | null
  readings: SourceReading[]
} & (
  | { isGuest: true; timeZone: string }
  | {
      isGuest: false
      cleanTime: CleanTime
      entry: { body: string } | null
      maxJournalLength: number
    }
)

export default function Today(props: TodayProps) {
  const { date, dateLabel, isToday, previousDate, nextDate, readings } = props

  // A guest has no saved timezone, so the browser tells the server its own.
  useRememberBrowserTimeZone(props.isGuest)

  return (
    <>
      <Head title={isToday ? 'Today' : dateLabel} />

      <DayNavigation
        dateLabel={dateLabel}
        isToday={isToday}
        previousDate={previousDate}
        nextDate={nextDate}
      />

      {!props.isGuest && <CleanTimeSummary cleanTime={props.cleanTime} compact={!isToday} />}

      {readings.map((source) => (
        <ReadingSection key={source.slug} {...source} />
      ))}

      {props.isGuest ? (
        <GuestPrompt />
      ) : (
        <JournalEditor
          date={date}
          dateLabel={dateLabel}
          isToday={isToday}
          entry={props.entry}
          maxLength={props.maxJournalLength}
        />
      )}
    </>
  )
}
