import { useState } from 'react'
import { Check, LoaderCircle, Trash2 } from 'lucide-react'
import { Form } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
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

type JournalEditorProps = {
  date: string
  dateLabel: string
  isToday: boolean
  entry: { body: string } | null
  maxLength: number
}

/**
 * A plain-text journal for one date. Writing is saved only when asked
 * (the Save button, or Ctrl/Cmd+Enter). If a save fails the typed text stays in
 * the box and the reason is shown beside it.
 */
export function JournalEditor({ date, dateLabel, isToday, entry, maxLength }: JournalEditorProps) {
  // Keyed by date so moving to another day starts from that day's entry.
  return (
    <section aria-labelledby="journal-heading" className="border-t py-8">
      <h2 id="journal-heading" className="text-sm font-medium text-muted-foreground">
        Journal
      </h2>
      <Editor key={date} {...{ date, dateLabel, isToday, entry, maxLength }} />
    </section>
  )
}

function Editor({ date, dateLabel, isToday, entry, maxLength }: JournalEditorProps) {
  const [length, setLength] = useState(entry?.body.length ?? 0)
  const nearLimit = length > maxLength * 0.9

  return (
    <>
      <Form
        route="journal.update"
        routeParams={{ date }}
        options={{ preserveScroll: true }}
        className="mt-3 grid gap-3"
      >
        {({ errors: formErrors, processing, recentlySuccessful, isDirty, clearErrors }) => {
          const errors = formErrors as { body?: string; entryDate?: string }
          return (
            <>
              <Label htmlFor="journal-body" className="sr-only">
                Your reflection for {dateLabel}
              </Label>
              <Textarea
                id="journal-body"
                name="body"
                defaultValue={entry?.body ?? ''}
                placeholder={isToday ? 'What is on your mind today?' : 'Write about this day.'}
                className="min-h-48 text-[1.0625rem] leading-8 md:text-[1.0625rem]"
                aria-invalid={errors.body || errors.entryDate ? true : undefined}
                aria-describedby="journal-status journal-count"
                onChange={(event) => {
                  setLength(event.target.value.length)
                  // The message was about the text as it was; stop showing it once it is edited.
                  if (errors.body || errors.entryDate) {
                    clearErrors()
                  }
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
              />

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button type="submit" className="h-11 px-5" disabled={processing}>
                  {processing ? (
                    <>
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                      Saving
                    </>
                  ) : entry ? (
                    'Save changes'
                  ) : (
                    'Save entry'
                  )}
                </Button>

                <p id="journal-status" role="status" className="text-sm text-muted-foreground">
                  {processing ? (
                    'Saving'
                  ) : errors.body || errors.entryDate ? null : recentlySuccessful ? (
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <Check className="size-4" aria-hidden="true" />
                      Saved
                    </span>
                  ) : isDirty ? (
                    'Not saved yet'
                  ) : entry ? (
                    'Saved'
                  ) : null}
                </p>

                <p
                  id="journal-count"
                  className={`ml-auto text-sm tabular-nums ${nearLimit ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {length.toLocaleString('en-US')} / {maxLength.toLocaleString('en-US')}
                </p>
              </div>

              {(errors.body || errors.entryDate) && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.body ?? errors.entryDate}
                </p>
              )}
            </>
          )
        }}
      </Form>

      {entry && <DeleteEntry date={date} dateLabel={dateLabel} />}
    </>
  )
}

function DeleteEntry({ date, dateLabel }: { date: string; dateLabel: string }) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" className="mt-2 -ml-2 h-11 px-3 text-muted-foreground">
            <Trash2 aria-hidden="true" />
            Delete this entry
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            Your journal entry for {dateLabel} will be removed for good. This can&rsquo;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form
          route="journal.destroy"
          routeParams={{ date }}
          options={{ preserveScroll: true }}
          onSuccess={() => setOpen(false)}
        >
          {({ processing }) => (
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11 px-4">Keep entry</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                className="h-11 px-4"
                disabled={processing}
              >
                {processing ? 'Deleting' : 'Delete entry'}
              </Button>
            </AlertDialogFooter>
          )}
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
