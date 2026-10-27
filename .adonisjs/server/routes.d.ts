import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'today.show': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'forgot_password.create': { paramsTuple?: []; params?: {} }
    'forgot_password.store': { paramsTuple?: []; params?: {} }
    'reset_password.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'reset_password.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'setup.store': { paramsTuple?: []; params?: {} }
    'journal.index': { paramsTuple?: []; params?: {} }
    'journal.update': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'journal.destroy': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'settings.show': { paramsTuple?: []; params?: {} }
    'timezone.update': { paramsTuple?: []; params?: {} }
    'clean_time.store': { paramsTuple?: []; params?: {} }
    'clean_time.update': { paramsTuple?: []; params?: {} }
    'new_clean_period.store': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'today.show': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'forgot_password.create': { paramsTuple?: []; params?: {} }
    'reset_password.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'journal.index': { paramsTuple?: []; params?: {} }
    'settings.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'today.show': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'forgot_password.create': { paramsTuple?: []; params?: {} }
    'reset_password.create': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'setup.show': { paramsTuple?: []; params?: {} }
    'journal.index': { paramsTuple?: []; params?: {} }
    'settings.show': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'forgot_password.store': { paramsTuple?: []; params?: {} }
    'reset_password.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'setup.store': { paramsTuple?: []; params?: {} }
    'clean_time.store': { paramsTuple?: []; params?: {} }
    'new_clean_period.store': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'journal.update': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'timezone.update': { paramsTuple?: []; params?: {} }
    'clean_time.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'journal.destroy': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}