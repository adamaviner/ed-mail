import type { KindSpec, MailConfig } from '../../core/config.js';
export declare const kindsOf: (config: MailConfig) => Readonly<Record<string, KindSpec>>;
export declare const sendersOf: (config: MailConfig) => Readonly<Record<string, {
    title: string;
}>>;
/** The kinds a sender line sends, in the config's order. The test email is left out: it's only ever an admin's own. */
export declare const kindsFrom: (config: MailConfig, senderKey: string) => [string, KindSpec<string>][];
export declare const kindTitle: (config: MailConfig, kind: string) => string;
export declare const senderTitle: (config: MailConfig, key: string) => string;
export declare const dateTime: (ms: number) => string;
/** `value` once it has stopped changing for `ms`, so a search box doesn't start a query per keystroke. */
export declare function useDebounced<T>(value: T, ms: number): T;
//# sourceMappingURL=format.d.ts.map