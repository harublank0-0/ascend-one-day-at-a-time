import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { urlFor } from '@adonisjs/core/services/url_builder'
import env from '#start/env'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import PasswordResetMail from '#mails/password_reset_mail'

/**
 * How long an emailed link works. The email says "1 hour"; keep them in step.
 */
const LINK_LIFETIME = { hours: 1 }

/**
 * A second request inside this window sends nothing, so the form cannot be
 * used to flood someone's inbox.
 */
const RESEND_AFTER = { seconds: 60 }

function hashOf(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Forgotten passwords: emailing a one-time link and spending it.
 *
 * Methods take `now` so tests can place the clock either side of an expiry;
 * callers outside tests leave it out.
 */
export default class PasswordResetService {
  /**
   * Emails a reset link to the account with this address, if there is one.
   * Nothing tells the caller whether there was, so the page can answer the
   * same way either way. The email is queued rather than awaited so the mail
   * server's speed does not tell either.
   */
  async sendLink(email: string, now: DateTime = DateTime.now()) {
    const user = await User.findBy('email', email)
    if (!user) {
      return
    }

    const recent = await PasswordResetToken.query()
      .where('userId', user.id)
      .where('createdAt', '>', now.minus(RESEND_AFTER).toJSDate())
      .first()
    if (recent) {
      return
    }

    const token = randomBytes(32).toString('base64url')
    await this.replaceLink(user, token, now)
    await mail.sendLater(new PasswordResetMail(user, this.linkFor(token)))
  }

  /**
   * Whether this token is a link that can still be used.
   */
  async isUsable(token: string, now: DateTime = DateTime.now()) {
    const found = await PasswordResetToken.query()
      .where('tokenHash', hashOf(token))
      .where('expiresAt', '>', now.toJSDate())
      .first()
    return found !== null
  }

  /**
   * Spends the link and sets the new password, or does neither. Returns false
   * when the token is unknown, already used or expired.
   */
  async resetPassword(token: string, password: string, now: DateTime = DateTime.now()) {
    return db.transaction(async (trx) => {
      // Deleting is the claim: of two requests with the same token only one
      // gets the row back.
      const claimed = await trx
        .from('password_reset_tokens')
        .where('token_hash', hashOf(token))
        .where('expires_at', '>', now.toJSDate())
        .delete()
        .returning('user_id')
      const userId = claimed[0]?.user_id as number | undefined
      if (userId === undefined) {
        return false
      }

      const user = await User.query({ client: trx }).where('id', userId).firstOrFail()
      user.password = password
      await user.save()
      return true
    })
  }

  private async replaceLink(user: User, token: string, now: DateTime) {
    await db
      .table('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: hashOf(token),
        expires_at: now.plus(LINK_LIFETIME).toJSDate(),
        created_at: now.toJSDate(),
      })
      .onConflict('user_id')
      .merge()
  }

  private linkFor(token: string) {
    return urlFor('reset_password.create', { token }, { prefixUrl: env.get('APP_URL') })
  }
}
