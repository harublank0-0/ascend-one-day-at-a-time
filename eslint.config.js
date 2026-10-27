import { configApp } from '@adonisjs/eslint-config'
import { react } from '@adonisjs/eslint-config/react'

export default configApp(...react, {
  // shared/ holds the few modules that run in both the browser and on the
  // server (the journal Markdown options, the live editor styling), so the
  // frontend is allowed to import from it.
  name: 'Ascend code shared by the server and the browser',
  files: ['inertia/**/*.{ts,tsx}'],
  rules: {
    '@adonisjs/no-backend-import-in-frontend': [
      'error',
      { allowed: ['../shared/*', '../../shared/*', '../../../shared/*'] },
    ],
  },
})
