import type { HttpContext } from '@adonisjs/core/http'
import TodayService from '#services/today_service'

export default class TodayController {
  private today = new TodayService()

  async show({ auth, request, inertia, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const day = this.today.resolveDay(user, request.qs().date)

    // The requested date was not usable; send them to the address that matches
    // what would be shown (and drop the bad query string so it cannot loop).
    if (day.corrected) {
      return response.redirect().withQs(false).toRoute('today.show')
    }

    return inertia.render('today', await this.today.page(user, day))
  }
}
