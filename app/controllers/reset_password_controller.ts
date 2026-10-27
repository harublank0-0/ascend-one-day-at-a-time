import type { HttpContext } from '@adonisjs/core/http'
import PasswordResetService from '#services/password_reset_service'
import { resetPasswordValidator } from '#validators/password_reset'

const BAD_LINK = 'That link is invalid or has expired. Ask for a new one.'

export default class ResetPasswordController {
  private passwordReset = new PasswordResetService()

  async create({ params, inertia, response, session }: HttpContext) {
    const token = params.token as string
    if (!(await this.passwordReset.isUsable(token))) {
      session.flash('error', BAD_LINK)
      return response.redirect().toRoute('forgot_password.create')
    }

    return inertia.render('auth/reset_password', { token })
  }

  async store({ request, response, session }: HttpContext) {
    const { token, password } = await request.validateUsing(resetPasswordValidator)

    if (!(await this.passwordReset.resetPassword(token, password))) {
      session.flash('error', BAD_LINK)
      return response.redirect().toRoute('forgot_password.create')
    }

    session.flash('success', 'Your password has been changed. Log in with the new one.')
    response.redirect().toRoute('session.create')
  }
}
