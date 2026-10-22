import env from '#start/env'
import db from '@adonisjs/lucid/services/db'

const TEST_DATABASE_NAME = /^[a-z0-9_]+_test$/

/**
 * Refuses to run against anything that is not an explicit test database, then
 * creates that database when it does not exist yet. Tests truncate every table,
 * so pointing them at the development database would destroy real data.
 */
export async function ensureTestDatabase() {
  const name = env.get('DB_DATABASE')

  if (!TEST_DATABASE_NAME.test(name)) {
    throw new Error(
      `Refusing to run tests against database "${name}". ` +
        'Set DB_DATABASE to a name ending in "_test" in .env.test.'
    )
  }

  db.manager.add('maintenance', {
    client: 'pg',
    connection: {
      host: env.get('DB_HOST'),
      port: env.get('DB_PORT'),
      user: env.get('DB_USER'),
      password: env.get('DB_PASSWORD'),
      database: 'postgres',
    },
  })

  try {
    const maintenance = db.connection('maintenance')
    const existing = await maintenance.rawQuery('select 1 from pg_database where datname = ?', [
      name,
    ])

    if (existing.rows.length === 0) {
      await maintenance.rawQuery(`create database "${name}"`)
    }
  } finally {
    await db.manager.close('maintenance', true)
  }
}
