import { Mail } from '@earthdance/mail'
import { components } from './_generated/api.js'
import { query } from './_generated/server.js'

const mail = new Mail(components.mail)

export const settings = query({ args: {}, handler: async (ctx) => await mail.settings(ctx) })
