declare const _default: import("convex/server").SchemaDefinition<{
    settings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        digestTo?: string | undefined;
        retentionDays?: number | undefined;
        retryMinutes?: number[] | undefined;
    }, {
        retentionDays: import("convex/values").VFloat64<number | undefined, "optional">;
        digestTo: import("convex/values").VString<string | undefined, "optional">;
        retryMinutes: import("convex/values").VArray<number[] | undefined, import("convex/values").VFloat64<number, "required">, "optional">;
    }, "required", "digestTo" | "retentionDays" | "retryMinutes">, {}, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map