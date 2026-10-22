import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clean_periods'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      /**
       * Calendar dates (no time, no zone). A period with a null "ended_on" is
       * the user's current one; earlier periods are kept as history.
       */
      table.date('start_date').notNullable()
      table.date('ended_on').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.check(
        '?? is null or ?? >= ??',
        ['ended_on', 'ended_on', 'start_date'],
        'clean_periods_end_after_start'
      )

      table.index(['user_id', 'start_date'])
    })

    /**
     * A user has at most one current clean period.
     */
    this.schema.raw(
      'create unique index clean_periods_one_open_per_user on clean_periods (user_id) where ended_on is null'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
