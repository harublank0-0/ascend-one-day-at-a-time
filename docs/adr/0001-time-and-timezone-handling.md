# ADR 0001: Time and timezone handling

- Status: Accepted
- Date: 2026-10-22

## Context

Ascend is a "one day at a time" app. Almost everything a user sees is tied to a
day on their own wall calendar: how many days clean they are, which reading is
today's, which journal entry is theirs for a date. The server runs in UTC
(`TZ=UTC`) and users are not. Three different ideas of "time" are easy to mix up,
and mixing them produces off-by-one days near midnight.

## Decision

Keep three concepts separate and never convert one into another by accident.

### 1. Calendar dates

A day on the user's calendar, with no time of day and no zone.

- Examples: the clean start date, a journal entry's date, the date being viewed.
- Stored as PostgreSQL `DATE`. Handled in code as a `"YYYY-MM-DD"` string
  (`CalendarDate` in `app/services/calendar_dates.ts`), never as a JavaScript
  `Date`, which would silently attach a zone.
- Arithmetic is done on the dates themselves. `daysBetween` reads both at UTC
  midnight so a 23- or 25-hour daylight-saving day cannot skew a count.

### 2. Exact timestamps

A real instant: `created_at`, `updated_at`.

- Stored as `timestamptz` and handled as luxon `DateTime` values.
- Never used to decide which calendar day something belongs to.

### 3. Annually recurring readings

The Daily Stoic and JFT repeat every year, so a reading is keyed by
**source + month + day**, not by a full date.

- A date is turned into its reading with `monthDayOf(date)`.
- There is no year on a reading and no `content_date` column.

### The user's timezone

- Each user has one saved IANA zone name (`users.timezone`), validated on the
  server with `normalizeTimeZone`. UTC offsets such as `+05:30` are rejected,
  because an offset does not know when daylight saving begins.
- The browser's zone is only a suggestion during setup; the user can correct it.
- "Today" is always `localToday(user.timezone)`, computed on the server. The
  client never decides what day it is.
- The zone name is stored as chosen. ICU rewrites some valid names to legacy
  aliases (`Asia/Kathmandu` becomes `Asia/Katmandu`) and browsers report either
  spelling, so rewriting would break matching against the picker.
- A user whose timezone is not set yet is sent to setup before seeing any date.

## Conventions that follow

- **Days clean:** the start date is 0 days; the next local date is 1. This counts
  _completed_ local calendar days. Hours are never shown, because only a date is
  recorded.
- **Future dates:** clean start dates and journal dates in the future (relative to
  the user's local today) are rejected.
- **February 29:** the datasets contain 366 readings per source, including
  Feb 29. A reading is shown on a date only when that date exists. In a
  non-leap year no date maps to Feb 29, so that reading is not shown and no other
  day's reading is substituted for it. In a leap year, Feb 29 shows its own reading.
- **Missing readings:** if a source has no row for a month and day, the page says
  so explicitly. Nothing is invented or borrowed from another day.
- **Journal:** one entry per user per calendar date, enforced by a unique
  constraint on `(user_id, entry_date)`.

## Consequences

- Changing timezone changes what "today" is. Stored dates are not rewritten: a
  clean start date or a journal entry keeps the calendar date the user gave.
- A user who travels sees the day of their saved zone until they change it.
  Detecting travel automatically is out of scope.
- Because dates are strings end to end, tests can assert exact calendar dates
  without depending on the machine's timezone.
