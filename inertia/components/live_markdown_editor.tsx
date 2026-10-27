import { useEffect, useRef, useState } from 'react'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder as placeholderExtension } from '@codemirror/view'
import { liveMarkdown } from '../../shared/live_markdown'
import { cn } from '~/lib/utils'

type LiveMarkdownEditorProps = {
  /** The text to start with. Later changes to it are ignored: the editor owns the text once mounted. */
  value: string
  /** The accessible name; the box has no visible label. */
  label: string
  placeholder?: string
  describedBy?: string
  invalid?: boolean
  autoFocus?: boolean
  onChange: (value: string) => void
}

/**
 * A box you type Markdown into, styled as you type (see shared/live_markdown).
 * It looks like the other inputs and is sized like a roomy textarea. Ctrl/Cmd+Enter
 * submits the form it is in.
 *
 * It is not a form field itself: the form gets its text from a hidden input the
 * parent keeps in step through `onChange`.
 */
export function LiveMarkdownEditor({
  value,
  label,
  placeholder,
  describedBy,
  invalid,
  autoFocus,
  onChange,
}: LiveMarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const latestOnChange = useRef(onChange)
  const [initialValue] = useState(value)

  useEffect(() => {
    latestOnChange.current = onChange
  })

  useEffect(() => {
    const parent = host.current
    if (!parent) {
      return
    }

    const editor = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          keymap.of([
            {
              key: 'Mod-Enter',
              run: () => {
                parent.closest('form')?.requestSubmit()
                return true
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          liveMarkdown(),
          EditorView.lineWrapping,
          placeholderExtension(placeholder ?? ''),
          EditorView.contentAttributes.of({
            'aria-label': label,
            'spellcheck': 'true',
            'autocapitalize': 'sentences',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              latestOnChange.current(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    view.current = editor
    if (autoFocus) {
      editor.focus()
    }

    return () => {
      editor.destroy()
      view.current = null
    }
  }, [initialValue, label, placeholder, autoFocus])

  useEffect(() => {
    const content = view.current?.contentDOM
    if (!content) {
      return
    }
    if (describedBy) {
      content.setAttribute('aria-describedby', describedBy)
    } else {
      content.removeAttribute('aria-describedby')
    }
    if (invalid) {
      content.setAttribute('aria-invalid', 'true')
    } else {
      content.removeAttribute('aria-invalid')
    }
  }, [describedBy, invalid])

  return (
    <div
      ref={host}
      className={cn(
        'w-full rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        invalid && 'border-destructive ring-3 ring-destructive/20 dark:ring-destructive/40'
      )}
    />
  )
}
