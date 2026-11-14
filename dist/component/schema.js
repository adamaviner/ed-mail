import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
// The remaining tables (senders, oauthStates, messages, bodies, texts) arrive with the sending
// code; see docs/email-lib-plan.md section 4.1 in ed-schedule.
export default defineSchema({
    // At most one row. A missing row or field means the default in settings.ts.
    settings: defineTable({
        retentionDays: v.optional(v.number()),
        digestTo: v.optional(v.string()),
        retryMinutes: v.optional(v.array(v.number())),
    }),
});
//# sourceMappingURL=schema.js.map