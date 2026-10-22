import { DateTime, Settings } from 'luxon'

/**
 * Makes `DateTime.now()` return a fixed instant for the whole process, so an
 * HTTP test can place "now" on either side of a user's local midnight. Returns
 * a function that puts the real clock back; call it from a teardown.
 */
export function freezeClock(iso: string) {
  const original = Settings.now
  const frozen = DateTime.fromISO(iso, { zone: 'utc' }).toMillis()
  Settings.now = () => frozen
  return () => {
    Settings.now = original
  }
}
