import type { HttpContext } from '@adonisjs/core/http'
import UserSettingsService from '#services/user_settings_service'
import { setupValidator } from '#validators/setup'

export default class SetupController {
  private settings = new UserSettingsService()

  async show({ auth, inertia, response }: HttpContext) {
    if (auth.getUserOrFail().timezone) {
      return response.redirect().withQs(false).toRoute('today.show')
    }
    return inertia.render('setup', {})
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.timezone) {
      return response.redirect().withQs(false).toRoute('today.show')
    }

    const payload = await request.validateUsing(setupValidator)
    await this.settings.completeSetup(user, payload)
    return response.redirect().withQs(false).toRoute('today.show')
  }
}
