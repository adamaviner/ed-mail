import { mail } from './mail.js'

export const { drain, revoke, digest } = mail.worker()
