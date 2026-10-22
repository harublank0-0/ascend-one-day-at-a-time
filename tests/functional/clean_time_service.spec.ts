import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CleanPeriod from '#models/clean_period'
import JournalEntry from '#models/journal_entry'
import CleanTimeService from '#services/clean_time_service'
import { createUser } from '#tests/helpers/factories'
import { rejectsWithFieldError } from '#tests/helpers/assertions'

// Midday UTC on 2026-03-10: the same calendar date for a UTC user.
const NOW = DateTime.fromISO('2026-03-10T12:00:00Z')

test.group('CleanTimeService | summary', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('reports not started when the user has not set a start date', async ({ assert }) => {
    const user = await createUser()
    const summary = await new CleanTimeService().summary(user, NOW)
    assert.deepEqual(summary, { status: 'not_started' })
  })

  test('the start date itself is 0 days clean', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-03-10', NOW)

    assert.deepEqual(await service.summary(user, NOW), {
      status: 'active',
      startDate: '2026-03-10',
      daysClean: 0,
    })
  })

  test('counts completed local days since the start date', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-03-01', NOW)

    const summary = await service.summary(user, NOW)
    assert.equal(summary.status === 'active' && summary.daysClean, 9)
  })

  test('rolls over at the user’s local midnight, not at UTC midnight', async ({ assert }) => {
    const user = await createUser({ timezone: 'America/New_York' })
    const service = new CleanTimeService()
    // 2026-03-10T03:59:59Z is still March 9 in New York (EDT, UTC-4).
    await service.start(user, '2026-03-09', DateTime.fromISO('2026-03-10T03:59:59Z'))

    const beforeMidnight = await service.summary(user, DateTime.fromISO('2026-03-10T03:59:59Z'))
    const afterMidnight = await service.summary(user, DateTime.fromISO('2026-03-10T04:00:00Z'))

    assert.equal(beforeMidnight.status === 'active' && beforeMidnight.daysClean, 0)
    assert.equal(afterMidnight.status === 'active' && afterMidnight.daysClean, 1)
  })
})

test.group('CleanTimeService | start', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('rejects a start date in the future and stores nothing', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()

    const message = await rejectsWithFieldError(service.start(user, '2026-03-11', NOW), 'startDate')

    assert.match(message, /future/i)
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 0)
  })

  test('judges "future" by the user’s own local date', async ({ assert }) => {
    // At 2026-03-10T10:30Z it is already March 11 in Kiritimati (UTC+14) but still March 10 in UTC.
    const instant = DateTime.fromISO('2026-03-10T10:30:00Z')
    const kiritimati = await createUser({ timezone: 'Pacific/Kiritimati' })
    const utc = await createUser({ timezone: 'UTC' })
    const service = new CleanTimeService()

    await service.start(kiritimati, '2026-03-11', instant)
    await rejectsWithFieldError(service.start(utc, '2026-03-11', instant), 'startDate')

    assert.lengthOf(await CleanPeriod.query().where('userId', kiritimati.id), 1)
    assert.lengthOf(await CleanPeriod.query().where('userId', utc.id), 0)
  })

  test('rejects dates that are not real calendar dates', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()

    await rejectsWithFieldError(service.start(user, '2026-02-30', NOW), 'startDate')
    await rejectsWithFieldError(service.start(user, 'yesterday', NOW), 'startDate')
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 0)
  })

  test('does not start a second period while one is running', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-03-01', NOW)

    await rejectsWithFieldError(service.start(user, '2026-03-05', NOW), 'startDate')
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 1)
  })

  test('keeps each user’s clean time separate', async ({ assert }) => {
    const alice = await createUser()
    const bob = await createUser()
    const service = new CleanTimeService()
    await service.start(alice, '2026-03-01', NOW)

    assert.deepEqual(await service.summary(bob, NOW), { status: 'not_started' })
  })
})

