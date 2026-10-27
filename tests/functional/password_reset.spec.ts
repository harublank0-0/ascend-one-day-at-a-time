import { createHash } from 'node:crypto'
import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import { Session } from '#tests/helpers/http'
import { freezeClock } from '#tests/helpers/clock'
import { createUser, TEST_PASSWORD } from '#tests/helpers/factories'

const NEW_PASSWORD = 'a-brand-new-password-1'
const FORGOT = '/forgot-password'
const SENT_MESSAGE = /If an account exists for that email/
const BAD_LINK_MESSAGE = /invalid or has expired/

let mails: ReturnType<typeof mail.fake>
const clockRestores: Array<() => void> = []

/**
 * Puts "now" at a fixed instant. Calls stack, and the teardown unwinds them in
 * reverse order so the real clock comes back.
 */
function setNow(iso: string) {
  clockRestores.push(freezeClock(iso))
}

function setup(group: { each: any }) {
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    mails = mail.fake()
    return async () => {
      mail.restore()
      await truncate()
    }
  })
  group.each.teardown(() => {
    while (clockRestores.length > 0) {
      clockRestores.pop()!()
    }
  })
}

/**
 * Every email that went out, whether the app waited for it or queued it. The
 * app sends mail classes, which the fake mailer files under `mails`.
 */
function emails() {
  return [...mails.mails.sent(), ...mails.mails.queued()].map((email) => email.message)
}

function htmlOf(message: ReturnType<typeof emails>[number]) {
  return String(message.nodeMailerMessage.html)
}

/**
 * The token in the link of the most recent email, as the person would follow it.
 */
function tokenInLatestEmail() {
  const message = emails().at(-1)
  if (!message) {
    throw new Error('No email was sent')
  }
  const match = htmlOf(message).match(/\/reset-password\/([\w-]+)/)
  if (!match) {
    throw new Error('The email has no reset link')
  }
  return match[1]
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function askForLink(session: Session, email: string) {
  return session.submitFrom(FORGOT, 'POST', FORGOT, { email })
}

function chooseNewPassword(
  session: Session,
  token: string,
  overrides: Record<string, string> = {}
) {
  return session.submitFrom(`/reset-password/${token}`, 'POST', '/reset-password', {
    token,
    password: NEW_PASSWORD,
    passwordConfirmation: NEW_PASSWORD,
    ...overrides,
  })
}

async function canLogIn(email: string, password: string) {
  const session = new Session()
  await session.submitFrom('/login', 'POST', '/login', { email, password })
  const current = await session.currentUser()
  return current?.email === email
}

test.group('password reset | asking for a link', (group) => {
  setup(group)

  test('shows the form to a signed-out visitor', async ({ assert }) => {
    const response = await new Session().get(FORGOT)

    assert.equal(response.status, 200)
    assert.equal(response.page?.component, 'auth/forgot_password')
  })

  test('sends a signed-in user to the home page instead', async ({ assert }) => {
    const user = await createUser()
    const session = new Session()
    await session.submitFrom('/login', 'POST', '/login', {
      email: user.email,
      password: TEST_PASSWORD,
    })

    const response = await session.get(FORGOT)

    assert.equal(response.location, '/')
  })

  test('emails a reset link to the address on the account', async ({ assert }) => {
    const user = await createUser({ email: 'sam@example.com' })

    const response = await askForLink(new Session(), user.email)

    assert.equal(response.location, FORGOT)
    assert.lengthOf(emails(), 1)
    emails()[0].assertTo('sam@example.com')
    assert.match(tokenInLatestEmail(), /^[\w-]{40,}$/)
  })

  test('matches the address the way login does, ignoring case and spaces', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })

    await askForLink(new Session(), '  Sam@Example.COM ')

    assert.lengthOf(emails(), 1)
    emails()[0].assertTo('sam@example.com')
  })

  test('gives the same answer for an address with no account, and sends nothing', async ({
    assert,
  }) => {
    await createUser({ email: 'sam@example.com' })

    const known = new Session()
    const knownResponse = await askForLink(known, 'sam@example.com')
    const knownPage = await known.follow(knownResponse)

    const unknown = new Session()
    const unknownResponse = await askForLink(unknown, 'nobody@example.com')
    const unknownPage = await unknown.follow(unknownResponse)

    assert.equal(unknownResponse.status, knownResponse.status)
    assert.equal(unknownResponse.location, knownResponse.location)
    assert.match(unknownPage.page?.flash.success, SENT_MESSAGE)
    assert.equal(unknownPage.page?.flash.success, knownPage.page?.flash.success)
    assert.lengthOf(emails(), 1)
    const rows = await db.from('password_reset_tokens').select('*')
    assert.lengthOf(rows, 1)
  })

  test('keeps only a hash of the token', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })

    await askForLink(new Session(), 'sam@example.com')

    const token = tokenInLatestEmail()
    const rows = await db.from('password_reset_tokens').select('*')
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].token_hash, sha256(token))
    assert.notInclude(JSON.stringify(rows[0]), token)
  })

  test('a newer link replaces the older one', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })

    setNow('2026-10-27T10:00:00Z')
    await askForLink(new Session(), 'sam@example.com')
    const first = tokenInLatestEmail()

    setNow('2026-10-27T10:05:00Z')
    await askForLink(new Session(), 'sam@example.com')
    const second = tokenInLatestEmail()

    assert.notEqual(first, second)
    const rows = await db.from('password_reset_tokens').select('*')
    assert.lengthOf(rows, 1)
    const session = new Session()
    const oldLink = await session.get(`/reset-password/${first}`)
    const newLink = await session.get(`/reset-password/${second}`)
    assert.equal(oldLink.location, FORGOT)
    assert.equal(newLink.status, 200)
  })

  test('does not email again within a minute of the last link', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })

    setNow('2026-10-27T10:00:00Z')
    await askForLink(new Session(), 'sam@example.com')
    setNow('2026-10-27T10:00:30Z')
    const session = new Session()
    const response = await askForLink(session, 'sam@example.com')

    assert.lengthOf(emails(), 1)
    const page = await session.follow(response)
    assert.match(page.page?.flash.success, SENT_MESSAGE)
  })

  test('emails again once a minute has passed', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })

    setNow('2026-10-27T10:00:00Z')
    await askForLink(new Session(), 'sam@example.com')
    setNow('2026-10-27T10:01:01Z')
    await askForLink(new Session(), 'sam@example.com')

    assert.lengthOf(emails(), 2)
  })

  test('asks for a valid email address', async ({ assert }) => {
    const session = new Session()
    const response = await askForLink(session, 'not-an-email')

    assert.equal(response.location, FORGOT)
    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'email')
    assert.lengthOf(emails(), 0)
  })

  test('refuses a request posted without the CSRF token', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const session = new Session()
    await session.get(FORGOT)

    const response = await session.postWithoutCsrf(FORGOT, { email: 'sam@example.com' })

    assert.equal(response.location, FORGOT)
    assert.lengthOf(emails(), 0)
  })
})

