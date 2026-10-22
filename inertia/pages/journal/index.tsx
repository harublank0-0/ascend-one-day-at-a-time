import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'

type JournalIndexProps = {
  items: Array<{ date: string; dateLabel: string; excerpt: string }>
  page: number
  lastPage: number
  total: number
  todayDate: string
}

export default function JournalIndex({ items, page, lastPage, total }: JournalIndexProps) {
  return (
    <>
      <Head title="Journal" />

      <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
      <p className="mt-1 text-muted-foreground">
        Your entries, newest first. Only you can see them.
      </p>

      {total === 0 ? (
        <div className="mt-10 max-w-prose">
          <p className="text-lg">Nothing here yet.</p>
          <p className="mt-2 text-muted-foreground">
            When you save a reflection on the Today page, it shows up here.
          </p>
          <Link
            route="today.show"
            className={cn(buttonVariants({ variant: 'outline' }), 'mt-5 h-11 px-4')}
          >
            Write today&rsquo;s entry
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 divide-y border-y">
            {items.map((item) => (
              <li key={item.date}>
                <Link
                  route="today.show"
                  qs={{ date: item.date }}
                  className="block rounded-md py-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="block font-medium">{item.dateLabel}</span>
                  <span className="mt-1 line-clamp-2 block text-muted-foreground">
                    {item.excerpt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {lastPage > 1 && (
            <nav aria-label="Journal pages" className="mt-6 flex items-center justify-between">
              {page > 1 ? (
                <Link
                  route="journal.index"
                  qs={{ page: page - 1 }}
                  className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-4')}
                >
                  Newer entries
                </Link>
              ) : (
                <span />
              )}
              <p className="text-sm text-muted-foreground">
                Page {page} of {lastPage}
              </p>
              {page < lastPage ? (
                <Link
                  route="journal.index"
                  qs={{ page: page + 1 }}
                  className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-4')}
                >
                  Older entries
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </>
  )
}
