// The admin api as the browser sees it: the function references an app's codegen makes for the
// module that re-exports mail.adminApi() (convex/mailAdmin.ts), typed from the library's own
// adminApi so an app passing `api.mailAdmin` gets its arguments and results checked.
import type { ApiFromModules, FunctionReturnType } from 'convex/server'
import type { ReactNode } from 'react'
import type { adminApi } from '../client/admin.js'
import type { MailConfig } from '../core/config.js'
import type { PreviewRenderer } from './letter/preview.js'

export type MailAdminApi = ApiFromModules<{ mailAdmin: ReturnType<typeof adminApi> }>['mailAdmin']

/** What the app's admin check gets: ed-schedule passes { token }. Opaque to the library. */
export type MailAuth = unknown

export type MailSenders = FunctionReturnType<MailAdminApi['senders']>
export type SenderLine = MailSenders['senders'][number]
export type ConnectedSender = NonNullable<SenderLine['sender']>
export type MailText = FunctionReturnType<MailAdminApi['texts']>[number]
export type MailMessage = FunctionReturnType<MailAdminApi['messages']>['page'][number]
export type MailRef = NonNullable<MailMessage['ref']>

/** The kinds of a config, as strings. */
export type KindKey<C extends MailConfig> = keyof C['kinds'] & string
export type SenderKey<C extends MailConfig> = keyof C['senders'] & string

/** Per-kind preview renderers, for kinds whose preview needs more than the sample values. */
export type PreviewRenderers<C extends MailConfig> = { readonly [K in KindKey<C>]?: PreviewRenderer }

/** What the props shared by every admin piece hold. */
export interface MailAdminBase<C extends MailConfig> {
  /** The app's `api.mailAdmin`. */
  api: MailAdminApi
  auth: MailAuth
  config: C
}

/**
 * A row the app adds to the Emails tab: a setting or link that belongs with the emails but isn't a
 * kind's wording (an attachment's address, an event's own letter).
 */
export interface ExtraEmailRow {
  key: string
  /** The sender line it's listed under; none puts it at the end. */
  sender?: string
  title: string
  when?: string
  /** On the right: a link elsewhere, or a button. */
  action?: ReactNode
  /** Under the title: a small form of the app's. */
  children?: ReactNode
}
