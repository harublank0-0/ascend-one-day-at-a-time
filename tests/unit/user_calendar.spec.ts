import { test } from '@japa/runner'
import { guestTimeZone } from '#services/user_calendar'

test.group('user_calendar | guestTimeZone', () => {
  test('uses the zone the visitor’s browser reported', ({ assert }) => {
    assert.equal(guestTimeZone('Asia/Kathmandu'), 'Asia/Kathmandu')
    assert.equal(guestTimeZone('America/New_York'), 'America/New_York')
  })

  test('falls back to UTC when there is no usable zone', ({ assert }) => {
    for (const value of [undefined, null, '', 'Mars/Olympus', '+05:30', 'drop table users', 42]) {
      assert.equal(guestTimeZone(value), 'UTC', `expected UTC for ${JSON.stringify(value)}`)
    }
  })
})
