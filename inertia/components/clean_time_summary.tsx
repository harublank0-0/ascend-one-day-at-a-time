import { Link } from '@adonisjs/inertia/react'
import { buttonVariants } from '~/components/ui/button'
import { pluralDays, type CleanTime } from '~/lib/types'
import { cn } from '~/lib/utils'

type CleanTimeSummaryProps = {
  cleanTime: CleanTime
  /** On an earlier day, show the current count quietly instead of as the headline. */
  compact?: boolean
}

/**
 * Days clean. This is a count of completed local days since the start date, so
 * the day someone begins is day 0 and the next date is day 1. It only ever
 * reflects the clean start date; nothing about app usage feeds into it.
 */
export function CleanTimeSummary({ cleanTime, compact = false }: CleanTimeSummaryProps) {
  if (cleanTime.status === 'not_started') {
    return (
      <section aria-labelledby="clean-time-heading" className="py-8">
        <h2 id="clean-time-heading" className="text-sm font-medium text-muted-foreground">
          Clean time
        </h2>
        <p className="mt-2 max-w-prose text-base">
          Add the day you began and Ascend will keep count for you.
        </p>
        <Link
          route="settings.show"
          className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 h-11 px-4')}
        >
          Add your start date
        </Link>
      </section>
    )
  }

  const { daysClean, startDateLabel } = cleanTime

  if (compact) {
    return (
      <section aria-labelledby="clean-time-heading" className="py-5">
        <h2 id="clean-time-heading" className="sr-only">
          Clean time
        </h2>
        <p className="text-sm text-muted-foreground">
          Today you are at {daysClean} {pluralDays(daysClean)} clean.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="clean-time-heading" className="py-8">
      <h2 id="clean-time-heading" className="text-sm font-medium text-muted-foreground">
        Clean time
      </h2>
      <p className="mt-2 flex items-baseline gap-3">
        <span className="text-7xl font-semibold tracking-tighter tabular-nums sm:text-8xl">
          {daysClean}
        </span>
        <span className="text-xl text-muted-foreground">{pluralDays(daysClean)} clean</span>
      </p>
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">
        {daysClean === 0
          ? `Today is your start date, ${startDateLabel}. Each finished day adds one.`
          : `Counting finished days since ${startDateLabel}. The day you began was day 0.`}
      </p>
    </section>
  )
}
