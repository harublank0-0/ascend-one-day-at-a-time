import { test } from '@japa/runner'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseMarkdown } from '@tanstack/markdown/parser'
import { renderMarkdownReact } from '@tanstack/markdown/react'
import { journalMarkdownOptions } from '#shared/journal_markdown'

function render(source: string) {
  return renderToStaticMarkup(renderMarkdownReact(source, journalMarkdownOptions) as any)
}

test.group('journal Markdown policy', () => {
  test('shows raw HTML as text instead of running it', ({ assert }) => {
    const html = render('hi <img src=x onerror=alert(1)> <script>alert(1)</script>')

    assert.notInclude(html, '<script')
    assert.notInclude(html, '<img')
    assert.include(html, '&lt;script&gt;')
  })

  test('drops an executable link address but keeps the words', ({ assert }) => {
    const html = render('[click me](javascript:alert(1)) and [ok](https://example.com)')

    assert.notInclude(html, 'javascript:')
    assert.include(html, 'click me')
    assert.include(html, 'href="https://example.com"')
  })

  test('does not load images, and keeps their alt text', ({ assert }) => {
    const html = render('![a tracker](https://tracker.example/pixel.png)')

    assert.notInclude(html, '<img')
    assert.notInclude(html, 'tracker.example')
    assert.include(html, 'a tracker')
  })

  test('does not treat an opening --- block as front matter', ({ assert }) => {
    const html = render('---\nmood: low\n---\nSlept badly')

    assert.include(html, 'mood: low')
    assert.include(html, 'Slept badly')
  })

  test('gives headings no ids, so they cannot clash with ids on the page', ({ assert }) => {
    assert.notInclude(render('# Today\n\n## Today'), ' id=')
  })

  test('shows a code block as escaped plain code', ({ assert }) => {
    const html = render('```html\n<b>hi</b>\n```')

    assert.include(html, '&lt;b&gt;hi&lt;/b&gt;')
    assert.notInclude(html, '<b>')
  })

  test('shows task list items as disabled checkboxes', ({ assert }) => {
    const html = render('- [x] done\n- [ ] not yet')

    assert.equal(html.match(/type="checkbox"/g)?.length, 2)
    assert.equal(html.match(/disabled/g)?.length, 2)
  })

  test('gives the same tree and the same output for the same text', ({ assert }) => {
    const source = '# Day\n\n- one\n- [x] two\n\n> quote\n\n`code` and **bold**'

    assert.equal(
      JSON.stringify(parseMarkdown(source, journalMarkdownOptions)),
      JSON.stringify(parseMarkdown(source, journalMarkdownOptions))
    )
    assert.equal(render(source), render(source))
  })

  test('produces a tree that survives being sent as JSON', ({ assert }) => {
    const tree = parseMarkdown('**a** [b](https://example.com)', journalMarkdownOptions)

    assert.deepEqual(JSON.parse(JSON.stringify(tree)), tree)
  })
})
