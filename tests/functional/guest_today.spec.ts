import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { ContentSources } from '#constants/content_sources'
import CleanPeriod from '#models/clean_period'
import ContentSource from '#models/content_source'
import DailyContent from '#models/daily_content'
import JournalEntry from '#models/journal_entry'
import { freezeClock } from '#tests/helpers/clock'
import { createUser } from '#tests/helpers/factories'
import { Session } from '#tests/helpers/http'
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
        metadata: { closing: null, quote: { text: `Quote ${month}/${day}`, reference: null } },
      })
    }
  }
}

test.group('guest today | what a signed-out visitor sees', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('shows today’s readings without signing in', async ({ assert }) => {
    await seedReadings([[3, 10]])

    const response = await new Session().get('/today')

    assert.equal(response.status, 200)
    assert.equal(response.page?.component, 'today')
    assert.isTrue(response.page?.props.isGuest)
    assert.isUndefined(response.page?.props.user)
    assert.equal(response.page?.props.dateLabel, 'Tuesday, March 10')
    assert.deepEqual(
      response.page?.props.readings.map((entry: any) => [entry.slug, entry.reading.title]),
      [
        ['the-daily-stoic', 'Stoic 3/10'],
        ['jft', 'JFT 3/10'],
      ]
    )
  })

  test('keeps clean time and the journal out of the page', async ({ assert }) => {
    const response = await new Session().get('/today')

    for (const key of ['cleanTime', 'entry', 'maxJournalLength']) {
      assert.notProperty(response.page?.props, key)
    }
  })

  test('never exposes anyone’s journal or clean time, even for a date that has one', async ({
    assert,
  }) => {
    const member = await createUser()
    await JournalEntry.create({
      userId: member.id,
      entryDate: '2026-03-10',
      body: 'Private words nobody else should read.',
    })
    await CleanPeriod.create({ userId: member.id, startDate: '2026-03-01' })

    const response = await new Session().get('/today?date=2026-03-10')

    assert.notInclude(response.body, 'Private words')
    assert.notInclude(response.body, member.email)
    assert.notProperty(response.page?.props, 'entry')
  })

  test('lets a guest browse earlier days', async ({ assert }) => {
    await seedReadings([
      [3, 5],
      [3, 10],
    ])
    const { page } = await new Session().get('/today?date=2026-03-05')

    assert.equal(page?.props.date, '2026-03-05')
    assert.isFalse(page?.props.isToday)
    assert.equal(page?.props.previousDate, '2026-03-04')
    assert.equal(page?.props.nextDate, '2026-03-06')
    assert.equal(page?.props.readings[0].reading.title, 'Stoic 3/5')
  })

  test('sends a guest asking for a future or invalid date back to today', async ({ assert }) => {
    const session = new Session()

    for (const date of ['2026-03-11', '2027-02-29', 'abc']) {
      const response = await session.get(`/today?date=${date}`)
      assert.equal(response.status, 302, date)
      assert.equal(response.location, '/today', date)
    }
  })

  test('the signed-in page is not marked as a guest page', async ({ assert }) => {
    const session = await signInAs(await createUser())

    const { page } = await session.get('/today')

    assert.isFalse(page?.props.isGuest)
    assert.property(page?.props, 'cleanTime')
    assert.property(page?.props, 'entry')
  })
})

test.group('guest today | which day it is for a guest', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    // 10:30Z: already March 11 in Kiritimati (UTC+14), still March 10 in UTC.
    restoreClock = freezeClock('2026-03-10T10:30:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('defaults to UTC when the browser has not said where it is', async ({ assert }) => {
    const { page } = await new Session().get('/today')

    assert.equal(page?.props.todayDate, '2026-03-10')
    assert.equal(page?.props.timeZone, 'UTC')
  })

  test('uses the timezone the browser remembered in its cookie', async ({ assert }) => {
    const session = new Session()
    session.setCookie('guest_timezone', 'Pacific/Kiritimati')

    const { page } = await session.get('/today')

    assert.equal(page?.props.todayDate, '2026-03-11')
    assert.equal(page?.props.timeZone, 'Pacific/Kiritimati')
  })

  test('a different zone gives a different day for the same moment', async ({ assert }) => {
    const pagoPago = new Session()
    pagoPago.setCookie('guest_timezone', 'Pacific/Pago_Pago')

    const { page } = await pagoPago.get('/today')

    assert.equal(page?.props.todayDate, '2026-03-09')
  })

  test('ignores a cookie that is not a real timezone', async ({ assert }) => {
    for (const value of ['Mars/Olympus', '+14:00', "'; drop table users; --"]) {
      const session = new Session()
      session.setCookie('guest_timezone', value)

      const { page } = await session.get('/today')

      assert.equal(page?.props.timeZone, 'UTC', value)
      assert.equal(page?.props.todayDate, '2026-03-10', value)
    }
  })

  test('a signed-in user’s saved timezone wins over the guest cookie', async ({ assert }) => {
    const session = await signInAs(await createUser({ timezone: 'Pacific/Pago_Pago' }))
    session.setCookie('guest_timezone', 'Pacific/Kiritimati')

    const { page } = await session.get('/today')

    assert.equal(page?.props.todayDate, '2026-03-09')
  })
})
