import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export default function Home() {
  return (
    <div className="max-w-xl py-6 sm:py-12">
      <Head title="One day at a time" />

      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        One day at a time.
      </h1>
      <p className="mt-5 text-lg leading-8 text-muted-foreground">
        A private place for the daily practice of recovery: count your clean time, read the Daily
        Stoic and Just for Today, and write down how the day went.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link route="today.show" className={cn(buttonVariants(), 'h-11 px-5')}>
          Read today&rsquo;s readings
        </Link>
        <Link
          route="new_account.create"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-5')}
        >
          Create an account
        </Link>
        <Link
          route="session.create"
          className={cn(buttonVariants({ variant: 'ghost' }), 'h-11 px-5')}
        >
          Log in
        </Link>
      </div>
    </div>
  )
}
