import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'

type Reading = {
  date: string
  month: number
  day: number
  title: string | null
  quote: { text: string | null }
  content: string
}

async function load(file: string): Promise<Reading[]> {
  const url = new URL(`../../data/contents/${file}`, import.meta.url)
  return JSON.parse(await readFile(url, 'utf8'))
}

/**
 * These look at the shipped data files, not the database. They exist because a
 * re-extraction once dropped the first letter of 344 Daily Stoic readings and
 * nothing noticed until someone read them.
 */
for (const file of ['daily-stoic.json', 'jft.json']) {
  test.group(`content dataset | ${file}`, () => {
    test('has one reading for each of the 366 days of a leap year', async ({ assert }) => {
      const readings = await load(file)
      const days = new Set(readings.map((reading) => `${reading.month}/${reading.day}`))

      assert.lengthOf(readings, 366)
      assert.equal(days.size, 366)
      assert.isTrue(days.has('2/29'))
    })

    test('no reading starts in the middle of a word', async ({ assert }) => {
      const readings = await load(file)
      const midWord = readings
        .filter((reading) => /^\p{Ll}/u.test(reading.content))
        .map((reading) => `${reading.date}: ${reading.content.slice(0, 24)}`)

      assert.deepEqual(midWord, [])
    })
  })
}

test.group('content dataset | daily-stoic.json structure', () => {
  test('no reading starts with the tail of an attribution', async ({ assert }) => {
    const readings = await load('daily-stoic.json')
    const leaked = readings
      .filter((reading) =>
        // a dash, a dotted reference such as "9.1" or "7.1.88", or an ALL-CAPS word
        /^([—-]|\d+\.\d+|\p{Lu}{4,}\b)/u.test(reading.content)
      )
      .map((reading) => `${reading.date}: ${reading.content.slice(0, 30)}`)

    assert.deepEqual(leaked, [])
  })

  test('every quote ends with its attribution', async ({ assert }) => {
    const readings = await load('daily-stoic.json')
    const unattributed = readings
      .filter((reading) => {
        const passages = (reading.quote.text ?? '').split('\n\n')
        return !passages.every((passage) => /—\p{Lu}[^\n]*$/u.test(passage))
      })
      .map((reading) => reading.date)

    assert.deepEqual(unattributed, [])
  })

  test('readings whose opening letter is a whole word keep their space', async ({ assert }) => {
    const readings = await load('daily-stoic.json')
    const byDate = new Map(readings.map((reading) => [reading.date, reading.content]))

    // "A worker...", "A dog...", and the pronoun in a quotation, versus words that merely start with A.
    assert.match(byDate.get('01/16')!, /^A worker /)
    assert.match(byDate.get('03/31')!, /^A dog /)
    assert.match(byDate.get('06/29')!, /^“I was /)
    assert.match(byDate.get('01/26')!, /^Anyone /)
    assert.match(byDate.get('05/02')!, /^An archer /)
  })

  test('an entry with two epigraphs keeps both and starts the reading at the body', async ({
    assert,
  }) => {
    const readings = await load('daily-stoic.json')
    const may22 = readings.find((reading) => reading.date === '05/22')!

    assert.lengthOf((may22.quote.text ?? '').split('\n\n'), 2)
    assert.match(may22.quote.text ?? '', /—SENECA, MEDEA, 423–425$/)
    assert.match(may22.content, /^We almost always know what the right thing is/)
  })
})
