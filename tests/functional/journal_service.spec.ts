import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import JournalEntry from '#models/journal_entry'
import JournalService, { MAX_JOURNAL_LENGTH } from '#services/journal_service'
import { createUser } from '#tests/helpers/factories'
import { rejectsWithFieldError } from '#tests/helpers/assertions'

const NOW = DateTime.fromISO('2026-03-10T12:00:00Z')

async function entryCount(userId?: number) {
  const query = db.from('journal_entries')
  if (userId) {
    query.where('user_id', userId)
  }
  const [{ count }] = await query.count('* as count')
  return Number(count)
}

test.group('JournalService | save', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates an entry that can be read back for its date', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()

    await service.save(user, '2026-03-10', 'A calm morning.', NOW)
    const entry = await service.find(user, '2026-03-10')

    assert.equal(entry?.body, 'A calm morning.')
    assert.equal(entry?.entryDate, '2026-03-10')
  })

  test('saving the same date again updates the same entry', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()

    const first = await service.save(user, '2026-03-10', 'First thoughts.', NOW)
    const second = await service.save(user, '2026-03-10', 'Better thoughts.', NOW)

    assert.equal(second.id, first.id)
    assert.equal(await entryCount(user.id), 1)
    const stored = await service.find(user, '2026-03-10')
    assert.equal(stored?.body, 'Better thoughts.')
  })

  test('two saves for one date at the same moment still leave one entry', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()

    await Promise.all([
      service.save(user, '2026-03-10', 'Tab one.', NOW),
      service.save(user, '2026-03-10', 'Tab two.', NOW),
    ])

    assert.equal(await entryCount(user.id), 1)
  })

  test('keeps the text exactly as typed, including line breaks', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    const body = 'Line one.\n\n  Indented line two.\nLine three.'

    await service.save(user, '2026-03-10', body, NOW)

    const stored = await service.find(user, '2026-03-10')
    assert.equal(stored?.body, body)
  })

  test('allows editing an entry for an earlier date', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    await service.save(user, '2026-02-01', 'Old.', NOW)
    await service.save(user, '2026-02-01', 'Old, revised.', NOW)

    const stored = await service.find(user, '2026-02-01')
    assert.equal(stored?.body, 'Old, revised.')
  })

  test('rejects a blank entry and leaves an existing one alone', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    await service.save(user, '2026-03-10', 'Keep me.', NOW)

    await rejectsWithFieldError(service.save(user, '2026-03-10', '  \n ', NOW), 'body')

    const stored = await service.find(user, '2026-03-10')
    assert.equal(stored?.body, 'Keep me.')
  })

  test('rejects an entry over the length limit', async () => {
    const user = await createUser()
    const tooLong = 'a'.repeat(MAX_JOURNAL_LENGTH + 1)

    await rejectsWithFieldError(new JournalService().save(user, '2026-03-10', tooLong, NOW), 'body')
  })

  test('rejects a date in the future for the user’s own calendar', async ({ assert }) => {
    // 2026-03-10T03:30Z is still March 9 in New York, so March 10 is tomorrow there.
    const instant = DateTime.fromISO('2026-03-10T03:30:00Z')
    const newYork = await createUser({ timezone: 'America/New_York' })
    const utc = await createUser({ timezone: 'UTC' })
    const service = new JournalService()

    await rejectsWithFieldError(service.save(newYork, '2026-03-10', 'Early.', instant), 'entryDate')
    await service.save(utc, '2026-03-10', 'On time.', instant)

    assert.equal(await entryCount(newYork.id), 0)
    assert.equal(await entryCount(utc.id), 1)
  })

  test('rejects dates that are not real', async () => {
    const user = await createUser()
    const service = new JournalService()

    await rejectsWithFieldError(service.save(user, '2027-02-29', 'Hmm.', NOW), 'entryDate')
    await rejectsWithFieldError(service.save(user, 'today', 'Hmm.', NOW), 'entryDate')
  })

  test('the database refuses two entries for one user and date', async ({ assert }) => {
    const user = await createUser()
    await JournalEntry.create({ userId: user.id, entryDate: '2026-03-10', body: 'One.' })

    await assert.rejects(
      () => JournalEntry.create({ userId: user.id, entryDate: '2026-03-10', body: 'Two.' }),
      /journal_entries_user_id_entry_date_unique/
    )
  })

  test('the database refuses a blank body', async ({ assert }) => {
    const user = await createUser()

    await assert.rejects(
      () => JournalEntry.create({ userId: user.id, entryDate: '2026-03-10', body: '   ' }),
      /journal_entries_body_not_blank/
    )
  })
})

