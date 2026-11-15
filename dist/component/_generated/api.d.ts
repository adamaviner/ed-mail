/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */
import type * as drain from "../drain.js";
import type * as lease from "../lease.js";
import type * as maintenance from "../maintenance.js";
import type * as messages from "../messages.js";
import type * as senders from "../senders.js";
import type * as settings from "../settings.js";
import type * as texts from "../texts.js";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
declare const fullApi: ApiFromModules<{
    drain: typeof drain;
    lease: typeof lease;
    maintenance: typeof maintenance;
    messages: typeof messages;
    senders: typeof senders;
    settings: typeof settings;
    texts: typeof texts;
}>;
/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
export declare const components: {};
export {};
//# sourceMappingURL=api.d.ts.map