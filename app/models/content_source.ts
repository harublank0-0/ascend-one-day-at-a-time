import { ContentSourceSchema } from '#database/schema'
import DailyContent from '#models/daily_content'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class ContentSource extends ContentSourceSchema {
  @hasMany(() => DailyContent, {
    foreignKey: 'contentSourceId',
  })
  declare dailyContents: HasMany<typeof DailyContent>
}
