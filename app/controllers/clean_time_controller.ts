import type { HttpContext } from '@adonisjs/core/http'
import CleanTimeService from '#services/clean_time_service'
import { cleanTimeValidator } from '#validators/clean_time'

export default class CleanTimeController {
  private cleanTime = new CleanTimeService()

  /**
   * Sets the first start date.
   */
  async store({ auth, request, response, session }: HttpContext) {
    const { startDate } = await request.validateUsing(cleanTimeValidator)
    await this.cleanTime.start(auth.getUserOrFail(), startDate)

    session.flash('success', 'Start date saved.')
    return response.redirect().withQs(false).toRoute('settings.show')
  }

  /**
   * Corrects the start date of the current period.
   */
  async update({ auth, request, response, session }: HttpContext) {
    const { startDate } = await request.validateUsing(cleanTimeValidator)
    await this.cleanTime.correctStartDate(auth.getUserOrFail(), startDate)

    session.flash('success', 'Start date updated.')
    return response.redirect().withQs(false).toRoute('settings.show')
  }
}
