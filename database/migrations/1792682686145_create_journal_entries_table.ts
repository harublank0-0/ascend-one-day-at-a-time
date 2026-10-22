import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'journal_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      /**
       * Journal entries belong to the user, not to a clean period, so starting
       * a new clean period can never touch them.
       */
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      /**
       * Calendar date the entry is for (no time, no zone).
       */
      table.date('entry_date').notNullable()

      table.text('body').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      /**
       * One entry per user per day. Saving the same day again updates it.
       */
      table.unique(['user_id', 'entry_date'])

      table.check('char_length(btrim(??)) > 0', ['body'], 'journal_entries_body_not_blank')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
