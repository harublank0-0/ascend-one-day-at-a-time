import { Head, usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Field } from '~/components/field'
import { Button } from '~/components/ui/button'

export default function ForgotPassword() {
  const { flash } = usePage()

  return (
    <div className="mx-auto max-w-sm">
      <Head title="Forgot your password" />

      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-1 text-muted-foreground">
        Enter your email and we’ll send you a link to choose a new one.
      </p>

      <Form route="forgot_password.store" className="mt-8 grid gap-5">
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

            <Button type="submit" className="h-11 w-full" disabled={processing}>
              {processing ? 'Sending' : 'Send reset link'}
            </Button>
          </>
        )}
      </Form>

      <p className="mt-6 text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link route="session.create" className="text-foreground underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </div>
  )
}
