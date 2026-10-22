import type { HttpContext } from '@adonisjs/core/http'
import TodayService from '#services/today_service'
import { GUEST_TIMEZONE_COOKIE, guestTimeZone } from '#services/user_calendar'

export default class TodayController {
  private today = new TodayService()

  /**
   * Open to everyone: a guest sees the day's readings, a signed-in user also
   * gets their clean time and journal.
   */
  async show({ auth, request, inertia, response }: HttpContext) {
    const user = auth.user

    // A signed-in user finishes setup first: every date depends on their timezone.
    if (user && !user.timezone) {
      return response.redirect().withQs(false).toRoute('setup.show')
    }

    // A guest has no saved zone, so use the one their browser reported. The
    // browser sets this cookie itself, which is why it is read unencoded.
    const timeZone =
      user?.timezone ??
      guestTimeZone(request.plainCookie(GUEST_TIMEZONE_COOKIE, { encoded: false }))

    const day = this.today.resolveDay(timeZone, request.qs().date)

    // The requested date was not usable; send them to the address that matches
    // what would be shown (and drop the bad query string so it cannot loop).
    if (day.corrected) {
      return response.redirect().withQs(false).toRoute('today.show')
    }

    if (!user) {
      return inertia.render('today', await this.today.guestPage(day, timeZone))
    }

    return inertia.render('today', await this.today.memberPage(user, day))
  }
}
