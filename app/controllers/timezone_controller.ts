import type { HttpContext } from '@adonisjs/core/http'
import UserSettingsService from '#services/user_settings_service'
import { timezoneValidator } from '#validators/setup'

export default class TimezoneController {
  private settings = new UserSettingsService()

  async update({ auth, request, response, session }: HttpContext) {
    const { timezone } = await request.validateUsing(timezoneValidator)
    await this.settings.changeTimezone(auth.getUserOrFail(), timezone)

    session.flash('success', 'Timezone updated.')
    return response.redirect().withQs(false).toRoute('settings.show')
  }
}
