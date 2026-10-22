import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  types: {
    /**
     * DATE columns are calendar dates, handled as "YYYY-MM-DD" strings so they
     * are never given a time or zone (see docs/adr/0001-time-and-timezone-handling.md).
     * config/database.ts makes the driver return them as strings.
     */
    date: { tsType: 'string', decorators: [{ name: '@column' }] },
  },
} satisfies SchemaRules
