import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * IANA zone name (for example "America/New_York"). Null until the user
       * has been through setup, which is how we know to send them there.
       */
      table.string('timezone', 64).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('timezone')
    })
  }
}
