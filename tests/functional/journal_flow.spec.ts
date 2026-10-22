import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import JournalEntry from '#models/journal_entry'
import { MAX_JOURNAL_LENGTH } from '#services/journal_service'
import { freezeClock } from '#tests/helpers/clock'
import { createUser } from '#tests/helpers/factories'
import { signInAs } from '#tests/helpers/sessions'

async function entryCount() {
  const [{ count }] = await db.from('journal_entries').count('* as count')
  return Number(count)
}

test.group('journal | writing and reloading', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('saves an entry, then shows it again after a reload', async ({ assert }) => {
    const session = await signInAs(await createUser())

    const saved = await session.put(
      '/journal/2026-03-10',
      { body: 'A steady morning.' },
      { from: '/today' }
    )

    assert.equal(saved.status, 303)
    assert.equal(saved.location, '/today?date=2026-03-10')
    const reloaded = await session.follow(saved)
    assert.equal(reloaded.page?.props.entry.body, 'A steady morning.')
    assert.equal(reloaded.page?.flash.success, 'Saved.')
  })

  test('saving again edits the same entry instead of adding another', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.put('/journal/2026-03-10', { body: 'First draft.' }, { from: '/today' })
    await session.put('/journal/2026-03-10', { body: 'Second draft.' }, { from: '/today' })

    assert.equal(await entryCount(), 1)
    const { page: page } = await session.visit('/today')
    assert.equal(page?.props.entry.body, 'Second draft.')
  })

  test('lets the user open and edit an older entry', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.put('/journal/2026-03-02', { body: 'Early March.' }, { from: '/today' })

    const { page: older } = await session.visit('/today?date=2026-03-02')
    assert.equal(older?.props.entry.body, 'Early March.')

    const edited = await session.put(
      '/journal/2026-03-02',
      { body: 'Early March, revised.' },
      { from: '/today?date=2026-03-02' }
    )
    assert.equal(edited.location, '/today?date=2026-03-02')
    const view = await session.follow(edited)
    assert.equal(view.page?.props.entry.body, 'Early March, revised.')
  })

  test('keeps line breaks in what was typed', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.put('/journal/2026-03-10', { body: 'One.\n\nTwo.\nThree.' }, { from: '/today' })

    const view = await session.visit('/today')
    assert.equal(view.page?.props.entry.body, 'One.\n\nTwo.\nThree.')
  })

  test('a blank entry is refused with a message and nothing is stored', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.put('/journal/2026-03-10', { body: '   ' }, { from: '/today' })

    const form = await session.follow(response)
    assert.equal(form.page?.props.errors.body, 'Write something before saving.')
    assert.equal(await entryCount(), 0)
  })

  test('an entry that is too long is refused with a message', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.put(
      '/journal/2026-03-10',
      { body: 'a'.repeat(MAX_JOURNAL_LENGTH + 1) },
      { from: '/today' }
    )

    const form = await session.follow(response)
    assert.match(form.page?.props.errors.body, /characters/)
    assert.equal(await entryCount(), 0)
  })

  test('a failed save leaves the existing entry unchanged', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.put('/journal/2026-03-10', { body: 'Keep this.' }, { from: '/today' })
    await session.put('/journal/2026-03-10', { body: '' }, { from: '/today' })

    const view = await session.visit('/today')
    assert.equal(view.page?.props.entry.body, 'Keep this.')
  })

  test('refuses an entry for a day that has not come yet', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.put(
      '/journal/2026-03-11',
      { body: 'From the future.' },
      { from: '/today' }
    )

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'entryDate')
    assert.equal(await entryCount(), 0)
  })

  test('does not route a malformed date to the controller', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.get('/today')

    for (const path of ['/journal/yesterday', '/journal/2026-3-1', '/journal/2026-02-30x']) {
      const response = await session.put(path, { body: 'Hi.' }, { from: '/today' })
      assert.equal(response.status, 404, path)
    }
  })

  test('deletes an entry and returns to that day', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.put('/journal/2026-03-10', { body: 'Not needed.' }, { from: '/today' })

    const removed = await session.delete('/journal/2026-03-10', {}, { from: '/today' })

    assert.equal(removed.status, 303)
    assert.equal(removed.location, '/today?date=2026-03-10')
    const { page: page } = await session.follow(removed)
    assert.isNull(page?.props.entry)
    assert.equal(page?.flash.success, 'Entry deleted.')
    assert.equal(await entryCount(), 0)
  })

  test('deleting a day with no entry is harmless', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const removed = await session.delete('/journal/2026-03-10', {}, { from: '/today' })

    assert.equal(removed.status, 303)
  })

  test('lists past entries newest first with excerpts', async ({ assert }) => {
    const session = await signInAs(await createUser())
    await session.put('/journal/2026-03-01', { body: 'Oldest entry.' }, { from: '/today' })
    await session.put('/journal/2026-03-09', { body: 'Newest entry.' }, { from: '/today' })
    await session.put('/journal/2026-03-05', { body: 'Middle entry.' }, { from: '/today' })

    const { page } = await session.get('/journal')

    assert.equal(page?.component, 'journal/index')
    assert.deepEqual(
      page?.props.items.map((item: any) => [item.date, item.excerpt, item.dateLabel]),
      [
        ['2026-03-09', 'Newest entry.', 'Monday, March 9, 2026'],
        ['2026-03-05', 'Middle entry.', 'Thursday, March 5, 2026'],
        ['2026-03-01', 'Oldest entry.', 'Sunday, March 1, 2026'],
      ]
    )
    assert.equal(page?.props.total, 3)
  })

  test('shows a friendly empty history to a user with no entries', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const { page } = await session.get('/journal')

    assert.deepEqual(page?.props.items, [])
    assert.equal(page?.props.total, 0)
  })

  test('pages through a long history', async ({ assert }) => {
    const user = await createUser()
    for (let day = 1; day <= 25; day++) {
      await JournalEntry.create({
        userId: user.id,
        entryDate: `2026-02-${String(day).padStart(2, '0')}`,
        body: `Day ${day}`,
      })
    }
    const session = await signInAs(user)

    const { page: first } = await session.get('/journal')
    const { page: second } = await session.get('/journal?page=2')

    assert.lengthOf(first?.props.items, 20)
    assert.equal(first?.props.lastPage, 2)
    assert.lengthOf(second?.props.items, 5)
    assert.equal(second?.props.items[0].date, '2026-02-05')
  })
})

