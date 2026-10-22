import { ContentSources } from '#constants/content_sources'
import ContentSource from '#models/content_source'
import DailyContent from '#models/daily_content'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

type ContentType = {
  date: string
  month: number
  day: number
  source: {
    type: typeof ContentSources.JFT.slug | typeof ContentSources.THE_DAILY_STOIC.slug
    name: typeof ContentSources.JFT.name | typeof ContentSources.THE_DAILY_STOIC.name
  }
  title: string | null
  quote: {
    text: string
    reference: string | null
  }
  content: string
  closing: string | null
}

const getContent = async (fileName: string): Promise<ContentType[]> => {
  const filePath = join(process.cwd(), 'data', 'contents', fileName)
  const file = await readFile(filePath, 'utf8')

  return JSON.parse(file)
}

const jsonToDBMapper = (contents: ContentType[], contentSourceId: string) =>
  contents.map((content) => ({
    contentSourceId: contentSourceId,
    day: content.day,
    month: content.month,
    // Some readings have no title in the book. Store it empty (the column is
    // NOT NULL) and let the page leave the heading out; never invent a title.
    title: content.title?.trim() ?? '',
    content: content.content,

    metadata: {
      closing: content.closing,
      quote: content.quote,
    },
  }))

export default class extends BaseSeeder {
  async run() {
    // Write your database queries inside the run method
    const jftSource = await ContentSource.findByOrFail('slug', ContentSources.JFT.slug)

    const dailyStoicSource = await ContentSource.findByOrFail(
      'slug',
      ContentSources.THE_DAILY_STOIC.slug
    )

    const jftContents = await getContent('jft.json')
    const dailyStoicContents = await getContent('daily-stoic.json')

    const jftPayload = jsonToDBMapper(jftContents, jftSource.id)
    const dailyStoicPayload = jsonToDBMapper(dailyStoicContents, dailyStoicSource.id)

    await DailyContent.updateOrCreateMany(['contentSourceId', 'month', 'day'], jftPayload)

    await DailyContent.updateOrCreateMany(['contentSourceId', 'month', 'day'], dailyStoicPayload)
  }
}
