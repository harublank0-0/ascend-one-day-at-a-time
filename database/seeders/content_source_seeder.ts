import { ContentSources } from '#constants/content_sources'
import ContentSource from '#models/content_source'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Write your database queries inside the run method

    const contentSources = Object.values(ContentSources)

    try {
      const createdContentSources = await ContentSource.updateOrCreateMany('slug', contentSources)

      console.log('Successfully Seeded Content Source')

      createdContentSources.map((contentSource) => {
        console.log(`Create content source: ${contentSource.name}`)
      })
    } catch (error) {
      console.log('Failed to create content source.', {
        error,
      })
    }
  }
}
