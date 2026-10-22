/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

/**
 * Journal entries are addressed by calendar date. A date that is not shaped
 * like YYYY-MM-DD never reaches a controller.
 */
router.where('date', { match: /^\d{4}-\d{2}-\d{2}$/ })

router.get('/', [controllers.Home, 'index']).as('home')

/**
 * Today is open to everyone. The controller decides what a guest may see, and
 * sends a signed-in user who has not finished setup to the setup page.
 */
router.get('today', [controllers.Today, 'show'])

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])

    /**
     * First-visit setup: the timezone every date depends on, and optionally a
     * clean start date.
     */
    router.get('welcome', [controllers.Setup, 'show'])
    router.post('welcome', [controllers.Setup, 'store'])

    /**
     * Everything below needs a timezone, so it waits for setup to be finished.
     */
    router
      .group(() => {
        router.get('journal', [controllers.Journal, 'index'])
        router.put('journal/:date', [controllers.Journal, 'update'])
        router.delete('journal/:date', [controllers.Journal, 'destroy'])

        router.get('settings', [controllers.Settings, 'show'])
        router.put('settings/timezone', [controllers.Timezone, 'update'])

        router.post('clean-time', [controllers.CleanTime, 'store'])
        router.put('clean-time', [controllers.CleanTime, 'update'])
        router.post('clean-time/restart', [controllers.NewCleanPeriod, 'store'])
      })
      .use(middleware.setup())
  })
  .use(middleware.auth())
