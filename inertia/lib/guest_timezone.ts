import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import { browserTimeZone } from '~/components/timezone_field'

/**
 * Cookie the server reads (GUEST_TIMEZONE_COOKIE in app/services/user_calendar.ts)
 * to work out what day it is for someone who is not signed in.
 */
const COOKIE_NAME = 'guest_timezone'

function readCookie() {
  const entry = document.cookie.split('; ').find((part) => part.startsWith(`${COOKIE_NAME}=`))
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : null
}

/**
 * A guest has no saved timezone, so the browser tells the server its own. The
 * first visit is read in UTC; once the cookie is set the page reloads in the
 * visitor's zone. Nothing happens again until the browser's zone changes, so a
 * zone the server does not recognise cannot cause a reload loop.
 */
export function useRememberBrowserTimeZone(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const zone = browserTimeZone()
    if (!zone || readCookie() === zone) {
      return
    }

    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(zone)}; Path=/; Max-Age=31536000; SameSite=Lax`
    router.reload()
  }, [enabled])
}
