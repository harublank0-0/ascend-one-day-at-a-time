import User from '#models/user'

let counter = 0

export const TEST_PASSWORD = 'correct-horse-battery'

/**
 * Creates a user with a unique email and, unless told otherwise, a saved
 * timezone (so they are past setup).
 */
export async function createUser(
  attributes: Partial<{ email: string; fullName: string | null; timezone: string | null }> = {}
) {
  counter += 1
  return User.create({
    email: `user${counter}@example.com`,
    fullName: `Test User ${counter}`,
    password: TEST_PASSWORD,
    timezone: 'UTC',
    ...attributes,
  })
}
