import { PasswordResetTokenSchema } from '#database/schema'

/**
 * A pending "forgot password" link. Only a hash of the emailed token is kept,
 * and a user has at most one at a time.
 */
export default class PasswordResetToken extends PasswordResetTokenSchema {}
