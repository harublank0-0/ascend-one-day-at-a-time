import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  daysBetween,
  localToday,
  monthDayOf,
  normalizeTimeZone,
  parseCalendarDate,
} from '#services/calendar_dates'

test.group('calendar_dates | daysBetween', () => {
  test('the start date itself is 0 days', ({ assert }) => {
    assert.equal(daysBetween('2026-03-10', '2026-03-10'), 0)
  })

  test('the next local date is 1 day', ({ assert }) => {
    assert.equal(daysBetween('2026-03-10', '2026-03-11'), 1)
  })

  test('counts across month and year boundaries', ({ assert }) => {
    assert.equal(daysBetween('2025-12-31', '2026-01-01'), 1)
    assert.equal(daysBetween('2026-01-31', '2026-03-01'), 29)
  })

  test('counts the leap day when it exists', ({ assert }) => {
    assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2)
    assert.equal(daysBetween('2027-02-28', '2027-03-01'), 1)
  })

  test('is not skewed by a daylight-saving change between the dates', ({ assert }) => {
    // US clocks move forward on 2026-03-08, so that local day is only 23 hours long.
    assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2)
    // ...and back on 2026-11-01, a 25-hour day.
    assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2)
  })

  test('is negative when the end is before the start', ({ assert }) => {
    assert.equal(daysBetween('2026-03-11', '2026-03-10'), -1)
  })
})

test.group('calendar_dates | localToday', () => {
  // One instant, different calendar dates depending on where the user is.
  const instant = DateTime.fromISO('2026-03-10T03:30:00Z')

  test('is the previous date for a user west of UTC', ({ assert }) => {
    assert.equal(localToday('America/New_York', instant), '2026-03-09')
    assert.equal(localToday('Pacific/Pago_Pago', instant), '2026-03-09')
  })

  test('is the same date for a user in UTC and just east of it', ({ assert }) => {
    assert.equal(localToday('UTC', instant), '2026-03-10')
    assert.equal(localToday('Asia/Kolkata', instant), '2026-03-10')
  })

  test('is the next date for a user far east of UTC', ({ assert }) => {
    const lateEvening = DateTime.fromISO('2026-03-10T10:30:00Z')
    assert.equal(localToday('Pacific/Kiritimati', lateEvening), '2026-03-11')
    assert.equal(localToday('UTC', lateEvening), '2026-03-10')
  })

  test('rolls over at local midnight, not UTC midnight', ({ assert }) => {
    // New York is on EDT (UTC-4) by 2026-03-10, so local midnight is 04:00Z.
    const justBefore = DateTime.fromISO('2026-03-10T03:59:59Z')
    const justAfter = DateTime.fromISO('2026-03-10T04:00:00Z')
    assert.equal(localToday('America/New_York', justBefore), '2026-03-09')
    assert.equal(localToday('America/New_York', justAfter), '2026-03-10')
  })
})

test.group('calendar_dates | parseCalendarDate', () => {
  test('accepts real YYYY-MM-DD dates', ({ assert }) => {
    assert.equal(parseCalendarDate('2026-03-10'), '2026-03-10')
    assert.equal(parseCalendarDate('2028-02-29'), '2028-02-29')
  })

  test('rejects a leap day in a non-leap year', ({ assert }) => {
    assert.isNull(parseCalendarDate('2027-02-29'))
  })

  test('rejects impossible and malformed values', ({ assert }) => {
    for (const value of ['2026-02-30', '2026-13-01', '2026-3-1', '03/10/2026', 'today', '', ' ']) {
      assert.isNull(parseCalendarDate(value), `expected "${value}" to be rejected`)
    }
  })

  test('rejects values that are not strings', ({ assert }) => {
    assert.isNull(parseCalendarDate(undefined))
    assert.isNull(parseCalendarDate(20260310))
    assert.isNull(parseCalendarDate(['2026-03-10']))
  })
})

test.group('calendar_dates | normalizeTimeZone', () => {
  test('returns valid IANA names unchanged', ({ assert }) => {
    assert.equal(normalizeTimeZone('America/New_York'), 'America/New_York')
    assert.equal(normalizeTimeZone('Europe/London'), 'Europe/London')
    assert.equal(normalizeTimeZone('UTC'), 'UTC')
  })

  test('keeps the spelling the user or browser chose instead of rewriting aliases', ({
    assert,
  }) => {
    // Browsers report one of these two spellings for Nepal; both are valid IANA names.
    assert.equal(normalizeTimeZone('Asia/Kathmandu'), 'Asia/Kathmandu')
    assert.equal(normalizeTimeZone('Asia/Katmandu'), 'Asia/Katmandu')
    assert.equal(
      normalizeTimeZone('America/Argentina/Buenos_Aires'),
      'America/Argentina/Buenos_Aires'
    )
  })

  test('repairs the casing of a known zone', ({ assert }) => {
    assert.equal(normalizeTimeZone('america/new_york'), 'America/New_York')
  })

  test('rejects unknown zones, offsets and blanks', ({ assert }) => {
    for (const value of ['Mars/Olympus', '+05:30', 'UTC+5', '', '   ', 'Not a zone']) {
      assert.isNull(normalizeTimeZone(value), `expected "${value}" to be rejected`)
    }
  })

  test('rejects values that are not strings', ({ assert }) => {
    assert.isNull(normalizeTimeZone(undefined))
    assert.isNull(normalizeTimeZone(null))
  })
})

test.group('calendar_dates | monthDayOf', () => {
  test('splits a calendar date into the month and day used to key readings', ({ assert }) => {
    assert.deepEqual(monthDayOf('2026-03-10'), { month: 3, day: 10 })
    assert.deepEqual(monthDayOf('2028-02-29'), { month: 2, day: 29 })
  })
})