test.group('CleanTimeService | correctStartDate', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('moves the start date of the current period', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-03-05', NOW)
    await service.correctStartDate(user, '2026-03-01', NOW)

    assert.deepEqual(await service.summary(user, NOW), {
      status: 'active',
      startDate: '2026-03-01',
      daysClean: 9,
    })
    assert.lengthOf(await CleanPeriod.query().where('userId', user.id), 1)
  })

  test('rejects a corrected date in the future and keeps the old one', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-03-05', NOW)

    await rejectsWithFieldError(service.correctStartDate(user, '2026-03-11', NOW), 'startDate')
    const summary = await service.summary(user, NOW)
    assert.equal(summary.status === 'active' && summary.startDate, '2026-03-05')
  })

  test('rejects a correction when there is no current period', async () => {
    const user = await createUser()
    await rejectsWithFieldError(
      new CleanTimeService().correctStartDate(user, '2026-03-01', NOW),
      'startDate'
    )
  })

  test('does not let a correction reach back into the previous period', async () => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-01-01', NOW)
    await service.startNewPeriod(user, '2026-02-10', NOW)

    // The earlier period ended on 2026-02-10, so the current one cannot start before that.
    await rejectsWithFieldError(service.correctStartDate(user, '2026-02-01', NOW), 'startDate')
  })
})

test.group('CleanTimeService | startNewPeriod', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('ends the current period and begins a new one at 0 days', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-01-01', NOW)
    await service.startNewPeriod(user, '2026-03-10', NOW)

    assert.deepEqual(await service.summary(user, NOW), {
      status: 'active',
      startDate: '2026-03-10',
      daysClean: 0,
    })
  })

  test('preserves the previous period as history', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-01-01', NOW)
    await service.startNewPeriod(user, '2026-03-10', NOW)

    assert.deepEqual(await service.previousPeriods(user), [
      { startDate: '2026-01-01', endedOn: '2026-03-10', days: 68 },
    ])
  })

  test('never touches journal entries', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await JournalEntry.create({ userId: user.id, entryDate: '2026-02-01', body: 'A hard day.' })
    await service.start(user, '2026-01-01', NOW)
    await service.startNewPeriod(user, '2026-03-10', NOW)

    const entries = await JournalEntry.query().where('userId', user.id)
    assert.lengthOf(entries, 1)
    assert.equal(entries[0].body, 'A hard day.')
  })

  test('rejects a new start date in the future', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-01-01', NOW)

    await rejectsWithFieldError(service.startNewPeriod(user, '2026-03-11', NOW), 'startDate')
    assert.deepEqual(await service.previousPeriods(user), [])
  })

  test('rejects a new start date before the current one began', async () => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.start(user, '2026-03-01', NOW)

    await rejectsWithFieldError(service.startNewPeriod(user, '2026-02-20', NOW), 'startDate')
  })

  test('begins tracking when there was no current period', async ({ assert }) => {
    const user = await createUser()
    const service = new CleanTimeService()
    await service.startNewPeriod(user, '2026-03-10', NOW)

    const summary = await service.summary(user, NOW)
    assert.equal(summary.status, 'active')
    assert.deepEqual(await service.previousPeriods(user), [])
  })
})

test.group('clean_periods | database constraints', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the database refuses a second open period for one user', async ({ assert }) => {
    const user = await createUser()
    await CleanPeriod.create({ userId: user.id, startDate: '2026-03-01' })

    await assert.rejects(
      () => CleanPeriod.create({ userId: user.id, startDate: '2026-03-02' }),
      /clean_periods_one_open_per_user/
    )
  })

  test('the database refuses a period that ends before it starts', async ({ assert }) => {
    const user = await createUser()

    await assert.rejects(
      () => CleanPeriod.create({ userId: user.id, startDate: '2026-03-05', endedOn: '2026-03-01' }),
      /clean_periods_end_after_start/
    )
  })

  test('closed periods do not count against the one-open-period rule', async ({ assert }) => {
    const user = await createUser()
    await CleanPeriod.create({ userId: user.id, startDate: '2026-01-01', endedOn: '2026-02-01' })
    await CleanPeriod.create({ userId: user.id, startDate: '2026-02-01', endedOn: '2026-03-01' })
    await CleanPeriod.create({ userId: user.id, startDate: '2026-03-01' })

    const [{ count }] = await db.from('clean_periods').where('user_id', user.id).count('* as count')
    assert.equal(Number(count), 3)
  })
})
