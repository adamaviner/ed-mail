export declare const get: import("convex/server").RegisteredQuery<"public", {
    key: string;
}, Promise<{
    key: string;
    subject: string;
    body: string;
    updatedAt: number;
    updatedBy: string | null;
} | null>>;
/** Every saved text (one row per kind an admin changed: a few dozen at most). */
export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    key: string;
    subject: string;
    body: string;
    updatedAt: number;
    updatedBy: string | null;
}[]>>;
export declare const save: import("convex/server").RegisteredMutation<"public", {
    by?: string | undefined;
    key: string;
    now: number;
    subject: string;
    body: string;
}, Promise<null>>;
/** Back to the built-in wording. */
export declare const reset: import("convex/server").RegisteredMutation<"public", {
    key: string;
}, Promise<null>>;
//# sourceMappingURL=texts.d.ts.map