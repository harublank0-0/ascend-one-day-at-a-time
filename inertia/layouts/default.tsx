import { type Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { BookOpen, PenLine, Settings } from 'lucide-react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

const NAV_ITEMS = [
  { route: 'today.show', path: '/today', label: 'Today', icon: BookOpen },
  { route: 'journal.index', path: '/journal', label: 'Journal', icon: PenLine },
  { route: 'settings.show', path: '/settings', label: 'Settings', icon: Settings },
] as const

export default function Layout({ children }: { children: ReactElement<Data.SharedProps> }) {
  const { url, flash } = usePage()
  const user = children.props.user
  const pathname = url.split('?')[0]

  useEffect(() => {
    toast.dismiss()
  }, [url])

  useEffect(() => {
    if (flash.error) {
      toast.error(flash.error)
    }
    if (flash.success) {
      toast.success(flash.success)
    }
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>

      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-4 px-4">
          <Link
            route="home"
            className="-mx-2 inline-flex min-h-11 items-center px-2 text-lg font-semibold tracking-tight"
          >
            Ascend
          </Link>

          {user ? (
            <div className="flex items-center gap-1">
              <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.path
                  return (
                    <Link
                      key={item.route}
                      route={item.route}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                        active && 'bg-muted text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
              <Form route="session.destroy">
                <Button type="submit" variant="ghost" size="sm" className="h-11 px-3 sm:h-7">
                  Log out
                </Button>
              </Form>
            </div>
          ) : (
            <nav aria-label="Account" className="flex items-center gap-1">
              <Link
                route="today.show"
                aria-current={pathname === '/today' ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  pathname === '/today' && 'text-foreground'
                )}
              >
                Today
              </Link>
              <Link
                route="session.create"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                route="new_account.create"
                className="inline-flex min-h-11 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Sign up
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main
        id="main"
        className={cn(
          'mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10',
          user && 'pb-28 sm:pb-10'
        )}
      >
        {children}
      </main>

      {user && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          <ul className="mx-auto flex max-w-2xl">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.path
              return (
                <li key={item.route} className="flex-1">
                  <Link
                    route={item.route}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors',
                      active && 'text-foreground'
                    )}
                  >
                    <item.icon className="size-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      <Toaster position="top-center" richColors />
    </div>
  )
}
