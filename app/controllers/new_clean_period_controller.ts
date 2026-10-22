import type { HttpContext } from '@adonisjs/core/http'
import CleanTimeService from '#services/clean_time_service'
import { newCleanPeriodValidator } from '#validators/clean_time'

export default class NewCleanPeriodController {
  private cleanTime = new CleanTimeService()

  /**
   * Begins a new clean period. The earlier one stays in history and nothing
   * else (journal entries included) is touched.
   */
  async store({ auth, request, response, session }: HttpContext) {
    const { startDate } = await request.validateUsing(newCleanPeriodValidator)
    await this.cleanTime.startNewPeriod(auth.getUserOrFail(), startDate)

    session.flash('success', 'A new period has begun. Every day counts.')
    return response.redirect().withQs(false).toRoute('settings.show')
  }
}
