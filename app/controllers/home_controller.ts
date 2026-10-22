import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  /**
   * Visitors get the welcome page; people who are signed in go straight to
   * their day (or to setup, if they have not finished it).
   */
  async index({ auth, inertia, response }: HttpContext) {
    if (auth.user) {
      const next = auth.user.timezone ? 'today.show' : 'setup.show'
      return response.redirect().withQs(false).toRoute(next)
    }
    return inertia.render('home', {})
  }
}
