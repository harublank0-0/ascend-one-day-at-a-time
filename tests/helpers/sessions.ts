import type User from '#models/user'
import { Session } from '#tests/helpers/http'
import { TEST_PASSWORD } from '#tests/helpers/factories'

/**
 * A browser session signed in as the given user, through the real login form.
 */
export async function signInAs(user: User) {
  const session = new Session()
  const response = await session.submitFrom('/login', 'POST', '/login', {
    email: user.email,
    password: TEST_PASSWORD,
  })
  if (response.status !== 302 || response.location !== '/') {
    throw new Error(`Could not sign in as ${user.email}: ${response.status} ${response.location}`)
  }
  return session
}