test.group('password reset | the email', (group) => {
  setup(group)

  test('links to this site and says how long the link lasts', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })

    await askForLink(new Session(), 'sam@example.com')

    const message = emails()[0]
    message.assertSubject('Reset your Ascend password')
    assert.match(htmlOf(message), /href="https?:\/\/[^"]+\/reset-password\/[\w-]+"/)
    assert.include(htmlOf(message), '1 hour')
    message.assertContent('text', /\/reset-password\/[\w-]+/)
  })

  test('does not let a name with markup inject HTML', async ({ assert }) => {
    await createUser({ email: 'sam@example.com', fullName: '<img src=x onerror=alert(1)>' })

    await askForLink(new Session(), 'sam@example.com')

    assert.notInclude(htmlOf(emails()[0]), '<img src=x')
  })
})

test.group('password reset | the link', (group) => {
  setup(group)

  test('opens the form for a good token', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    await askForLink(new Session(), 'sam@example.com')
    const token = tokenInLatestEmail()

    const response = await new Session().get(`/reset-password/${token}`)

    assert.equal(response.status, 200)
    assert.equal(response.page?.component, 'auth/reset_password')
    assert.equal(response.page?.props.token, token)
  })

  test('turns away a token that was never issued', async ({ assert }) => {
    const session = new Session()
    const response = await session.get('/reset-password/made-up-token')

    assert.equal(response.location, FORGOT)
    const page = await session.follow(response)
    assert.match(page.page?.flash.error, BAD_LINK_MESSAGE)
  })

  test('works for the first hour and not after', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    setNow('2026-10-27T10:00:00Z')
    await askForLink(new Session(), 'sam@example.com')
    const token = tokenInLatestEmail()

    setNow('2026-10-27T10:59:00Z')
    const justInTime = await new Session().get(`/reset-password/${token}`)
    assert.equal(justInTime.status, 200)

    setNow('2026-10-27T11:01:00Z')
    const session = new Session()
    const response = await session.get(`/reset-password/${token}`)
    assert.equal(response.location, FORGOT)
    const page = await session.follow(response)
    assert.match(page.page?.flash.error, BAD_LINK_MESSAGE)
  })
})

