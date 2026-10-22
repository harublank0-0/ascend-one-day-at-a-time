import type { HttpContext } from '@adonisjs/core/http'
import JournalService from '#services/journal_service'
import { fullDate } from '#services/date_labels'
import { todayFor } from '#services/user_calendar'
import { journalValidator } from '#validators/journal'

export default class JournalController {
  private journal = new JournalService()

  async index({ auth, request, inertia }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = Math.max(1, Math.floor(Number(request.qs().page)) || 1)
    const history = await this.journal.history(user, page)

    return inertia.render('journal/index', {
      items: history.items.map((item) => ({ ...item, dateLabel: fullDate(item.date) })),
      page: history.page,
      lastPage: history.lastPage,
      total: history.total,
      todayDate: todayFor(user),
    })
  }

  async update({ auth, params, request, response, session }: HttpContext) {
    const { body } = await request.validateUsing(journalValidator)
    await this.journal.save(auth.getUserOrFail(), params.date, body ?? '')

    session.flash('success', 'Saved.')
    return response.redirect().withQs({ date: params.date }).toRoute('today.show')
  }

  async destroy({ auth, params, response, session }: HttpContext) {
    await this.journal.delete(auth.getUserOrFail(), params.date)

    session.flash('success', 'Entry deleted.')
    return response.redirect().withQs({ date: params.date }).toRoute('today.show')
  }
}
