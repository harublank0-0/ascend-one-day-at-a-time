import { test } from '@japa/runner'
import { plainTextOf } from '#services/markdown_text'

test.group('plainTextOf', () => {
  test('drops emphasis, strong, strike and code marks but keeps the words', ({ assert }) => {
    assert.equal(
      plainTextOf('**bold** and _soft_ and ~~gone~~ and `code`'),
      'bold and soft and gone and code'
    )
  })

  test('keeps the text of a link and drops its address', ({ assert }) => {
    assert.equal(
      plainTextOf('Read [the book](https://example.com/x) tonight'),
      'Read the book tonight'
    )
  })

  test('keeps only the alt text of an image', ({ assert }) => {
    assert.equal(plainTextOf('A walk. ![a tree](https://example.com/tree.png)'), 'A walk. a tree')
  })

  test('drops list, quote and task markers', ({ assert }) => {
    assert.equal(
      plainTextOf('- [x] meditate\n- [ ] walk\n\n> a quote\n\n1. one\n2. two'),
      'meditate walk a quote one two'
    )
  })

  test('drops heading marks', ({ assert }) => {
    assert.equal(plainTextOf('# Title\n\nBody text'), 'Title Body text')
  })

  test('keeps the contents of a code block', ({ assert }) => {
    assert.equal(plainTextOf('Ran:\n\n```ts\nconst a = 1 < 2\n```'), 'Ran: const a = 1 < 2')
  })

  test('reads table cells in order', ({ assert }) => {
    assert.equal(plainTextOf('| a | b |\n| - | - |\n| 1 | 2 |'), 'a b 1 2')
  })

  test('joins lines and blocks with single spaces', ({ assert }) => {
    assert.equal(
      plainTextOf('Slept badly.\nWoke at 5.\n\n\nFelt anxious.'),
      'Slept badly. Woke at 5. Felt anxious.'
    )
  })

  test('shows raw HTML as the text it is, not as markup', ({ assert }) => {
    assert.equal(plainTextOf('hi <b>there</b>'), 'hi <b>there</b>')
  })

  test('does not swallow an opening --- block as front matter', ({ assert }) => {
    const text = plainTextOf('---\nmood: low\n---\nSlept badly')

    assert.include(text, 'mood: low')
    assert.include(text, 'Slept badly')
  })

  test('leaves ordinary punctuation alone', ({ assert }) => {
    assert.equal(plainTextOf('Cost £5 & rain > sun, 2 < 3.'), 'Cost £5 & rain > sun, 2 < 3.')
  })

  test('is empty for nothing', ({ assert }) => {
    assert.equal(plainTextOf(''), '')
    assert.equal(plainTextOf('   \n\n  '), '')
  })
})
