import { type Letter } from './template.js';
export interface SenderSpec {
    /** What the sender line is called in Admin, e.g. "Emails to registrants". */
    title: string;
}
export interface PlaceholderSpec {
    key: string;
    /** The chip's label in the editor. */
    label: string;
    /** The value is HTML blocks (a list, a table) and replaces its whole paragraph. */
    block?: boolean;
}
export interface TextSpec {
    /** The wording used until an admin saves their own, and what "Reset to built-in" goes back to. */
    builtIn: Letter;
    placeholders: readonly PlaceholderSpec[];
    /** Placeholders a saved text must keep (a personal link). */
    required?: readonly string[];
    /** Placeholders whose paragraph is left out when the value is empty. */
    dropParagraph?: readonly string[];
    /** Values for Admin's preview. */
    sample?: Readonly<Record<string, string>>;
}
export interface KindSpec<S extends string = string> {
    sender: S;
    title: string;
    /** When it goes out, in a sentence, for Admin. */
    when: string;
    /**
     * False for a text that uses the letter editor but isn't an email (a form's information text):
     * it has no subject and never appears in the log.
     */
    email?: boolean;
    /**
     * How the log resends it. 'stored' sends the stored copy again. 'rebuild' is for emails whose
     * link can expire or whose status can change: the log links to the thing it belongs to, whose own
     * Resend builds it afresh. Default 'stored'.
     */
    resend?: 'rebuild' | 'stored';
    /** Present when an admin may change the wording. */
    text?: TextSpec;
}
/** Kinds the library sends itself. */
export declare const BUILT_IN_KINDS: readonly ["mail.test", "mail.digest"];
export type BuiltInKind = (typeof BUILT_IN_KINDS)[number];
export interface MailConfig<S extends string = string, K extends string = string> {
    senders: Readonly<Record<S, SenderSpec>>;
    kinds: Readonly<Record<K | BuiltInKind, KindSpec<S>>>;
    /** The sender the daily failure digest goes out from (if it's broken, any healthy one is used). */
    digestSender: S;
}
/** Checks the registry once, where it's defined, and adds the library's own kinds. */
export declare function defineMailConfig<S extends string, K extends string>(input: {
    senders: Record<S, SenderSpec>;
    kinds: Record<K, KindSpec<NoInfer<S>>>;
    digestSender?: NoInfer<S>;
}): MailConfig<S, K>;
export declare const isBuiltInKind: (kind: string) => kind is BuiltInKind;
/** Why this wording can't be saved for the kind, or null when it can. */
export declare function textProblem(kind: KindSpec, t: Letter): string | null;
//# sourceMappingURL=config.d.ts.map