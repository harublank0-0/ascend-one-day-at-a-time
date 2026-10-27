// The widgets below build DOM, and the server's TypeScript project has no DOM types.
/// <reference lib="dom" />
import { markdown } from '@codemirror/lang-markdown'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { StateField, type EditorState, type Extension, type Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { GFM } from '@lezer/markdown'

/**
 * Live Markdown for the journal box: you type Markdown, and it is styled as you
 * go. The marks (**, #, >, brackets) are hidden except on the line the cursor
 * is on, and dashes, task boxes and rules are drawn in place. The text itself
 * is never changed; this only decides how it is shown.
 *
 * The saved entry is drawn by TanStack Markdown (see shared/journal_markdown),
 * not by this file. This parser only needs to agree with it on the everyday
 * syntax the journal supports.
 */

const HIDDEN = Decoration.replace({})

class BulletWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM(view: EditorView) {
    const bullet = view.dom.ownerDocument.createElement('span')
    bullet.className = 'cm-live-bullet'
    bullet.textContent = '•'
    bullet.setAttribute('aria-hidden', 'true')
    return bullet
  }
}

class RuleWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM(view: EditorView) {
    const rule = view.dom.ownerDocument.createElement('span')
    rule.className = 'cm-live-rule'
    rule.setAttribute('aria-hidden', 'true')
    return rule
  }
}

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    /** Where the [ ] of this task starts in the text. */
    readonly markerPos: number
  ) {
    super()
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.markerPos === this.markerPos
  }

  toDOM(view: EditorView) {
    const box = view.dom.ownerDocument.createElement('input')
    box.type = 'checkbox'
    box.checked = this.checked
    box.className = 'cm-live-checkbox'
    box.tabIndex = -1
    box.setAttribute('aria-label', this.checked ? 'Done' : 'Not done')
    // Keep the cursor where it was; the box only ticks the task.
    box.addEventListener('mousedown', (event: { preventDefault(): void }) => event.preventDefault())
    box.addEventListener('click', (event: { preventDefault(): void }) => {
      event.preventDefault()
      const change = taskToggleChange(view.state, this.markerPos)
      if (change) {
        view.dispatch({ changes: change })
      }
    })
    return box
  }

  ignoreEvent() {
    return true
  }
}

/**
 * The edit that ticks or unticks the task whose [ ] starts at `markerPos`, or
 * null if there is no task box there.
 */
export function taskToggleChange(state: EditorState, markerPos: number) {
  const match = /^\[([ xX])\]$/.exec(state.doc.sliceString(markerPos, markerPos + 3))
  if (!match) {
    return null
  }
  return { from: markerPos + 1, to: markerPos + 2, insert: match[1] === ' ' ? 'x' : ' ' }
}

const MARKED_RANGES = {
  StrongEmphasis: { mark: 'cm-live-strong', marks: 'EmphasisMark' },
  Emphasis: { mark: 'cm-live-em', marks: 'EmphasisMark' },
  Strikethrough: { mark: 'cm-live-strike', marks: 'StrikethroughMark' },
  InlineCode: { mark: 'cm-live-code', marks: 'CodeMark' },
} as const

/**
 * What to hide, draw and style for the current text and cursor. Lines the
 * selection touches keep their marks visible so they can be edited.
 */
