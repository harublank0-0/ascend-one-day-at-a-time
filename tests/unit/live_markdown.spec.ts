import { test } from '@japa/runner'
import { EditorState } from '@codemirror/state'
import { liveDecorations, liveMarkdown, taskToggleChange } from '#shared/live_markdown'

type Seen = { from: number; to: number; kind: string; checked?: boolean }

/**
 * What the live styling does to a document, as a plain list. "hidden" is a
 * mark taken off the page; line decorations and styled ranges show their class;
 * drawn replacements show the name of the widget.
 */
function seen(doc: string, anchor = 0, head = anchor): Seen[] {
  const state = EditorState.create({
    doc,
    selection: { anchor, head },
    extensions: [liveMarkdown()],
  })
  const found: Seen[] = []
  liveDecorations(state).between(0, doc.length, (from, to, value) => {
    const spec = value.spec as { class?: string; widget?: { checked?: boolean } }
    if (spec.widget) {
      found.push({
        from,
        to,
        kind: spec.widget.constructor.name,
        checked: spec.widget.checked,
      })
    } else {
      found.push({ from, to, kind: spec.class ?? 'hidden' })
    }
  })
  return found
}

const has = (found: Seen[], from: number, to: number, kind: string) =>
  found.some((item) => item.from === from && item.to === to && item.kind === kind)

const hiddenIn = (found: Seen[]) => found.filter((item) => item.kind === 'hidden')

test.group('live Markdown | headings', () => {
  const doc = '# Title\n\nbody'

  test('sizes the heading line and hides its # when the cursor is elsewhere', ({ assert }) => {
    const found = seen(doc, doc.length)

    assert.isTrue(has(found, 0, 0, 'cm-live-h1'))
    assert.isTrue(has(found, 0, 2, 'hidden'))
  })

  test('shows the # while the cursor is on the heading', ({ assert }) => {
    const found = seen(doc, 3)

    assert.isTrue(has(found, 0, 0, 'cm-live-h1'))
    assert.lengthOf(hiddenIn(found), 0)
  })

  test('has a size for each level', ({ assert }) => {
    assert.isTrue(has(seen('### Small\n\nx', 11), 0, 0, 'cm-live-h3'))
  })
})

test.group('live Markdown | inline marks', () => {
  const cases = [
    {
      name: 'bold',
      doc: 'first\n\nsome **bold** word',
      open: '**',
      whole: '**bold**',
      kind: 'cm-live-strong',
    },
    {
      name: 'italic with _',
      doc: 'first\n\nsome _soft_ word',
      open: '_',
      whole: '_soft_',
      kind: 'cm-live-em',
    },
    {
      name: 'italic with *',
      doc: 'first\n\nsome *soft* word',
      open: '*',
      whole: '*soft*',
      kind: 'cm-live-em',
    },
    {
      name: 'strike',
      doc: 'first\n\nsome ~~gone~~ word',
      open: '~~',
      whole: '~~gone~~',
      kind: 'cm-live-strike',
    },
    {
      name: 'code',
      doc: 'first\n\nuse `npm` now',
      open: '`',
      whole: '`npm`',
      kind: 'cm-live-code',
    },
  ]

  for (const { name, doc, open, whole, kind } of cases) {
    const start = doc.indexOf(whole)
    const end = start + whole.length

    test(`styles ${name} and hides its marks away from the cursor`, ({ assert }) => {
      const found = seen(doc, 0)

      assert.isTrue(has(found, start, end, kind))
      assert.isTrue(has(found, start, start + open.length, 'hidden'))
      assert.isTrue(has(found, end - open.length, end, 'hidden'))
    })

    test(`shows the marks of ${name} while the cursor is on its line`, ({ assert }) => {
      const found = seen(doc, start + open.length + 1)

      assert.isTrue(has(found, start, end, kind))
      assert.lengthOf(hiddenIn(found), 0)
    })
  }

  test('does not read marks inside a code span', ({ assert }) => {
    const found = seen('first\n\nuse `**x**` now', 0)

    assert.isFalse(found.some((item) => item.kind === 'cm-live-strong'))
  })
})

test.group('live Markdown | links', () => {
  const doc = 'first\n\nread [the book](https://example.com) now'
  const open = doc.indexOf('[')
  const close = doc.indexOf('](')
  const end = doc.indexOf(')') + 1

  test('underlines the words and hides the brackets and address away from the cursor', ({
    assert,
  }) => {
    const found = seen(doc, 0)

    assert.isTrue(has(found, open + 1, close, 'cm-live-link'))
    assert.isTrue(has(found, open, open + 1, 'hidden'))
    assert.isTrue(has(found, close, end, 'hidden'))
  })

  test('shows the whole link while the cursor is on its line', ({ assert }) => {
    const found = seen(doc, open + 3)

    assert.isTrue(has(found, open + 1, close, 'cm-live-link'))
    assert.lengthOf(hiddenIn(found), 0)
  })
})

