import { Head, usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Field } from '~/components/field'
import { Button } from '~/components/ui/button'

export default function Login() {
  const { flash } = usePage()

  return (
    <div className="mx-auto max-w-sm">
      <Head title="Log in" />

      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="mt-1 text-muted-foreground">Welcome back.</p>

      <Form route="session.store" className="mt-8 grid gap-5">
        {({ errors, processing }) => (
          <>
            {flash.error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {flash.error}
              </p>
            )}
            {flash.success && (
              <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
                {flash.success}
              </p>
            )}

            <Field
              type="email"
              name="email"
              label="Email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              error={errors.email}
            />
            <Field
              type="password"
              name="password"
              label="Password"
              autoComplete="current-password"
              error={errors.password}
            />
            <Link
              route="forgot_password.create"
              className="-mt-2 justify-self-end py-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot your password?
            </Link>

            <Button type="submit" className="h-11 w-full" disabled={processing}>
              {processing ? 'Logging in' : 'Log in'}
            </Button>
          </>
        )}
      </Form>

      <p className="mt-6 text-sm text-muted-foreground">
        New here?{' '}
        <Link route="new_account.create" className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  )
}