export function liveDecorations(state: EditorState): DecorationSet {
  const { doc } = state
  const tree = ensureSyntaxTree(state, doc.length, 100) ?? syntaxTree(state)
  const ranges: Range<Decoration>[] = []
  const styledLines = new Set<string>()

  const activeLines = new Set<number>()
  for (const range of state.selection.ranges) {
    const last = doc.lineAt(range.to).number
    for (let line = doc.lineAt(range.from).number; line <= last; line++) {
      activeLines.add(line)
    }
  }
  const touched = (pos: number) => activeLines.has(doc.lineAt(pos).number)

  const hide = (from: number, to: number) => {
    if (to > from) {
      ranges.push(HIDDEN.range(from, to))
    }
  }
  const spaceAfter = (pos: number) => (doc.sliceString(pos, pos + 1) === ' ' ? 1 : 0)
  const styleLine = (pos: number, className: string) => {
    const line = doc.lineAt(pos)
    const key = `${line.from}:${className}`
    if (!styledLines.has(key)) {
      styledLines.add(key)
      ranges.push(Decoration.line({ class: className }).range(line.from))
    }
  }
  const styleLines = (from: number, to: number, className: string) => {
    for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) {
      styleLine(doc.line(n).from, className)
    }
  }

  tree.iterate({
    enter(node) {
      const heading = /^ATXHeading([1-6])$/.exec(node.name)
      if (heading) {
        styleLine(node.from, `cm-live-h${heading[1]}`)
        const mark = node.node.getChild('HeaderMark')
        if (mark && !touched(mark.from)) {
          hide(mark.from, mark.to + spaceAfter(mark.to))
        }
        return
      }

      if (node.name in MARKED_RANGES) {
        const { mark, marks } = MARKED_RANGES[node.name as keyof typeof MARKED_RANGES]
        ranges.push(Decoration.mark({ class: mark }).range(node.from, node.to))
        for (const child of node.node.getChildren(marks)) {
          if (!touched(child.from)) {
            hide(child.from, child.to)
          }
        }
        return
      }

      switch (node.name) {
        case 'Link': {
          const [open, close] = node.node.getChildren('LinkMark')
          if (open && close) {
            ranges.push(Decoration.mark({ class: 'cm-live-link' }).range(open.to, close.from))
            if (!touched(node.from)) {
              hide(open.from, open.to)
              hide(close.from, node.to)
            }
          }
          return
        }

        case 'Blockquote':
          styleLines(node.from, node.to, 'cm-live-quote')
          return

        // The first > of a quote belongs to the quote, the later ones to its
        // paragraph, so they are found by name rather than by parent.
        case 'QuoteMark':
          if (!touched(node.from)) {
            hide(node.from, node.to + spaceAfter(node.to))
          }
          return

        case 'FencedCode':
          styleLines(node.from, node.to, 'cm-live-codeblock')
          return

        case 'ListMark': {
          const isBullet = node.node.parent?.parent?.name === 'BulletList'
          const isTask = /^[ \t]+\[[ xX]\](?=\s|$)/.test(
            doc.sliceString(node.to, doc.lineAt(node.to).to)
          )
          if (isBullet && !isTask && !touched(node.from)) {
            ranges.push(
              Decoration.replace({ widget: new BulletWidget() }).range(
                node.from,
                node.to + spaceAfter(node.to)
              )
            )
          }
          return
        }

        case 'TaskMarker': {
          if (touched(node.from)) {
            return
          }
          // The dash before the box is part of what the checkbox stands in for.
          const line = doc.lineAt(node.from)
          const dash = /^[ \t]*[-*+][ \t]+$/.exec(doc.sliceString(line.from, node.from))
          if (!dash) {
            return
          }
          const from = line.from + dash[0].search(/[-*+]/)
          const checked = doc.sliceString(node.from + 1, node.from + 2) !== ' '
          ranges.push(
            Decoration.replace({ widget: new CheckboxWidget(checked, node.from) }).range(
              from,
              node.to + spaceAfter(node.to)
            )
          )
          return
        }

        case 'HorizontalRule':
          if (!touched(node.from)) {
            ranges.push(Decoration.replace({ widget: new RuleWidget() }).range(node.from, node.to))
          }
          return
      }
    },
  })

  return Decoration.set(ranges, true)
}

const liveField = StateField.define<DecorationSet>({
  create: (state) => liveDecorations(state),
  update: (value, transaction) =>
    transaction.docChanged ||
    transaction.selection ||
    syntaxTree(transaction.state) !== syntaxTree(transaction.startState)
      ? liveDecorations(transaction.state)
      : value,
  provide: (field) => [
    EditorView.decorations.from(field),
    // The cursor steps over a hidden mark instead of stopping inside it.
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
})

const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const liveTheme = EditorView.theme({
  '&': { fontSize: '1.0625rem', color: 'inherit', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '2rem', overflow: 'visible' },
  '.cm-content': { padding: '0.5rem 0.625rem', minHeight: '12rem', caretColor: 'currentColor' },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: 'var(--muted-foreground)' },

  '.cm-live-h1': { fontSize: '1.5em', fontWeight: '600', lineHeight: '1.4' },
  '.cm-live-h2': { fontSize: '1.25em', fontWeight: '600', lineHeight: '1.5' },
  '.cm-live-h3': { fontSize: '1.125em', fontWeight: '600' },
  '.cm-live-h4, .cm-live-h5, .cm-live-h6': { fontWeight: '600' },

  '.cm-live-strong': { fontWeight: '700' },
  '.cm-live-em': { fontStyle: 'italic' },
  '.cm-live-strike': { textDecoration: 'line-through' },
  '.cm-live-code': {
    fontFamily: mono,
    fontSize: '0.9em',
    backgroundColor: 'var(--muted)',
    borderRadius: '0.25rem',
    padding: '0.125rem 0.25rem',
  },
  '.cm-live-link': { textDecoration: 'underline', textUnderlineOffset: '4px' },

  '.cm-live-quote': {
    borderLeft: '2px solid var(--border)',
    paddingLeft: '1rem',
    color: 'var(--muted-foreground)',
    fontStyle: 'italic',
  },
  '.cm-live-codeblock': {
    fontFamily: mono,
    fontSize: '0.9em',
    lineHeight: '1.6',
    backgroundColor: 'var(--muted)',
    padding: '0 1rem',
  },

  '.cm-live-bullet': { display: 'inline-block', width: '1.25em', textAlign: 'center' },
  '.cm-live-checkbox': {
    width: '1rem',
    height: '1rem',
    margin: '0 0.5rem 0 0',
    verticalAlign: '-0.15em',
    accentColor: 'var(--foreground)',
    cursor: 'pointer',
  },
  '.cm-live-rule': {
    display: 'inline-block',
    width: '100%',
    height: '0',
    borderTop: '1px solid var(--border)',
    verticalAlign: 'middle',
  },
})

/**
 * The Markdown language (CommonMark plus the GFM pieces the journal uses: task
 * lists and strike-through), the live styling, and its theme.
 */
export function liveMarkdown(): Extension {
  return [markdown({ extensions: GFM }), liveField, liveTheme]
}