test.group('live Markdown | lists', () => {
  test('draws a bullet in place of a dash, away from the cursor', ({ assert }) => {
    const doc = 'first\n\n- one\n- two'
    const found = seen(doc, 0)

    assert.isTrue(has(found, doc.indexOf('- one'), doc.indexOf('- one') + 2, 'BulletWidget'))
    assert.isTrue(has(found, doc.indexOf('- two'), doc.indexOf('- two') + 2, 'BulletWidget'))
  })

  test('shows the dash on the line being edited, and only that line', ({ assert }) => {
    const doc = 'first\n\n- one\n- two'
    const found = seen(doc, doc.indexOf('one'))

    assert.isFalse(found.some((item) => item.from === doc.indexOf('- one')))
    assert.isTrue(has(found, doc.indexOf('- two'), doc.indexOf('- two') + 2, 'BulletWidget'))
  })

  test('leaves numbers on a numbered list as typed', ({ assert }) => {
    const found = seen('first\n\n1. one\n2. two', 0)

    assert.isFalse(found.some((item) => item.kind === 'BulletWidget'))
    assert.lengthOf(hiddenIn(found), 0)
  })

  test('draws a task as a checkbox, checked or not', ({ assert }) => {
    const doc = 'first\n\n- [x] done\n- [ ] todo'
    const found = seen(doc, 0)
    const done = doc.indexOf('- [x] ')
    const todo = doc.indexOf('- [ ] ')

    assert.isTrue(has(found, done, done + 6, 'CheckboxWidget'))
    assert.isTrue(has(found, todo, todo + 6, 'CheckboxWidget'))
    assert.isTrue(found.find((item) => item.from === done)?.checked)
    assert.isFalse(found.find((item) => item.from === todo)?.checked)
    assert.isFalse(found.some((item) => item.kind === 'BulletWidget'))
  })

  test('shows the task as typed while the cursor is on it', ({ assert }) => {
    const doc = 'first\n\n- [x] done'
    const found = seen(doc, doc.indexOf('done'))

    assert.isFalse(found.some((item) => item.kind === 'CheckboxWidget'))
  })
})

test.group('live Markdown | quotes, code and rules', () => {
  test('sets each quote line apart and hides the > away from the cursor', ({ assert }) => {
    const doc = 'first\n\n> quoted\n> more'
    const second = doc.indexOf('> more')
    const found = seen(doc, 0)

    assert.isTrue(has(found, doc.indexOf('> quoted'), doc.indexOf('> quoted'), 'cm-live-quote'))
    assert.isTrue(has(found, second, second, 'cm-live-quote'))
    assert.isTrue(has(found, doc.indexOf('> quoted'), doc.indexOf('> quoted') + 2, 'hidden'))
    assert.isTrue(has(found, second, second + 2, 'hidden'))
  })

  test('shows the > only on the quote line being edited', ({ assert }) => {
    const doc = 'first\n\n> quoted\n> more'
    const found = seen(doc, doc.indexOf('quoted'))

    assert.isFalse(has(found, doc.indexOf('> quoted'), doc.indexOf('> quoted') + 2, 'hidden'))
    assert.isTrue(has(found, doc.indexOf('> more'), doc.indexOf('> more') + 2, 'hidden'))
  })

  test('sets a code block apart line by line and reads nothing inside it', ({ assert }) => {
    const doc = 'first\n\n```\n**not bold**\n```'
    const found = seen(doc, 0)

    assert.equal(found.filter((item) => item.kind === 'cm-live-codeblock').length, 3)
    assert.isFalse(found.some((item) => item.kind === 'cm-live-strong'))
    assert.lengthOf(hiddenIn(found), 0)
  })

  test('draws a rule in place of ---, away from the cursor', ({ assert }) => {
    const doc = 'first\n\n---\n\nlast'
    const at = doc.indexOf('---')

    assert.isTrue(has(seen(doc, 0), at, at + 3, 'RuleWidget'))
    assert.isFalse(seen(doc, at + 1).some((item) => item.kind === 'RuleWidget'))
  })
})

test.group('live Markdown | selection and plain text', () => {
  test('shows the marks on every line a selection touches', ({ assert }) => {
    const doc = 'a\n\n**b**\n\n**c**'
    const found = seen(doc, 0, doc.indexOf('**b**') + 2)

    assert.isFalse(has(found, doc.indexOf('**b**'), doc.indexOf('**b**') + 2, 'hidden'))
    assert.isTrue(has(found, doc.indexOf('**c**'), doc.indexOf('**c**') + 2, 'hidden'))
  })

  test('leaves plain writing alone', ({ assert }) => {
    assert.deepEqual(seen('Slept badly.\nWoke at 5, felt fine.', 0), [])
  })

  test('never changes the text, only how it is shown', ({ assert }) => {
    const doc = '# Day\n\n**bold** and [a](https://example.com)\n\n- [x] done'
    const state = EditorState.create({ doc, extensions: [liveMarkdown()] })

    liveDecorations(state)

    assert.equal(state.doc.toString(), doc)
  })
})

test.group('live Markdown | ticking a task', () => {
  test('ticks an open task', ({ assert }) => {
    const state = EditorState.create({ doc: '- [ ] walk' })

    assert.deepEqual(taskToggleChange(state, 2), { from: 3, to: 4, insert: 'x' })
  })

  test('opens a ticked task, whichever case the x was typed in', ({ assert }) => {
    assert.deepEqual(taskToggleChange(EditorState.create({ doc: '- [x] walk' }), 2), {
      from: 3,
      to: 4,
      insert: ' ',
    })
    assert.deepEqual(taskToggleChange(EditorState.create({ doc: '- [X] walk' }), 2), {
      from: 3,
      to: 4,
      insert: ' ',
    })
  })

  test('does nothing where there is no task box', ({ assert }) => {
    assert.isNull(taskToggleChange(EditorState.create({ doc: '- walk' }), 2))
  })
})
