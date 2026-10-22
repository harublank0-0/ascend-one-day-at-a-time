import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import DailyContent from '#models/daily_content'
import DailyReadingService from '#services/daily_reading_service'

/**
 * These run the project's real seeders against the real datasets in
 * data/contents, so they check what a user actually gets after `db:seed`.
 */
test.group('content import', (group) => {
  group.setup(async () => {
    // truncate() returns the function that empties the tables afterwards; hand
    // it back so the imported content does not leak into other specs.
    const cleanup = await testUtils.db().truncate()
    await testUtils.db().seed()
    return cleanup
  })

  test('imports 366 readings per source, including February 29', async ({ assert }) => {
    const counts = await db
      .from('daily_contents')
      .join('content_sources', 'content_sources.id', 'daily_contents.content_source_id')
      .groupBy('content_sources.slug')
      .select('content_sources.slug')
      .count('* as total')
      .orderBy('content_sources.slug')

    assert.deepEqual(
      counts.map((row) => [row.slug, Number(row.total)]),
      [
        ['jft', 366],
        ['the-daily-stoic', 366],
      ]
    )

    const [{ total: leapDays }] = await db
      .from('daily_contents')
      .where({ month: 2, day: 29 })
      .count('* as total')
    assert.equal(Number(leapDays), 2)
  })

  test('running the import again does not duplicate readings', async ({ assert }) => {
    await testUtils.db().seed()

    const [{ total }] = await db.from('daily_contents').count('* as total')
    assert.equal(Number(total), 732)
  })

  test('a reading with no title in the source book stays untitled instead of getting a placeholder', async ({
    assert,
  }) => {
    const [, jft] = await new DailyReadingService().forDate('2026-08-01')

    assert.isNotNull(jft.reading)
    assert.isNull(jft.reading?.title)
    assert.notInclude(jft.reading?.content ?? '', 'N/A')
  })

  test('no imported reading carries the old "Title is N/A." placeholder', async ({ assert }) => {
    const placeholders = await DailyContent.query().where('title', 'Title is N/A.')
    assert.lengthOf(placeholders, 0)
  })

  test('every date in a leap year has both readings, and Feb 29 has its own', async ({
    assert,
  }) => {
    const service = new DailyReadingService()
    let date = DateTime.utc(2028, 1, 1)
    const missing: string[] = []

    while (date.year === 2028) {
      const readings = await service.forDate(date.toISODate()!)
      if (readings.some((entry) => entry.reading === null)) {
        missing.push(date.toISODate()!)
      }
      date = date.plus({ days: 1 })
    }

    assert.deepEqual(missing, [])
  })

  test('in a non-leap year every date still has both readings and Feb 29 is never shown', async ({
    assert,
  }) => {
    const service = new DailyReadingService()
    const leapDay = await service.forDate('2028-02-29')
    const leapDayContent = leapDay.map((entry) => entry.reading?.content)
    let date = DateTime.utc(2027, 1, 1)
    const missing: string[] = []
    const showedLeapDay: string[] = []

    while (date.year === 2027) {
      const iso = date.toISODate()!
      const readings = await service.forDate(iso)
      if (readings.some((entry) => entry.reading === null)) {
        missing.push(iso)
      }
      if (readings.every((entry, index) => entry.reading?.content === leapDayContent[index])) {
        showedLeapDay.push(iso)
      }
      date = date.plus({ days: 1 })
    }

    assert.deepEqual(missing, [])
    assert.deepEqual(showedLeapDay, [])
  })
})
