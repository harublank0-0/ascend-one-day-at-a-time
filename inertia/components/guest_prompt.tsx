import { Link } from '@adonisjs/inertia/react'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'

/**
 * What a signed-out visitor sees where a signed-in user has their clean time
 * and journal. The readings above it are open to everyone.
 */
export function GuestPrompt() {
  return (
    <section aria-labelledby="guest-prompt-heading" className="border-t py-8">
      <h2 id="guest-prompt-heading" className="text-lg font-semibold">
        Keep your own days
      </h2>
      <p className="mt-2 max-w-prose text-muted-foreground">
        The readings are open to everyone. With an account you can also count your clean time and
        write a private journal that only you can see.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link route="new_account.create" className={cn(buttonVariants(), 'h-11 px-5')}>
          Create an account
        </Link>
        <Link
          route="session.create"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-5')}
        >
          Log in
        </Link>
      </div>
    </section>
  )
}
