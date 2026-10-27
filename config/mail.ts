import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import type { InferMailers } from '@adonisjs/mail/types'

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),

  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  /**
   * Shared with every email template.
   */
  globals: {
    brandName: 'Ascend',
  },

  mailers: {
    /**
     * In development this points at Mailpit (see docker-compose.yml), which
     * catches every message and shows it in a web inbox instead of sending it.
     * Add an `auth` block here once a real SMTP provider is used.
     */
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
