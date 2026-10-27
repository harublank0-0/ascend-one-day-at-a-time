import { Head } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import { Field } from '~/components/field'
import { Button } from '~/components/ui/button'

type ResetPasswordProps = {
  token: string
}

export default function ResetPassword({ token }: ResetPasswordProps) {
  return (
    <div className="mx-auto max-w-sm">
      <Head title="Choose a new password">
        {/* The address of this page carries the token; do not pass it on. */}
        <meta name="referrer" content="no-referrer" />
      </Head>

      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-muted-foreground">You’ll log in with it straight after.</p>

      <Form route="reset_password.store" className="mt-8 grid gap-5">
        {({ errors, processing }) => (
          <>
            <input type="hidden" name="token" value={token} />

            <Field
              type="password"
              name="password"
              label="New password"
              hint="At least 8 characters."
              autoComplete="new-password"
              error={errors.password}
            />
            <Field
              type="password"
              name="passwordConfirmation"
              label="Confirm new password"
              autoComplete="new-password"
              error={errors.passwordConfirmation}
            />

            <Button type="submit" className="h-11 w-full" disabled={processing}>
              {processing ? 'Saving' : 'Change password'}
            </Button>
          </>
        )}
      </Form>
    </div>
  )
}
