import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import CleanPeriod from '#models/clean_period'
import JournalEntry from '#models/journal_entry'
import { freezeClock } from '#tests/helpers/clock'
import { createUser } from '#tests/helpers/factories'
import { signInAs } from '#tests/helpers/sessions'

test.group('clean time | setting and correcting', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('sets a start date from Settings and shows days clean on Today', async ({ assert }) => {
    const session = await signInAs(await createUser())

    const response = await session.post(
      '/clean-time',
      { startDate: '2026-03-05' },
      { from: '/settings' }
    )

    assert.equal(response.location, '/settings')
    const { page: today } = await session.visit('/today')
    assert.equal(today?.props.cleanTime.daysClean, 5)
  })

  test('the start date itself counts as 0 days and the next local date as 1', async ({
    assert,
  }) => {
    const session = await signInAs(await createUser())
    await session.post('/clean-time', { startDate: '2026-03-10' }, { from: '/settings' })

    const view = await session.visit('/today')
    assert.equal(view.page?.props.cleanTime.daysClean, 0)
    const tomorrow = freezeClock('2026-03-11T12:00:00Z')
    const view2 = await session.visit('/today')
    assert.equal(view2.page?.props.cleanTime.daysClean, 1)
    tomorrow()
  })

  test('refuses a start date in the future', async ({ assert }) => {
    const user = await createUser()
    const session = await signInAs(user)

    const response = await session.post(
      '/clean-time',
      { startDate: '2026-03-11' },
      { from: '/settings' }
    )

    const form = await session.follow(response)
    assert.match(form.page?.props.errors.startDate, /future/)
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 0)
  })

  test('a start date is required', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.post('/clean-time', {}, { from: '/settings' })

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'startDate')
  })

  test('corrects the start date without starting a new period', async ({ assert }) => {
    const user = await createUser()
    const session = await signInAs(user)
    await session.post('/clean-time', { startDate: '2026-03-05' }, { from: '/settings' })

    const response = await session.put(
      '/clean-time',
      { startDate: '2026-03-01' },
      { from: '/settings' }
    )

    assert.equal(response.status, 303)
    const view = await session.visit('/today')
    assert.equal(view.page?.props.cleanTime.daysClean, 9)
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 1)
  })

  test('rejects a corrected start date in the future and keeps the old one', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.post('/clean-time', { startDate: '2026-03-05' }, { from: '/settings' })

    const response = await session.put(
      '/clean-time',
      { startDate: '2026-03-12' },
      { from: '/settings' }
    )

    const view = await session.follow(response)
    assert.property(view.page?.props.errors, 'startDate')
    const view2 = await session.visit('/today')
    assert.equal(view2.page?.props.cleanTime.startDate, '2026-03-05')
  })
})

test.group('clean time | starting a new period', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  async function withRunningPeriod() {
    const user = await createUser()
    const session = await signInAs(user)
    await session.post('/clean-time', { startDate: '2026-01-01' }, { from: '/settings' })
    return { user, session }
  }

  test('needs the user to confirm', async ({ assert }) => {
    const { session } = await withRunningPeriod()

    const response = await session.post(
      '/clean-time/restart',
      { startDate: '2026-03-10' },
      { from: '/settings' }
    )

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'confirmed')
    const view = await session.visit('/today')
    assert.equal(view.page?.props.cleanTime.startDate, '2026-01-01')
  })

  test('starts again from the chosen date once confirmed', async ({ assert }) => {
    const { session } = await withRunningPeriod()

    const response = await session.post(
      '/clean-time/restart',
      { startDate: '2026-03-10', confirmed: 'true' },
      { from: '/settings' }
    )

    assert.equal(response.location, '/settings')
    const { page: today } = await session.visit('/today')
    assert.deepEqual(
      [today?.props.cleanTime.startDate, today?.props.cleanTime.daysClean],
      ['2026-03-10', 0]
    )
  })

  test('keeps the earlier period in history', async ({ assert }) => {
    const { session } = await withRunningPeriod()
    await session.post(
      '/clean-time/restart',
      { startDate: '2026-03-10', confirmed: 'true' },
      { from: '/settings' }
    )

    const { page: settings } = await session.get('/settings')

    assert.deepEqual(settings?.props.previousPeriods, [
      {
        startDate: '2026-01-01',
        endedOn: '2026-03-10',
        days: 68,
        startDateLabel: 'January 1, 2026',
        endedOnLabel: 'March 10, 2026',
      },
    ])
  })

  test('never removes journal entries', async ({ assert }) => {
    const { user, session } = await withRunningPeriod()
    await session.put('/journal/2026-02-01', { body: 'A hard day.' }, { from: '/today' })
    await session.post(
      '/clean-time/restart',
      { startDate: '2026-03-10', confirmed: 'true' },
      { from: '/settings' }
    )

    const entries = await JournalEntry.query().where('userId', user.id)
    assert.lengthOf(entries, 1)
    const { page } = await session.visit('/today?date=2026-02-01')
    assert.equal(page?.props.entry.body, 'A hard day.')
  })

  test('refuses a new start date in the future', async ({ assert }) => {
    const { session } = await withRunningPeriod()
    const response = await session.post(
      '/clean-time/restart',
      { startDate: '2026-03-11', confirmed: 'true' },
      { from: '/settings' }
    )

    const view = await session.follow(response)
    assert.property(view.page?.props.errors, 'startDate')
    const view2 = await session.visit('/today')
    assert.equal(view2.page?.props.cleanTime.startDate, '2026-01-01')
  })
})

test.group('clean time | privacy between accounts', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('one account’s clean time is invisible to another', async ({ assert }) => {
    const alice = await signInAs(await createUser())
    const bob = await signInAs(await createUser())
    await alice.post('/clean-time', { startDate: '2026-01-01' }, { from: '/settings' })

    const view = await bob.visit('/today')
    assert.deepEqual(view.page?.props.cleanTime, { status: 'not_started' })
    const view2 = await bob.visit('/settings')
    assert.deepEqual(view2.page?.props.previousPeriods, [])
  })

  test('restarting one account leaves the other’s period alone', async ({ assert }) => {
    const alice = await signInAs(await createUser())
    const bob = await signInAs(await createUser())
    await alice.post('/clean-time', { startDate: '2026-01-01' }, { from: '/settings' })
    await bob.post('/clean-time', { startDate: '2026-02-01' }, { from: '/settings' })

    await bob.post(
      '/clean-time/restart',
      { startDate: '2026-03-10', confirmed: 'true' },
      { from: '/settings' }
    )

    const view = await alice.visit('/today')
    assert.equal(view.page?.props.cleanTime.startDate, '2026-01-01')
  })

  test('a submitted user id cannot target another account’s clean time', async ({ assert }) => {
    const aliceUser = await createUser()
    const alice = await signInAs(aliceUser)
    const bob = await signInAs(await createUser())
    await alice.post('/clean-time', { startDate: '2026-01-01' }, { from: '/settings' })

    await bob.put(
      '/clean-time',
      { startDate: '2026-02-01', userId: String(aliceUser.id) },
      { from: '/settings' }
    )

    const view = await alice.visit('/today')
    assert.equal(view.page?.props.cleanTime.startDate, '2026-01-01')
  })
})
