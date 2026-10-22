import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { Session } from '#tests/helpers/http'
import { createUser, TEST_PASSWORD } from '#tests/helpers/factories'

const validSignup = (overrides: Record<string, string> = {}) => ({
  fullName: 'Sam Rivera',
  email: 'sam@example.com',
  password: 'correct-horse-1',
  passwordConfirmation: 'correct-horse-1',
  ...overrides,
})

async function userCount() {
  const totals = await User.query().count('* as total').firstOrFail()
  return totals.$extras.total as number
}

test.group('auth | signup', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('shows the signup form', async ({ assert }) => {
    const response = await new Session().get('/signup')

    assert.equal(response.status, 200)
    assert.equal(response.page?.component, 'auth/signup')
  })

  test('creates the account, stores only a hash, and signs the user in', async ({ assert }) => {
    const session = new Session()
    const response = await session.submitFrom('/signup', 'POST', '/signup', validSignup())

    assert.equal(response.status, 302)
    const user = await User.findByOrFail('email', 'sam@example.com')
    assert.notEqual(user.password, 'correct-horse-1')
    assert.isTrue(await hash.verify(user.password, 'correct-horse-1'))
    const current = await session.currentUser()
    assert.equal(current?.email, 'sam@example.com')
  })

  test('never sends the password hash to the browser', async ({ assert }) => {
    const session = new Session()
    await session.submitFrom('/signup', 'POST', '/signup', validSignup())

    const stored = await User.firstOrFail()
    const landed = await session.visit('/')
    assert.notProperty(landed.page?.props.user, 'password')
    assert.notInclude(landed.body, stored.password)
  })

  test('lower-cases and trims the email so it can be matched later', async ({ assert }) => {
    const session = new Session()
    await session.submitFrom(
      '/signup',
      'POST',
      '/signup',
      validSignup({ email: '  Sam.Rivera@Example.COM ' })
    )

    const user = await User.firstOrFail()
    assert.equal(user.email, 'sam.rivera@example.com')
  })

  test('accepts a long generated password', async ({ assert }) => {
    const session = new Session()
    const long = `Pw-${'x1'.repeat(30)}`
    await session.submitFrom(
      '/signup',
      'POST',
      '/signup',
      validSignup({ password: long, passwordConfirmation: long })
    )

    assert.equal(await userCount(), 1)
  })

  test('accepts a blank full name', async ({ assert }) => {
    const session = new Session()
    await session.submitFrom('/signup', 'POST', '/signup', validSignup({ fullName: '' }))

    const stored = await User.firstOrFail()
    assert.isNull(stored.fullName)
  })

  test('sends invalid input back to the form with an error on each bad field', async ({
    assert,
  }) => {
    const session = new Session()
    const response = await session.submitFrom(
      '/signup',
      'POST',
      '/signup',
      validSignup({ email: 'not-an-email', password: 'short', passwordConfirmation: 'short' })
    )

    assert.equal(response.location, '/signup')
    const form = await session.follow(response)
    assert.equal(form.page?.component, 'auth/signup')
    assert.deepEqual(Object.keys(form.page?.props.errors).sort(), ['email', 'password'])
    assert.equal(await userCount(), 0)
  })

  test('reports a password confirmation that does not match', async ({ assert }) => {
    const session = new Session()
    const response = await session.submitFrom(
      '/signup',
      'POST',
      '/signup',
      validSignup({ passwordConfirmation: 'something-else-1' })
    )

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'passwordConfirmation')
    assert.equal(await userCount(), 0)
  })

  test('refuses an email that is already registered, whatever its case', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const session = new Session()
    const response = await session.submitFrom(
      '/signup',
      'POST',
      '/signup',
      validSignup({ email: 'Sam@Example.com' })
    )

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'email')
    assert.equal(await userCount(), 1)
  })

  test('refuses a signup posted without the CSRF token', async ({ assert }) => {
    const session = new Session()
    await session.get('/signup')
    const response = await session.postWithoutCsrf('/signup', validSignup())

    assert.equal(response.location, '/signup')
    const form = await session.follow(response)
    assert.match(form.page?.flash.error, /CSRF/)
    assert.equal(await userCount(), 0)
  })
})

test.group('auth | login', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('signs in with the right email and password', async ({ assert }) => {
    const user = await createUser({ email: 'sam@example.com' })
    const session = new Session()
    const response = await session.submitFrom('/login', 'POST', '/login', {
      email: 'sam@example.com',
      password: TEST_PASSWORD,
    })

    assert.equal(response.status, 302)
    const current = await session.currentUser()
    assert.equal(current?.id, user.id)
  })

  test('does not care about the case of the email', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const session = new Session()
    await session.submitFrom('/login', 'POST', '/login', {
      email: ' SAM@Example.com ',
      password: TEST_PASSWORD,
    })

    const current = await session.currentUser()
    assert.equal(current?.email, 'sam@example.com')
  })

  test('a wrong password returns to the form with a message and no session', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const session = new Session()
    const response = await session.submitFrom('/login', 'POST', '/login', {
      email: 'sam@example.com',
      password: 'not-the-password',
    })

    assert.equal(response.location, '/login')
    const form = await session.follow(response)
    assert.equal(form.page?.component, 'auth/login')
    assert.equal(form.page?.flash.error, 'Invalid user credentials')
    assert.isNull(await session.currentUser())
  })

  test('an unknown email gets the same message as a wrong password', async ({ assert }) => {
    const session = new Session()
    const response = await session.submitFrom('/login', 'POST', '/login', {
      email: 'nobody@example.com',
      password: 'whatever-it-is',
    })

    const form = await session.follow(response)
    assert.equal(form.page?.flash.error, 'Invalid user credentials')
  })

  test('requires both fields', async ({ assert }) => {
    const session = new Session()
    const response = await session.submitFrom('/login', 'POST', '/login', {})

    const form = await session.follow(response)
    assert.deepEqual(Object.keys(form.page?.props.errors).sort(), ['email', 'password'])
  })

  test('does not show the login form to someone already signed in', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const session = new Session()
    await session.submitFrom('/login', 'POST', '/login', {
      email: 'sam@example.com',
      password: TEST_PASSWORD,
    })

    const response = await session.get('/login')
    assert.equal(response.status, 302)
    assert.equal(response.location, '/')
  })
})

test.group('auth | logout', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function signedIn() {
    await createUser({ email: 'sam@example.com' })
    const session = new Session()
    await session.submitFrom('/login', 'POST', '/login', {
      email: 'sam@example.com',
      password: TEST_PASSWORD,
    })
    return session
  }

  test('signs the user out and returns to the login page', async ({ assert }) => {
    const session = await signedIn()
    const response = await session.post('/logout')

    assert.equal(response.location, '/login')
    assert.isNull(await session.currentUser())
  })

  test('logging out when already signed out does not error', async ({ assert }) => {
    const session = new Session()
    await session.get('/login')
    const response = await session.post('/logout')

    assert.isBelow(response.status, 400)
  })
})
