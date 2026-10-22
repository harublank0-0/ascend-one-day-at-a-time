/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  setup: {
    show: typeof routes['setup.show']
    store: typeof routes['setup.store']
  }
  today: {
    show: typeof routes['today.show']
  }
  journal: {
    index: typeof routes['journal.index']
    update: typeof routes['journal.update']
    destroy: typeof routes['journal.destroy']
  }
  settings: {
    show: typeof routes['settings.show']
  }
  timezone: {
    update: typeof routes['timezone.update']
  }
  cleanTime: {
    store: typeof routes['clean_time.store']
    update: typeof routes['clean_time.update']
  }
  newCleanPeriod: {
    store: typeof routes['new_clean_period.store']
  }
}