test.group('password reset | choosing a new password', (group) => {
  setup(group)

  async function requestedToken(email = 'sam@example.com') {
    await askForLink(new Session(), email)
    return tokenInLatestEmail()
  }

  test('changes the password: the new one signs in and the old one does not', async ({
    assert,
  }) => {
    await createUser({ email: 'sam@example.com' })
    const token = await requestedToken()

    await chooseNewPassword(new Session(), token)

    assert.isTrue(await canLogIn('sam@example.com', NEW_PASSWORD))
    assert.isFalse(await canLogIn('sam@example.com', TEST_PASSWORD))
  })

  test('stores the new password as a hash', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const token = await requestedToken()

    await chooseNewPassword(new Session(), token)

    const user = await User.findByOrFail('email', 'sam@example.com')
    assert.notEqual(user.password, NEW_PASSWORD)
    assert.isTrue(await hash.verify(user.password, NEW_PASSWORD))
  })

  test('sends the person to log in, and does not sign them in', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const token = await requestedToken()
    const session = new Session()

    const response = await chooseNewPassword(session, token)

    assert.equal(response.location, '/login')
    const page = await session.follow(response)
    assert.equal(page.page?.component, 'auth/login')
    assert.match(page.page?.flash.success, /password has been changed/i)
    assert.isNull(await session.currentUser())
  })

  test('works once: the same link cannot be used again', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const token = await requestedToken()
    await chooseNewPassword(new Session(), token)

    const session = new Session()
    const again = await chooseNewPassword(session, token, {
      password: 'someone-elses-choice-1',
      passwordConfirmation: 'someone-elses-choice-1',
    })

    assert.equal(again.location, FORGOT)
    const page = await session.follow(again)
    assert.match(page.page?.flash.error, BAD_LINK_MESSAGE)
    assert.isTrue(await canLogIn('sam@example.com', NEW_PASSWORD))
    assert.lengthOf(await db.from('password_reset_tokens').select('*'), 0)
  })

  test('refuses an expired token and leaves the password alone', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    setNow('2026-10-27T10:00:00Z')
    const token = await requestedToken()

    setNow('2026-10-27T11:01:00Z')
    const session = new Session()
    const response = await chooseNewPassword(session, token)

    assert.equal(response.location, FORGOT)
    assert.isTrue(await canLogIn('sam@example.com', TEST_PASSWORD))
    assert.isFalse(await canLogIn('sam@example.com', NEW_PASSWORD))
  })

  test('refuses a token that was never issued', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })

    const response = await chooseNewPassword(new Session(), 'made-up-token')

    assert.equal(response.location, FORGOT)
    assert.isTrue(await canLogIn('sam@example.com', TEST_PASSWORD))
  })

  test('refuses a confirmation that does not match, and keeps the link usable', async ({
    assert,
  }) => {
    await createUser({ email: 'sam@example.com' })
    const token = await requestedToken()
    const session = new Session()

    const response = await chooseNewPassword(session, token, {
      passwordConfirmation: 'something-else-entirely-1',
    })

    assert.equal(response.location, `/reset-password/${token}`)
    const form = await session.follow(response)
    assert.equal(form.page?.component, 'auth/reset_password')
    assert.property(form.page?.props.errors, 'passwordConfirmation')
    assert.isTrue(await canLogIn('sam@example.com', TEST_PASSWORD))

    await chooseNewPassword(new Session(), token)
    assert.isTrue(await canLogIn('sam@example.com', NEW_PASSWORD))
  })

  test('refuses a password that is too short', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const token = await requestedToken()
    const session = new Session()

    const response = await chooseNewPassword(session, token, {
      password: 'short',
      passwordConfirmation: 'short',
    })

    const form = await session.follow(response)
    assert.property(form.page?.props.errors, 'password')
    assert.isTrue(await canLogIn('sam@example.com', TEST_PASSWORD))
  })

  test('changes only the account the link was issued for', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    await createUser({ email: 'alex@example.com' })
    const token = await requestedToken('sam@example.com')

    await chooseNewPassword(new Session(), token)

    assert.isTrue(await canLogIn('sam@example.com', NEW_PASSWORD))
    assert.isTrue(await canLogIn('alex@example.com', TEST_PASSWORD))
  })

  test('refuses a reset posted without the CSRF token', async ({ assert }) => {
    await createUser({ email: 'sam@example.com' })
    const token = await requestedToken()
    const session = new Session()
    await session.get(`/reset-password/${token}`)

    await session.postWithoutCsrf('/reset-password', {
      token,
      password: NEW_PASSWORD,
      passwordConfirmation: NEW_PASSWORD,
    })

    assert.isTrue(await canLogIn('sam@example.com', TEST_PASSWORD))
  })
})
