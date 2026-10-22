import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Sends a signed-in user who has not chosen a timezone to setup first. Every
 * date in the app depends on it, so nothing past setup can work without one.
 * Must run after the auth middleware.
 */
export default class EnsureSetupMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.auth.getUserOrFail().timezone) {
      return ctx.response.redirect().withQs(false).toRoute('setup.show')
    }
    return next()
  }
}
