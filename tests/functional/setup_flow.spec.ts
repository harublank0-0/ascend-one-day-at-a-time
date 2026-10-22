import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import CleanPeriod from '#models/clean_period'
import User from '#models/user'
import { freezeClock } from '#tests/helpers/clock'
import { createUser } from '#tests/helpers/factories'
import { Session } from '#tests/helpers/http'
import { signInAs } from '#tests/helpers/sessions'

const NOW = '2026-03-10T12:00:00Z'

test.group('setup | first visit', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock(NOW)
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('a new account lands on setup, then can reach Today', async ({ assert }) => {
    const session = new Session()
    await session.submitFrom('/signup', 'POST', '/signup', {
      fullName: 'Sam',
      email: 'sam@example.com',
      password: 'correct-horse-1',
      passwordConfirmation: 'correct-horse-1',
    })

    const landing = await session.visit('/')
    assert.equal(landing.page?.component, 'setup')

    const saved = await session.post(
      '/welcome',
      { timezone: 'America/New_York' },
      { from: '/welcome' }
    )
    assert.equal(saved.location, '/today')
    const view = await session.visit('/today')
    assert.equal(view.page?.component, 'today')
  })

  test('saves the timezone and leaves clean time unset when the user skips it', async ({
    assert,
  }) => {
    const user = await createUser({ timezone: null })
    const session = await signInAs(user)

    await session.post('/welcome', { timezone: 'Asia/Kathmandu' }, { from: '/welcome' })

    await user.refresh()
    assert.equal(user.timezone, 'Asia/Kathmandu')
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 0)
    const today = await session.visit('/today')
    assert.deepEqual(today.page?.props.cleanTime, { status: 'not_started' })
  })

  test('saves the timezone and the clean start date together', async ({ assert }) => {
    const user = await createUser({ timezone: null })
    const session = await signInAs(user)

    await session.post(
      '/welcome',
      { timezone: 'America/New_York', startDate: '2026-03-01' },
      { from: '/welcome' }
    )

    const today = await session.visit('/today')
    assert.equal(today.page?.props.cleanTime.status, 'active')
    assert.equal(today.page?.props.cleanTime.daysClean, 9)
  })

  test('rejects a timezone that is not a real IANA zone and saves nothing', async ({ assert }) => {
    const user = await createUser({ timezone: null })
    const session = await signInAs(user)

    const response = await session.post(
      '/welcome',
      { timezone: 'Mars/Olympus' },
      { from: '/welcome' }
    )

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'timezone')
    await user.refresh()
    assert.isNull(user.timezone)
  })

  test('a timezone is required', async ({ assert }) => {
    const session = await signInAs(await createUser({ timezone: null }))
    const response = await session.post('/welcome', {}, { from: '/welcome' })

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'timezone')
  })

  test('a start date in the future leaves setup unfinished', async ({ assert }) => {
    const user = await createUser({ timezone: null })
    const session = await signInAs(user)

    const response = await session.post(
      '/welcome',
      { timezone: 'UTC', startDate: '2026-03-11' },
      { from: '/welcome' }
    )

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'startDate')
    await user.refresh()
    assert.isNull(user.timezone)
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 0)
  })

  test('a start date is judged against the zone chosen in the same form', async ({ assert }) => {
    // At 12:00Z it is already March 11 in Kiritimati (UTC+14), but still March 10 in UTC.
    const kiritimati = await createUser({ timezone: null })
    const session = await signInAs(kiritimati)
    await session.post(
      '/welcome',
      { timezone: 'Pacific/Kiritimati', startDate: '2026-03-11' },
      { from: '/welcome' }
    )

    const stored = await User.findOrFail(kiritimati.id)
    assert.equal(stored.timezone, 'Pacific/Kiritimati')
    assert.lengthOf(await CleanPeriod.query().where('userId', kiritimati.id), 1)
  })
})

test.group('setup | changing the timezone later', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T10:30:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('updates the saved timezone', async ({ assert }) => {
    const user = await createUser({ timezone: 'UTC' })
    const session = await signInAs(user)

    const response = await session.put(
      '/settings/timezone',
      { timezone: 'Asia/Kathmandu' },
      { from: '/settings' }
    )

    assert.equal(response.status, 303)
    const stored = await User.findOrFail(user.id)
    assert.equal(stored.timezone, 'Asia/Kathmandu')
  })

  test('rejects an invalid timezone and keeps the old one', async ({ assert }) => {
    const user = await createUser({ timezone: 'UTC' })
    const session = await signInAs(user)

    const response = await session.put(
      '/settings/timezone',
      { timezone: '+05:30' },
      { from: '/settings' }
    )

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'timezone')
    const stored = await User.findOrFail(user.id)
    assert.equal(stored.timezone, 'UTC')
  })

  test('decides what "today" is for each user from their own zone', async ({ assert }) => {
    // 10:30Z on March 10: already March 11 in Kiritimati, still March 9 in Pago Pago.
    const kiritimati = await signInAs(await createUser({ timezone: 'Pacific/Kiritimati' }))
    const utc = await signInAs(await createUser({ timezone: 'UTC' }))
    const pagoPago = await signInAs(await createUser({ timezone: 'Pacific/Pago_Pago' }))

    const view = await kiritimati.visit('/today')
    assert.equal(view.page?.props.todayDate, '2026-03-11')
    const view2 = await utc.visit('/today')
    assert.equal(view2.page?.props.todayDate, '2026-03-10')
    const view3 = await pagoPago.visit('/today')
    assert.equal(view3.page?.props.todayDate, '2026-03-09')
  })

  test('changing zone changes today but not saved calendar dates', async ({ assert }) => {
    const user = await createUser({ timezone: 'Pacific/Kiritimati' })
    const session = await signInAs(user)
    await session.put('/journal/2026-03-11', { body: 'Written on the 11th.' }, { from: '/today' })

    await session.put(
      '/settings/timezone',
      { timezone: 'Pacific/Pago_Pago' },
      { from: '/settings' }
    )

    const entry = await session.visit('/today?date=2026-03-09')
    assert.equal(entry.page?.props.todayDate, '2026-03-09')
    // The entry keeps the calendar date it was written for, even though that date is now "in the future".
    const history = await session.visit('/journal')
    assert.deepEqual(
      history.page?.props.items.map((item: { date: string }) => item.date),
      ['2026-03-11']
    )
  })
})
