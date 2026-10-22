import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { Session } from '#tests/helpers/http'
import { signInAs } from '#tests/helpers/sessions'
import { createUser } from '#tests/helpers/factories'

const PRIVATE_PAGES = ['/journal', '/settings', '/welcome']

test.group('access control | signed-out visitors', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  for (const path of PRIVATE_PAGES) {
    test(`${path} sends a signed-out visitor to the login page`, async ({ assert }) => {
      const response = await new Session().get(path)

      assert.equal(response.status, 302)
      assert.equal(response.location, '/login')
    })
  }

  test('state-changing routes refuse a signed-out visitor', async ({ assert }) => {
    const session = new Session()
    await session.get('/login') // gets a valid CSRF token, so only authentication is missing

    const attempts = [
      await session.put('/journal/2026-03-10', { body: 'Sneaky.' }),
      await session.delete('/journal/2026-03-10'),
      await session.post('/clean-time', { startDate: '2026-03-01' }),
      await session.put('/settings/timezone', { timezone: 'UTC' }),
    ]

    for (const attempt of attempts) {
      // 303 rather than 302 for PUT/DELETE: Inertia needs it so the browser follows with GET.
      assert.oneOf(attempt.status, [302, 303])
      assert.equal(attempt.location, '/login')
    }
  })

  test('the home page is public and does not leak a user', async ({ assert }) => {
    const response = await new Session().get('/')

    assert.equal(response.status, 200)
    assert.equal(response.page?.component, 'home')
    assert.isUndefined(response.page?.props.user)
  })
})

test.group('access control | signed-in users', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the home page takes a signed-in user to Today', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.get('/')

    assert.equal(response.status, 302)
    assert.equal(response.location, '/today')
  })

  test('a user who has not chosen a timezone is sent to setup first', async ({ assert }) => {
    const session = await signInAs(await createUser({ timezone: null }))

    for (const path of ['/today', '/journal', '/settings']) {
      const response = await session.get(path)
      assert.equal(response.location, '/welcome', `${path} should lead to setup`)
    }
    const view = await session.get('/')
    assert.equal(view.location, '/welcome')
  })

  test('a user who has finished setup is sent from setup to Today', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.get('/welcome')

    assert.equal(response.status, 302)
    assert.equal(response.location, '/today')
  })

  test('a user still in setup sees the setup page', async ({ assert }) => {
    const session = await signInAs(await createUser({ timezone: null }))
    const response = await session.get('/welcome')

    assert.equal(response.status, 200)
    assert.equal(response.page?.component, 'setup')
  })

  test('unknown pages show the not-found page', async ({ assert }) => {
    const session = await signInAs(await createUser())
    const response = await session.get('/no-such-page')

    assert.equal(response.status, 404)
  })
})
