import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import { Field } from '~/components/field'
import { Button } from '~/components/ui/button'

export default function Signup() {
  return (
    <div className="mx-auto max-w-sm">
      <Head title="Create an account" />

      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-1 text-muted-foreground">
        Your account is private. Setup takes about a minute.
      </p>

      <Form route="new_account.store" className="mt-8 grid gap-5">
        {({ errors, processing }) => (
          <>
            <Field
              type="text"
              name="fullName"
              label="Name (optional)"
              autoComplete="name"
              error={errors.fullName}
            />
            <Field
              type="email"
              name="email"
              label="Email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              error={errors.email}
            />
            <Field
              type="password"
              name="password"
              label="Password"
              hint="At least 8 characters."
              autoComplete="new-password"
              error={errors.password}
            />
            <Field
              type="password"
              name="passwordConfirmation"
              label="Confirm password"
              autoComplete="new-password"
              error={errors.passwordConfirmation}
            />

            <Button type="submit" className="h-11 w-full" disabled={processing}>
              {processing ? 'Creating account' : 'Create account'}
            </Button>
          </>
        )}
      </Form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link route="session.create" className="text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  )
}
