/**
 * What the app's convex/ code uses: `export const mail = new Mail(components.mail)`.
 * Sending, the worker, the admin api and routes arrive in later versions; this first one only holds
 * the settings, so an app can mount the component and check it works end to end.
 */
export class Mail {
    component;
    constructor(component) {
        this.component = component;
    }
    async settings(ctx) {
        return await ctx.runQuery(this.component.settings.get, {});
    }
    async updateSettings(ctx, patch) {
        await ctx.runMutation(this.component.settings.update, patch);
    }
}
//# sourceMappingURL=index.js.map