test.group('journal | privacy between accounts', (group) => {
  let restoreClock: () => void
  group.each.setup(async () => {
    restoreClock = freezeClock('2026-03-10T12:00:00Z')
    return testUtils.db().truncate()
  })
  group.each.teardown(() => restoreClock())

  test('one account never sees another account’s entry', async ({ assert }) => {
    const alice = await signInAs(await createUser())
    const bob = await signInAs(await createUser())
    await alice.put('/journal/2026-03-10', { body: 'Alice’s private words.' }, { from: '/today' })

    const bobsDay = await bob.get('/today?date=2026-03-10')
    const bobsHistory = await bob.get('/journal')

    assert.isNull(bobsDay.page?.props.entry)
    assert.deepEqual(bobsHistory.page?.props.items, [])
    assert.notInclude(bobsDay.body, 'private words')
    assert.notInclude(bobsHistory.body, 'private words')
  })

  test('saving the same date from two accounts keeps two separate entries', async ({ assert }) => {
    const alice = await signInAs(await createUser())
    const bob = await signInAs(await createUser())
    await alice.put('/journal/2026-03-10', { body: 'Alice.' }, { from: '/today' })
    await bob.put('/journal/2026-03-10', { body: 'Bob.' }, { from: '/today' })

    assert.equal(await entryCount(), 2)
    const view = await alice.visit('/today')
    assert.equal(view.page?.props.entry.body, 'Alice.')
    const view2 = await bob.visit('/today')
    assert.equal(view2.page?.props.entry.body, 'Bob.')
  })

  test('one account cannot delete another account’s entry', async ({ assert }) => {
    const alice = await signInAs(await createUser())
    const bob = await signInAs(await createUser())
    await alice.put('/journal/2026-03-10', { body: 'Alice.' }, { from: '/today' })

    await bob.delete('/journal/2026-03-10', {}, { from: '/today' })

    assert.equal(await entryCount(), 1)
    const view = await alice.visit('/today')
    assert.equal(view.page?.props.entry.body, 'Alice.')
  })

  test('a submitted user id is ignored', async ({ assert }) => {
    const aliceUser = await createUser()
    const bobUser = await createUser()
    const bob = await signInAs(bobUser)

    await bob.put(
      '/journal/2026-03-10',
      { body: 'Bob writing.', userId: String(aliceUser.id), user_id: String(aliceUser.id) },
      { from: '/today' }
    )

    const entries = await JournalEntry.all()
    assert.lengthOf(entries, 1)
    assert.equal(entries[0].userId, bobUser.id)
  })

  test('a submitted entry id or date in the body cannot redirect the write', async ({ assert }) => {
    const aliceUser = await createUser()
    const alice = await signInAs(aliceUser)
    await alice.put('/journal/2026-03-10', { body: 'Alice.' }, { from: '/today' })
    const aliceEntry = await JournalEntry.firstOrFail()
    const bob = await signInAs(await createUser())

    await bob.put(
      '/journal/2026-03-09',
      { body: 'Bob overwrite attempt.', id: aliceEntry.id, entryDate: '2026-03-10' },
      { from: '/today' }
    )

    await aliceEntry.refresh()
    assert.equal(aliceEntry.body, 'Alice.')
    assert.equal(await entryCount(), 2)
  })
})
