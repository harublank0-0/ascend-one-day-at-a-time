import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { ContentSources } from '#constants/content_sources'
import ContentSource from '#models/content_source'
import DailyContent from '#models/daily_content'
import DailyReadingService from '#services/daily_reading_service'

async function seedSources() {
  const stoic = await ContentSource.create(ContentSources.THE_DAILY_STOIC)
  const jft = await ContentSource.create(ContentSources.JFT)
  return { stoic, jft }
}

function reading(
  sourceId: string,
  month: number,
  day: number,
  overrides: Partial<{ title: string; content: string; metadata: unknown }> = {}
) {
  return DailyContent.create({
    contentSourceId: sourceId,
    month,
    day,
    title: `Title ${month}/${day}`,
    content: `Content ${month}/${day}`,
    metadata: { closing: null, quote: { text: `Quote ${month}/${day}`, reference: null } },
    ...overrides,
  })
}

test.group('DailyReadingService', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('returns the Daily Stoic and JFT readings for the date, Stoic first', async ({ assert }) => {
    const { stoic, jft } = await seedSources()
    await reading(stoic.id, 3, 10)
    await reading(jft.id, 3, 10)

    const readings = await new DailyReadingService().forDate('2026-03-10')

    assert.deepEqual(
      readings.map((entry) => [entry.slug, entry.name, entry.reading?.title]),
      [
        ['the-daily-stoic', 'The Daily Stoic', 'Title 3/10'],
        ['jft', 'Just For Today', 'Title 3/10'],
      ]
    )
  })

  test('includes the quote, reference and closing when the reading has them', async ({
    assert,
  }) => {
    const { stoic, jft } = await seedSources()
    await reading(stoic.id, 1, 1)
    await reading(jft.id, 1, 1, {
      metadata: {
        closing: 'I will be vigilant.',
        quote: { text: '"We keep what we have..."', reference: 'Basic Text, p. 57' },
      },
    })

    const [, jftReading] = await new DailyReadingService().forDate('2026-01-01')

    assert.deepEqual(jftReading.reading, {
      title: 'Title 1/1',
      content: 'Content 1/1',
      quote: { text: '"We keep what we have..."', reference: 'Basic Text, p. 57' },
      closing: 'I will be vigilant.',
    })
  })

  test('finds a reading by month and day whatever the year', async ({ assert }) => {
    const { stoic, jft } = await seedSources()
    await reading(stoic.id, 3, 10)
    await reading(jft.id, 3, 10)
    const service = new DailyReadingService()

    const thisYear = await service.forDate('2026-03-10')
    const nextYear = await service.forDate('2027-03-10')

    assert.deepEqual(thisYear, nextYear)
  })

  test('shows the February 29 reading on February 29 of a leap year', async ({ assert }) => {
    const { stoic, jft } = await seedSources()
    await reading(stoic.id, 2, 29)
    await reading(jft.id, 2, 29)

    const [stoicReading] = await new DailyReadingService().forDate('2028-02-29')

    assert.equal(stoicReading.reading?.title, 'Title 2/29')
  })

  test('says a reading is missing instead of borrowing another day’s', async ({ assert }) => {
    const { stoic, jft } = await seedSources()
    await reading(stoic.id, 3, 10)
    await reading(jft.id, 3, 9) // JFT has nothing for March 10, only the day before

    const [stoicReading, jftReading] = await new DailyReadingService().forDate('2026-03-10')

    assert.equal(stoicReading.reading?.title, 'Title 3/10')
    assert.isNull(jftReading.reading)
  })

  test('returns empty slots, not an error, when no content has been imported', async ({
    assert,
  }) => {
    const readings = await new DailyReadingService().forDate('2026-03-10')

    assert.deepEqual(
      readings.map((entry) => [entry.slug, entry.reading]),
      [
        ['the-daily-stoic', null],
        ['jft', null],
      ]
    )
  })

  test('treats a blank title as no title', async ({ assert }) => {
    const { stoic, jft } = await seedSources()
    await reading(stoic.id, 8, 1)
    await reading(jft.id, 8, 1, { title: '' })

    const [, jftReading] = await new DailyReadingService().forDate('2026-08-01')

    assert.isNull(jftReading.reading?.title)
    assert.equal(jftReading.reading?.content, 'Content 8/1')
  })

  test('copes with missing metadata', async ({ assert }) => {
    const { stoic, jft } = await seedSources()
    await reading(stoic.id, 5, 5, { metadata: null })
    await reading(jft.id, 5, 5)

    const [stoicReading] = await new DailyReadingService().forDate('2026-05-05')

    assert.isNull(stoicReading.reading?.quote)
    assert.isNull(stoicReading.reading?.closing)
  })
})
