import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'daily_contents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.smallint('month').notNullable()

      table.smallint('day').notNullable()

      table.string('title').notNullable()

      table.text('content').notNullable()

      table.jsonb('metadata').nullable()

      table
        .uuid('content_source_id')
        .notNullable()
        .references('content_sources.id')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['content_source_id', 'month', 'day'])

      table.index(['content_source_id'])

      table.index(['content_source_id', 'month', 'day'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
