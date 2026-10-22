import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { ContentSources } from '#constants/content_sources'
import CleanPeriod from '#models/clean_period'
import ContentSource from '#models/content_source'
import DailyContent from '#models/daily_content'
import JournalEntry from '#models/journal_entry'
import { MAX_JOURNAL_LENGTH } from '#services/journal_service'
import { freezeClock } from '#tests/helpers/clock'
import { createUser } from '#tests/helpers/factories'
import { signInAs } from '#tests/helpers/sessions'

async function seedReadings(days: Array<[number, number]>) {
  const stoic = await ContentSource.create(ContentSources.THE_DAILY_STOIC)
  const jft = await ContentSource.create(ContentSources.JFT)
  for (const [month, day] of days) {
    for (const [source, label] of [
      [stoic, 'Stoic'],
      [jft, 'JFT'],
    ] as const) {
      await DailyContent.create({
        contentSourceId: source.id,
        month,
        day,
        title: `${label} ${month}/${day}`,
        content: `${label} body for ${month}/${day}`,
        metadata: { closing: null, quote: { text: `Quote ${month}/${day}`, reference: 'Ref' } },
      })
    }
  }
}

test.group('today | the selected day', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('opens on the user’s local today with previous-day navigation only', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const { page } = await session.get('/today')

    assert.equal(page?.component, 'today')
    assert.equal(page?.props.date, '2026-03-10')
    assert.equal(page?.props.dateLabel, 'Tuesday, March 10')
    assert.isTrue(page?.props.isToday)
    assert.equal(page?.props.todayDate, '2026-03-10')
    assert.equal(page?.props.previousDate, '2026-03-09')
    assert.isNull(page?.props.nextDate)
  })

  test('shows an earlier date with both previous and next navigation', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const { page } = await session.get('/today?date=2026-03-05')

    assert.equal(page?.props.date, '2026-03-05')
    assert.isFalse(page?.props.isToday)
    assert.equal(page?.props.previousDate, '2026-03-04')
    assert.equal(page?.props.nextDate, '2026-03-06')
    assert.equal(page?.props.todayDate, '2026-03-10')
  })

  test('the day before today links forward to today', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const { page } = await session.get('/today?date=2026-03-09')

    assert.equal(page?.props.nextDate, '2026-03-10')
  })

  test('sends a future date back to today instead of showing it', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.get('/today?date=2026-03-11')

    assert.equal(response.status, 302)
    assert.equal(response.location, '/today')
  })

  test('sends an invalid date back to today instead of failing', async ({ assert }) => {
    const session = await signInAs(await createUser())

    for (const date of ['2027-02-29', '2026-13-01', 'abc', '']) {
      const response = await session.get(`/today?date=${date}`)
      assert.equal(response.status, 302, `date="${date}"`)
      assert.equal(response.location, '/today', `date="${date}"`)
    }
  })

  test('keeps the day boundaries of non-leap years: Feb 28 is followed by Mar 1', async ({
    assert,
  }) => {
    const session = await signInAs(await createUser())
    const { page: march1 } = await session.get('/today?date=2026-03-01')
    const { page: feb28 } = await session.get('/today?date=2026-02-28')

    assert.equal(march1?.props.previousDate, '2026-02-28')
    assert.equal(feb28?.props.nextDate, '2026-03-01')
  })
})

test.group('today | readings', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('shows the Daily Stoic and JFT readings for the selected date', async ({ assert }) => {
    await seedReadings([
      [3, 10],
      [3, 9],
    ])
    const session = await signInAs(await createUser())

    const { page: today } = await session.get('/today')
    const { page: yesterday } = await session.get('/today?date=2026-03-09')

    assert.deepEqual(
      today?.props.readings.map((entry: any) => [entry.slug, entry.reading.title]),
      [
        ['the-daily-stoic', 'Stoic 3/10'],
        ['jft', 'JFT 3/10'],
      ]
    )
    assert.equal(yesterday?.props.readings[1].reading.title, 'JFT 3/9')
    assert.deepEqual(today?.props.readings[0].reading.quote, {
      text: 'Quote 3/10',
      reference: 'Ref',
    })
  })

  test('says a reading is missing rather than failing or borrowing another day', async ({
    assert,
  }) => {
    await seedReadings([[3, 9]]) // nothing for March 10
    const session = await signInAs(await createUser())

    const response = await session.get('/today')

    assert.equal(response.status, 200)
    assert.deepEqual(
      response.page?.props.readings.map((entry: any) => entry.reading),
      [null, null]
    )
  })

  test('shows the February 29 reading on a leap day', async ({ assert }) => {
    restoreClock()
    restoreClock = freezeClock('2028-03-05T12:00:00Z')
    await seedReadings([
      [2, 28],
      [2, 29],
      [3, 1],
    ])
    const session = await signInAs(await createUser())

    const { page: leapDay } = await session.get('/today?date=2028-02-29')

    assert.equal(leapDay?.props.dateLabel, 'Tuesday, February 29')
    assert.equal(leapDay?.props.readings[0].reading.title, 'Stoic 2/29')
    assert.equal(leapDay?.props.previousDate, '2028-02-28')
    assert.equal(leapDay?.props.nextDate, '2028-03-01')
  })

  test('never shows the February 29 reading in a year without one', async ({ assert }) => {
    await seedReadings([
      [2, 28],
      [2, 29],
      [3, 1],
    ])
    const session = await signInAs(await createUser())

    const { page: feb28 } = await session.get('/today?date=2026-02-28')
    const { page: march1 } = await session.get('/today?date=2026-03-01')
    const leapDay = await session.get('/today?date=2026-02-29')

    assert.equal(feb28?.props.readings[0].reading.title, 'Stoic 2/28')
    assert.equal(march1?.props.readings[0].reading.title, 'Stoic 3/1')
    assert.equal(leapDay.location, '/today') // not a real date in 2026
  })
})

test.group('today | clean time and journal on the page', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('shows days clean when a start date is set', async ({ assert }) => {
    const user = await createUser()
    await CleanPeriod.create({ userId: user.id, startDate: '2026-03-01' })
    const session = await signInAs(user)

    const { page } = await session.get('/today')

    assert.deepEqual(page?.props.cleanTime, {
      status: 'active',
      startDate: '2026-03-01',
      startDateLabel: 'March 1, 2026',
      daysClean: 9,
    })
  })

  test('says clean time is not started when there is no start date', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const { page } = await session.get('/today')

    assert.deepEqual(page?.props.cleanTime, { status: 'not_started' })
  })

  test('shows the journal entry for the selected date only', async ({ assert }) => {
    const user = await createUser()
    await JournalEntry.create({ userId: user.id, entryDate: '2026-03-10', body: 'Today words.' })
    await JournalEntry.create({
      userId: user.id,
      entryDate: '2026-03-09',
      body: 'Yesterday words.',
    })
    const session = await signInAs(user)

    const { page: today } = await session.get('/today')
    const { page: yesterday } = await session.get('/today?date=2026-03-09')
    const { page: empty } = await session.get('/today?date=2026-03-08')

    assert.equal(today?.props.entry.body, 'Today words.')
    assert.equal(yesterday?.props.entry.body, 'Yesterday words.')
    assert.isNull(empty?.props.entry)
    assert.equal(today?.props.maxJournalLength, MAX_JOURNAL_LENGTH)
  })
})
