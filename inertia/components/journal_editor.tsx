import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import { Form } from '@adonisjs/inertia/react'
import { MarkdownContent } from '~/components/markdown_content'
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

/**
 * The editor library is large and only the writing box needs it, so it loads
 * when the box is first shown: guests, the Journal list and a saved entry that
 * is only being read never download it.
 */
const LiveMarkdownEditor = lazy(() =>
  import('~/components/live_markdown_editor').then((module) => ({
    default: module.LiveMarkdownEditor,
  }))
)

type JournalEditorProps = {
  date: string
  dateLabel: string
  isToday: boolean
  entry: { body: string } | null
  maxLength: number
}

type EntryProps = JournalEditorProps & {
  /**
   * Called when a save starts. A successful save closes the editor, and focus
   * should go to Edit instead of being lost. This is asked at the start because
   * for a new entry the page changes before the save's success callback runs.
   */
  askForEditFocus: () => void
  /** Called when a save fails: the editor stays open, so focus has nowhere to move. */
  cancelEditFocusRequest: () => void
  /** True once, if a save asked for focus to return to Edit. */
  takeEditFocusRequest: () => boolean
}

/**
 * A journal for one date, written in Markdown. A day with no entry shows the
 * writing box. A saved entry is shown as it reads, with an Edit button that
 * opens the box again. Writing is saved only when asked (the Save button, or
 * Ctrl/Cmd+Enter). If a save fails the typed text stays in the box and the
 * reason is shown beside it.
 */
export function JournalEditor(props: JournalEditorProps) {
  const focusEditRef = useRef(false)
  const askForEditFocus = useCallback(() => {
    focusEditRef.current = true
  }, [])
  const cancelEditFocusRequest = useCallback(() => {
    focusEditRef.current = false
  }, [])
  const takeEditFocusRequest = useCallback(() => {
    const asked = focusEditRef.current
    focusEditRef.current = false
    return asked
  }, [])

  return (
    <section aria-labelledby="journal-heading" className="border-t py-8">
      <h2 id="journal-heading" className="text-sm font-medium text-muted-foreground">
        Journal
      </h2>
      {/*
        Keyed by date, and by whether the day has an entry, so moving to another
        day starts from that day's entry and deleting an entry opens the box.
      */}
      <Entry
        key={`${props.date}:${props.entry ? 'saved' : 'empty'}`}
        askForEditFocus={askForEditFocus}
        cancelEditFocusRequest={cancelEditFocusRequest}
        takeEditFocusRequest={takeEditFocusRequest}
        {...props}
      />
    </section>
  )
}

function Entry(props: EntryProps) {
  const [editing, setEditing] = useState(props.entry === null)

  if (props.entry && !editing) {
    return <SavedEntry {...props} entry={props.entry} onEdit={() => setEditing(true)} />
  }

  return (
    <Editor
      {...props}
      onSaveStart={props.askForEditFocus}
      onSaveFailed={props.cancelEditFocusRequest}
      onSaved={() => setEditing(false)}
      onCancel={props.entry ? () => setEditing(false) : undefined}
    />
  )
}

function SavedEntry({
  date,
  dateLabel,
  entry,
  takeEditFocusRequest,
  onEdit,
}: EntryProps & { entry: { body: string }; onEdit: () => void }) {
  const editButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (takeEditFocusRequest()) {
      editButton.current?.focus()
    }
  }, [takeEditFocusRequest])

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p role="status" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Check className="size-4" aria-hidden="true" />
          Saved
        </p>
        <Button ref={editButton} variant="outline" className="h-11 px-4" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          Edit
        </Button>
      </div>

      <article aria-label={`Your entry for ${dateLabel}`} className="mt-4 max-w-[62ch]">
        <MarkdownContent source={entry.body} className="text-[1.0625rem] leading-8" />
      </article>

      <DeleteEntry date={date} dateLabel={dateLabel} />
    </>
  )
}

