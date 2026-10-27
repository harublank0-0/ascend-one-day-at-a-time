import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'password_reset_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      /**
       * One live reset link per user: asking again replaces the old link.
       */
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('users.id')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      /**
       * SHA-256 of the token that was emailed. The token itself is never
       * stored, so a copy of this table cannot be used to reset anyone's
       * password.
       */
      table.string('token_hash', 64).notNullable().unique()

      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
