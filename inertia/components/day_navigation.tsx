import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@adonisjs/inertia/react'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'

type DayNavigationProps = {
  dateLabel: string
  isToday: boolean
  previousDate: string
  nextDate: string | null
}

const arrow = cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-11')

/**
 * Moves one day back or forward and returns to today. The readings and the
 * journal below all follow the date chosen here.
 */
export function DayNavigation({ dateLabel, isToday, previousDate, nextDate }: DayNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        route="today.show"
        qs={{ date: previousDate }}
        className={arrow}
        aria-label="Previous day"
        preserveScroll={false}
      >
        <ChevronLeft aria-hidden="true" />
      </Link>

      <div className="min-w-0 text-center">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{dateLabel}</h1>
        {isToday ? (
          <p className="text-sm text-muted-foreground">Today</p>
        ) : (
          <Link route="today.show" className="text-sm underline underline-offset-4">
            Back to today
          </Link>
        )}
      </div>

      {nextDate ? (
        <Link route="today.show" qs={{ date: nextDate }} className={arrow} aria-label="Next day">
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        // Nothing lies beyond today. Keep the space so the date stays centred.
        <span className="size-11 shrink-0" aria-hidden="true" />
      )}
    </div>
  )
}
