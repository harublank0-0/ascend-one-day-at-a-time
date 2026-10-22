import type { HttpContext } from '@adonisjs/core/http'
import CleanTimeService from '#services/clean_time_service'
import { presentCleanTime, presentPreviousPeriods } from '#services/clean_time_presenter'
import { fullDate } from '#services/date_labels'
import { todayFor } from '#services/user_calendar'

export default class SettingsController {
  private cleanTime = new CleanTimeService()

  async show({ auth, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const [summary, previousPeriods] = await Promise.all([
      this.cleanTime.summary(user),
      this.cleanTime.previousPeriods(user),
    ])

    const todayDate = todayFor(user)

    return inertia.render('settings', {
      timezone: user.timezone!,
      todayDate,
      todayLabel: fullDate(todayDate),
      cleanTime: presentCleanTime(summary),
      previousPeriods: presentPreviousPeriods(previousPeriods),
    })
  }
}
