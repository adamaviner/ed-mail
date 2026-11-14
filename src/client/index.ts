import type { GenericActionCtx, GenericDataModel, GenericMutationCtx, GenericQueryCtx } from 'convex/server'
import type { ComponentApi } from '../component/_generated/component.js'

export type { ComponentApi }

// The smallest ctx each method needs, so app code can pass whichever ctx it has.
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, 'runQuery'>
type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, 'runQuery' | 'runMutation'>
export type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, 'runQuery' | 'runMutation' | 'runAction'>

export type MailSettings = { retentionDays: number; digestTo: string; retryMinutes: number[] }

/**
 * What the app's convex/ code uses: `export const mail = new Mail(components.mail)`.
 * Sending, the worker, the admin api and routes arrive in later versions; this first one only holds
 * the settings, so an app can mount the component and check it works end to end.
 */
export class Mail {
  constructor(public readonly component: ComponentApi) {}

  async settings(ctx: RunQueryCtx): Promise<MailSettings> {
    return await ctx.runQuery(this.component.settings.get, {})
  }

  async updateSettings(ctx: RunMutationCtx, patch: Partial<MailSettings>): Promise<void> {
    await ctx.runMutation(this.component.settings.update, patch)
  }
}
