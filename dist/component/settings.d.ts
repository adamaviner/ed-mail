import { type QueryCtx } from './_generated/server.js';
/** About six months. */
export declare const DEFAULT_SETTINGS: {
    retentionDays: number;
    digestTo: string;
    retryMinutes: number[];
};
export declare function readSettings(ctx: QueryCtx): Promise<{
    retentionDays: number;
    digestTo: string;
    retryMinutes: number[];
}>;
export declare const get: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    retentionDays: number;
    digestTo: string;
    retryMinutes: number[];
}>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    digestTo?: string | undefined;
    retentionDays?: number | undefined;
    retryMinutes?: number[] | undefined;
}, Promise<null>>;
//# sourceMappingURL=settings.d.ts.map