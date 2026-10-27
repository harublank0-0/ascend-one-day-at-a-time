/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'today.show': {
    methods: ["GET","HEAD"],
    pattern: '/today',
    tokens: [{"old":"/today","type":0,"val":"today","end":""}],
    types: placeholder as Registry['today.show']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'forgot_password.create': {
    methods: ["GET","HEAD"],
    pattern: '/forgot-password',
    tokens: [{"old":"/forgot-password","type":0,"val":"forgot-password","end":""}],
    types: placeholder as Registry['forgot_password.create']['types'],
  },
  'forgot_password.store': {
    methods: ["POST"],
    pattern: '/forgot-password',
    tokens: [{"old":"/forgot-password","type":0,"val":"forgot-password","end":""}],
    types: placeholder as Registry['forgot_password.store']['types'],
  },
  'reset_password.create': {
    methods: ["GET","HEAD"],
    pattern: '/reset-password/:token',
    tokens: [{"old":"/reset-password/:token","type":0,"val":"reset-password","end":""},{"old":"/reset-password/:token","type":1,"val":"token","end":""}],
    types: placeholder as Registry['reset_password.create']['types'],
  },
  'reset_password.store': {
    methods: ["POST"],
    pattern: '/reset-password',
    tokens: [{"old":"/reset-password","type":0,"val":"reset-password","end":""}],
    types: placeholder as Registry['reset_password.store']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'setup.show': {
    methods: ["GET","HEAD"],
    pattern: '/welcome',
    tokens: [{"old":"/welcome","type":0,"val":"welcome","end":""}],
    types: placeholder as Registry['setup.show']['types'],
  },
  'setup.store': {
    methods: ["POST"],
    pattern: '/welcome',
    tokens: [{"old":"/welcome","type":0,"val":"welcome","end":""}],
    types: placeholder as Registry['setup.store']['types'],
  },
  'journal.index': {
    methods: ["GET","HEAD"],
    pattern: '/journal',
    tokens: [{"old":"/journal","type":0,"val":"journal","end":""}],
    types: placeholder as Registry['journal.index']['types'],
  },
  'journal.update': {
    methods: ["PUT"],
    pattern: '/journal/:date',
    tokens: [{"old":"/journal/:date","type":0,"val":"journal","end":""},{"old":"/journal/:date","type":1,"val":"date","end":""}],
    types: placeholder as Registry['journal.update']['types'],
  },
  'journal.destroy': {
    methods: ["DELETE"],
    pattern: '/journal/:date',
    tokens: [{"old":"/journal/:date","type":0,"val":"journal","end":""},{"old":"/journal/:date","type":1,"val":"date","end":""}],
    types: placeholder as Registry['journal.destroy']['types'],
  },
  'settings.show': {
    methods: ["GET","HEAD"],
    pattern: '/settings',
    tokens: [{"old":"/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['settings.show']['types'],
  },
  'timezone.update': {
    methods: ["PUT"],
    pattern: '/settings/timezone',
    tokens: [{"old":"/settings/timezone","type":0,"val":"settings","end":""},{"old":"/settings/timezone","type":0,"val":"timezone","end":""}],
    types: placeholder as Registry['timezone.update']['types'],
  },
  'clean_time.store': {
    methods: ["POST"],
    pattern: '/clean-time',
    tokens: [{"old":"/clean-time","type":0,"val":"clean-time","end":""}],
    types: placeholder as Registry['clean_time.store']['types'],
  },
  'clean_time.update': {
    methods: ["PUT"],
    pattern: '/clean-time',
    tokens: [{"old":"/clean-time","type":0,"val":"clean-time","end":""}],
    types: placeholder as Registry['clean_time.update']['types'],
  },
  'new_clean_period.store': {
    methods: ["POST"],
    pattern: '/clean-time/restart',
    tokens: [{"old":"/clean-time/restart","type":0,"val":"clean-time","end":""},{"old":"/clean-time/restart","type":0,"val":"restart","end":""}],
    types: placeholder as Registry['new_clean_period.store']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
