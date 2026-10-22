import { useState } from 'react'
import { Head } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'
import { Field } from '~/components/field'
import { TimezoneField } from '~/components/timezone_field'
import { Button } from '~/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert_dialog'
import { pluralDays, type CleanTime, type PreviousPeriod } from '~/lib/types'

type SettingsProps = {
  timezone: string
  todayDate: string
  todayLabel: string
  cleanTime: CleanTime
  previousPeriods: PreviousPeriod[]
}

export default function Settings({
  timezone,
  todayDate,
  todayLabel,
  cleanTime,
  previousPeriods,
}: SettingsProps) {
  return (
    <>
      <Head title="Settings" />
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section aria-labelledby="timezone-heading" className="mt-8 border-t pt-8">
        <h2 id="timezone-heading" className="text-lg font-semibold">
          Timezone
        </h2>
        <p className="mt-1 max-w-prose text-muted-foreground">
          Decides when a new day begins for you. Right now it is {todayLabel}.
        </p>
        <Form route="timezone.update" className="mt-5 grid max-w-md gap-4">
          {({ errors, processing }) => (
            <>
              <TimezoneField value={timezone} error={errors.timezone} />
              <div>
                <Button type="submit" className="h-11 px-5" disabled={processing}>
                  {processing ? 'Saving' : 'Save timezone'}
                </Button>
              </div>
            </>
          )}
        </Form>
      </section>

      <section aria-labelledby="clean-time-settings-heading" className="mt-10 border-t pt-8">
        <h2 id="clean-time-settings-heading" className="text-lg font-semibold">
          Clean time
        </h2>
        <p className="mt-1 max-w-prose text-muted-foreground">
          Your count is the number of finished days since your start date. The day you begin is day
          0. It is only about your clean time, never how often you use Ascend.
        </p>

        {cleanTime.status === 'not_started' ? (
          <Form route="clean_time.store" className="mt-5 grid max-w-md gap-4">
            {({ errors, processing }) => (
              <>
                <Field
                  type="date"
                  name="startDate"
                  label="The day you began"
                  max={todayDate}
                  error={errors.startDate}
                />
                <div>
                  <Button type="submit" className="h-11 px-5" disabled={processing}>
                    {processing ? 'Saving' : 'Save start date'}
                  </Button>
                </div>
              </>
            )}
          </Form>
        ) : (
          <>
            <p className="mt-5">
              <span className="text-3xl font-semibold tabular-nums">{cleanTime.daysClean}</span>{' '}
              <span className="text-muted-foreground">
                {pluralDays(cleanTime.daysClean)} clean, since {cleanTime.startDateLabel}
              </span>
            </p>

            {/* Keyed by the saved date so the field and any old error reset when the date changes. */}
            <Form
              key={cleanTime.startDate}
              route="clean_time.update"
              className="mt-5 grid max-w-md gap-4"
            >
              {({ errors, processing }) => (
                <>
                  <Field
                    type="date"
                    name="startDate"
                    label="Correct your start date"
                    hint="Use this to fix a mistake. It changes the count to match."
                    defaultValue={cleanTime.startDate}
                    max={todayDate}
                    error={errors.startDate}
                  />
                  <div>
                    <Button type="submit" className="h-11 px-5" disabled={processing}>
                      {processing ? 'Saving' : 'Update start date'}
                    </Button>
                  </div>
                </>
              )}
            </Form>

            <NewPeriod todayDate={todayDate} daysClean={cleanTime.daysClean} />
          </>
        )}

        {previousPeriods.length > 0 && (
          <div className="mt-8">
            <h3 className="font-medium">Earlier periods</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every stretch you have counted stays on record.
            </p>
            <ul className="mt-3 divide-y border-y">
              {previousPeriods.map((period) => (
                <li key={period.startDate} className="py-3">
                  {period.startDateLabel} to {period.endedOnLabel}
                  <span className="text-muted-foreground">
                    {' '}
                    &mdash; {period.days} {pluralDays(period.days)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  )
}

function NewPeriod({ todayDate, daysClean }: { todayDate: string; daysClean: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-8 max-w-prose">
      <h3 className="font-medium">Starting again</h3>
      <p className="mt-1 text-muted-foreground">
        If you want to begin a new period, you can. What you have counted so far stays in your
        history, and your journal is not touched.
      </p>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button variant="outline" className="mt-4 h-11 px-4">
              Start a new period
            </Button>
          }
        />
        <AlertDialogContent>
          <Form
            route="new_clean_period.store"
            className="grid gap-4"
            onSuccess={() => setOpen(false)}
          >
            {({ errors, processing }) => (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start a new clean period?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your current period ({daysClean} {pluralDays(daysClean)}) will be saved to your
                    history, and a new one will begin on the day you choose. Your journal stays
                    exactly as it is.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <input type="hidden" name="confirmed" value="true" />
                <Field
                  type="date"
                  name="startDate"
                  label="New start date"
                  defaultValue={todayDate}
                  max={todayDate}
                  error={errors.startDate}
                />

                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11 px-4">Not now</AlertDialogCancel>
                  <Button type="submit" className="h-11 px-4" disabled={processing}>
                    {processing ? 'Saving' : 'Start new period'}
                  </Button>
                </AlertDialogFooter>
              </>
            )}
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
