import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

/**
 * How long the link in the email works, as the email says it. Keep it in step
 * with the lifetime in PasswordResetService.
 */
const LIFETIME = '1 hour'

/**
 * The email with the one-time link for choosing a new password.
 */
export default class PasswordResetMail extends BaseMail {
  subject = 'Reset your Ascend password'

  constructor(
    private user: User,
    private resetUrl: string
  ) {
    super()
  }

  prepare() {
    this.message
      .to(this.user.email)
      .htmlView('emails/password_reset_html', {
        name: this.user.fullName,
        resetUrl: this.resetUrl,
        lifetime: LIFETIME,
      })
      .text(this.plainText())
  }

  /**
   * The plain-text alternative is written here, not in a template, so a
   * formatter cannot reflow it.
   */
  private plainText() {
    return [
      this.user.fullName ? `Hi ${this.user.fullName},` : 'Hi,',
      '',
      'Someone asked to reset the password for your Ascend account. To choose a new one, open this link:',
      '',
      this.resetUrl,
      '',
      `The link works for ${LIFETIME} and can be used once. If you didn't ask for this, you can ignore this email and your password will stay as it is.`,
      '',
    ].join('\n')
  }
}
