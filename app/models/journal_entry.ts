import { JournalEntrySchema } from '#database/schema'

/**
 * A user's private reflection for one calendar date. There is at most one per
 * user per date.
 */
export default class JournalEntry extends JournalEntrySchema {}
