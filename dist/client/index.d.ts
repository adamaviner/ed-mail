import type { GenericActionCtx, GenericDataModel, GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import type { ComponentApi } from '../component/_generated/component.js';
export type { ComponentApi };
type RunQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, 'runQuery'>;
type RunMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, 'runQuery' | 'runMutation'>;
export type RunActionCtx = Pick<GenericActionCtx<GenericDataModel>, 'runQuery' | 'runMutation' | 'runAction'>;
export type MailSettings = {
    retentionDays: number;
    digestTo: string;
    retryMinutes: number[];
};
/**
 * What the app's convex/ code uses: `export const mail = new Mail(components.mail)`.
 * Sending, the worker, the admin api and routes arrive in later versions; this first one only holds
 * the settings, so an app can mount the component and check it works end to end.
 */
export declare class Mail {
    readonly component: ComponentApi;
    constructor(component: ComponentApi);
    settings(ctx: RunQueryCtx): Promise<MailSettings>;
    updateSettings(ctx: RunMutationCtx, patch: Partial<MailSettings>): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map