import { useRef, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import { Field } from '~/components/field'
import { browserTimeZone, TimezoneField, todayIn } from '~/components/timezone_field'
import { Button } from '~/components/ui/button'

export default function Setup() {
  const [timeZone, setTimeZone] = useState(() => browserTimeZone() ?? 'UTC')
  const dateRef = useRef<HTMLInputElement>(null)

  return (
    <div className="mx-auto max-w-md">
      <Head title="Set up" />

      <h1 className="text-2xl font-semibold tracking-tight">Welcome to Ascend</h1>
      <p className="mt-2 text-muted-foreground">
        Ascend works one day at a time, on your own calendar. Choose your timezone so each day
        starts when yours does.
      </p>

      <Form route="setup.store" className="mt-8 grid gap-6">
        {({ errors, processing }) => (
          <>
            <TimezoneField error={errors.timezone} onChange={setTimeZone} />

            <Field
              ref={dateRef}
              type="date"
              name="startDate"
              label="The day you began (optional)"
              hint="Pick the day you started. You can add or change this later in Settings."
              max={todayIn(timeZone)}
              error={errors.startDate}
            />

            <div className="grid gap-2 sm:flex sm:items-center">
              <Button type="submit" className="h-11 px-5" disabled={processing}>
                {processing ? 'Saving' : 'Continue'}
              </Button>
              <Button
                type="submit"
                variant="ghost"
                className="h-11 px-5"
                disabled={processing}
                onClick={() => {
                  // Skip the clean time for now: submit with the date left blank.
                  if (dateRef.current) {
                    dateRef.current.value = ''
                  }
                }}
              >
                Skip clean time for now
              </Button>
            </div>
          </>
        )}
      </Form>
    </div>
  )
}
