import type { HttpContext } from '@adonisjs/core/http'
import PasswordResetService from '#services/password_reset_service'
import { forgotPasswordValidator } from '#validators/password_reset'

export default class ForgotPasswordController {
  private passwordReset = new PasswordResetService()

  async create({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async store({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    await this.passwordReset.sendLink(email)

    session.flash(
      'success',
      'If an account exists for that email, we’ve sent a link to reset the password. It works for 1 hour.'
    )
    response.redirect().toRoute('forgot_password.create')
  }
}