test.group('JournalService | delete', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('removes the entry for that date', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    await service.save(user, '2026-03-10', 'Gone soon.', NOW)

    assert.isTrue(await service.delete(user, '2026-03-10'))
    assert.isNull(await service.find(user, '2026-03-10'))
  })

  test('reports false when there is nothing to delete', async ({ assert }) => {
    const user = await createUser()
    assert.isFalse(await new JournalService().delete(user, '2026-03-10'))
  })

  test('leaves other dates alone', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    await service.save(user, '2026-03-09', 'Yesterday.', NOW)
    await service.save(user, '2026-03-10', 'Today.', NOW)
    await service.delete(user, '2026-03-10')

    const stored = await service.find(user, '2026-03-09')
    assert.equal(stored?.body, 'Yesterday.')
  })
})

test.group('JournalService | privacy between users', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('another user cannot read an entry for the same date', async ({ assert }) => {
    const alice = await createUser()
    const bob = await createUser()
    const service = new JournalService()
    await service.save(alice, '2026-03-10', 'Private to Alice.', NOW)

    assert.isNull(await service.find(bob, '2026-03-10'))
  })

  test('another user cannot delete it', async ({ assert }) => {
    const alice = await createUser()
    const bob = await createUser()
    const service = new JournalService()
    await service.save(alice, '2026-03-10', 'Private to Alice.', NOW)

    assert.isFalse(await service.delete(bob, '2026-03-10'))
    const stored = await service.find(alice, '2026-03-10')
    assert.equal(stored?.body, 'Private to Alice.')
  })

  test('saving the same date as another user makes a separate entry', async ({ assert }) => {
    const alice = await createUser()
    const bob = await createUser()
    const service = new JournalService()
    await service.save(alice, '2026-03-10', 'Alice.', NOW)
    await service.save(bob, '2026-03-10', 'Bob.', NOW)

    const stored = await service.find(alice, '2026-03-10')
    assert.equal(stored?.body, 'Alice.')
    const stored2 = await service.find(bob, '2026-03-10')
    assert.equal(stored2?.body, 'Bob.')
    assert.equal(await entryCount(), 2)
  })

  test('history lists only the user’s own entries', async ({ assert }) => {
    const alice = await createUser()
    const bob = await createUser()
    const service = new JournalService()
    await service.save(alice, '2026-03-10', 'Alice.', NOW)
    await service.save(bob, '2026-03-09', 'Bob.', NOW)

    const history = await service.history(bob, 1)

    assert.deepEqual(
      history.items.map((item) => item.date),
      ['2026-03-09']
    )
  })

  test('deleting a user deletes their entries and nobody else’s', async ({ assert }) => {
    const alice = await createUser()
    const bob = await createUser()
    const service = new JournalService()
    await service.save(alice, '2026-03-10', 'Alice.', NOW)
    await service.save(bob, '2026-03-10', 'Bob.', NOW)

    await alice.delete()

    assert.equal(await entryCount(), 1)
    const stored = await service.find(bob, '2026-03-10')
    assert.equal(stored?.body, 'Bob.')
  })
})

test.group('JournalService | history', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('lists entries newest date first with a short excerpt', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    await service.save(user, '2026-03-01', 'Oldest.', NOW)
    await service.save(user, '2026-03-10', 'x'.repeat(500), NOW)
    await service.save(user, '2026-03-05', 'Middle.', NOW)

    const history = await service.history(user, 1)

    assert.deepEqual(
      history.items.map((item) => item.date),
      ['2026-03-10', '2026-03-05', '2026-03-01']
    )
    assert.isBelow(history.items[0].excerpt.length, 250)
    assert.equal(history.items[2].excerpt, 'Oldest.')
  })

  test('shows an excerpt as text, without Markdown marks', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    await service.save(
      user,
      '2026-03-01',
      '# Rough day\n\n**Slept badly.** See [the plan](https://example.com).\n\n- [x] meditate',
      NOW
    )

    const history = await service.history(user, 1)

    assert.equal(history.items[0].excerpt, 'Rough day Slept badly. See the plan. meditate')
  })

  test('pages through long histories', async ({ assert }) => {
    const user = await createUser()
    const service = new JournalService()
    for (const day of ['01', '02', '03', '04', '05']) {
      await service.save(user, `2026-03-${day}`, `Day ${day}.`, NOW)
    }

    const first = await service.history(user, 1, 2)
    const last = await service.history(user, 3, 2)

    assert.deepEqual(
      first.items.map((item) => item.date),
      ['2026-03-05', '2026-03-04']
    )
    assert.deepEqual(
      last.items.map((item) => item.date),
      ['2026-03-01']
    )
    assert.equal(first.lastPage, 3)
    assert.equal(first.total, 5)
  })

  test('is empty for a user who has not written anything', async ({ assert }) => {
    const user = await createUser()
    const history = await new JournalService().history(user, 1)

    assert.deepEqual(history.items, [])
    assert.equal(history.total, 0)
  })
})