function Editor({
  date,
  dateLabel,
  isToday,
  entry,
  maxLength,
  onSaveStart,
  onSaveFailed,
  onSaved,
  onCancel,
}: EntryProps & {
  onSaveStart: () => void
  onSaveFailed: () => void
  onSaved: () => void
  onCancel?: () => void
}) {
  const savedBody = entry?.body ?? ''
  const [draft, setDraft] = useState(savedBody)
  const nearLimit = draft.length > maxLength * 0.9
  const changed = draft !== savedBody

  return (
    <Form
      route="journal.update"
      routeParams={{ date }}
      options={{ preserveScroll: true }}
      onStart={onSaveStart}
      onError={onSaveFailed}
      onSuccess={onSaved}
      className="mt-3 grid gap-3"
    >
      {({ errors: formErrors, processing, recentlySuccessful, clearErrors }) => {
        const errors = formErrors as { body?: string; entryDate?: string }
        const failed = Boolean(errors.body || errors.entryDate)
        return (
          <>
            {/* The editor is not a form field, so the form reads the text from here. */}
            <input type="hidden" name="body" value={draft} />

            <div className="grid gap-2">
              <Suspense fallback={<EditorPlaceholder />}>
                <LiveMarkdownEditor
                  value={savedBody}
                  label={`Your reflection for ${dateLabel}`}
                  placeholder={isToday ? 'What is on your mind today?' : 'Write about this day.'}
                  autoFocus={entry !== null}
                  invalid={failed}
                  describedBy="journal-status journal-count journal-markdown-hint"
                  onChange={(text) => {
                    setDraft(text)
                    // The message was about the text as it was; stop showing it once it is edited.
                    if (failed) {
                      clearErrors()
                    }
                  }}
                />
              </Suspense>
              <p id="journal-markdown-hint" className="text-sm text-muted-foreground">
                Markdown works here: <code>**bold**</code>, <code>_italic_</code>,{' '}
                <code>- list</code>, <code>- [ ] task</code>, <code>&gt; quote</code>.
              </p>
            </div>

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

              {onCancel && <CancelEdit changed={changed} onDiscard={onCancel} />}

              <p id="journal-status" role="status" className="text-sm text-muted-foreground">
                {processing ? (
                  'Saving'
                ) : failed ? null : recentlySuccessful ? (
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <Check className="size-4" aria-hidden="true" />
                    Saved
                  </span>
                ) : changed ? (
                  'Not saved yet'
                ) : entry ? (
                  'Saved'
                ) : null}
              </p>

              <p
                id="journal-count"
                className={`ml-auto text-sm tabular-nums ${nearLimit ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {draft.length.toLocaleString('en-US')} / {maxLength.toLocaleString('en-US')}
              </p>
            </div>

            {failed && (
              <p role="alert" className="text-sm text-destructive">
                {errors.body ?? errors.entryDate}
              </p>
            )}
          </>
        )
      }}
    </Form>
  )
}

/**
 * Holds the writing box's place, at its size, while the editor loads.
 */
function EditorPlaceholder() {
  return (
    <div className="min-h-[14.5rem] w-full rounded-lg border border-input" aria-busy="true">
      <p role="status" className="sr-only">
        Loading the editor
      </p>
    </div>
  )
}

/**
 * Leaves the editor for the saved entry. Asks first only when there is typed
 * text that would be lost.
 */
function CancelEdit({ changed, onDiscard }: { changed: boolean; onDiscard: () => void }) {
  if (!changed) {
    return (
      <Button type="button" variant="ghost" className="h-11 px-4" onClick={onDiscard}>
        Cancel
      </Button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="ghost" className="h-11 px-4">
            Cancel
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
          <AlertDialogDescription>
            What you changed in this entry hasn&rsquo;t been saved, and will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 px-4">Keep editing</AlertDialogCancel>
          <Button type="button" variant="destructive" className="h-11 px-4" onClick={onDiscard}>
            Discard changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
