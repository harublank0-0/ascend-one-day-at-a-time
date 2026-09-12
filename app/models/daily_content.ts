import { DailyContentSchema } from '#database/schema'
import ContentSource from '#models/content_source'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class DailyContent extends DailyContentSchema {
  @belongsTo(() => ContentSource, {
    foreignKey: 'contentSourceId',
  })
  declare contentSoucrce: BelongsTo<typeof ContentSource>
}
