// The registry of every email an app sends: which sender line it goes out on, what it's called in
// Admin, when it is sent, and, for letters whose wording an admin may change, the built-in wording
// and its placeholders. The app writes one with defineMailConfig in a pure module that both its
// Convex functions and its browser code import, so the Admin page, the log's labels and the
// server's checks all read the same list.
import { missingPlaceholders, unknownPlaceholders } from './template.js';
/** Kinds the library sends itself. */
export const BUILT_IN_KINDS = ['mail.test', 'mail.digest'];
/** Checks the registry once, where it's defined, and adds the library's own kinds. */
export function defineMailConfig(input) {
    const senderKeys = Object.keys(input.senders);
    if (!senderKeys.length)
        throw new Error('The mail config needs at least one sender.');
    const digestSender = input.digestSender ?? senderKeys[0];
    for (const [key, kind] of Object.entries(input.kinds)) {
        if (BUILT_IN_KINDS.includes(key))
            throw new Error(`The mail kind ${key} is the library's own.`);
        if (!(kind.sender in input.senders))
            throw new Error(`The mail kind ${key} names an unknown sender, ${kind.sender}.`);
        const text = kind.text;
        if (text) {
            const known = new Set(text.placeholders.map((p) => p.key));
            const unknown = [...(text.required ?? []), ...(text.dropParagraph ?? [])].filter((k) => !known.has(k));
            if (unknown.length)
                throw new Error(`The mail kind ${key} lists ${unknown.join(', ')}, which aren't among its placeholders.`);
            const problem = textProblem(kind, text.builtIn);
            if (problem)
                throw new Error(`The built-in text of ${key}: ${problem}`);
        }
    }
    const builtIn = {
        'mail.test': { sender: digestSender, title: 'Test email', when: 'When an admin sends a test.' },
        'mail.digest': { sender: digestSender, title: 'Failed email report', when: 'Each morning, when an email failed since the last report.' },
    };
    return { senders: input.senders, kinds: { ...input.kinds, ...builtIn }, digestSender };
}
export const isBuiltInKind = (kind) => BUILT_IN_KINDS.includes(kind);
/** Why this wording can't be saved for the kind, or null when it can. */
export function textProblem(kind, t) {
    const spec = kind.text;
    if (!spec)
        return `${kind.title} has no wording to change.`;
    if (kind.email !== false && !t.subject.trim())
        return 'The email needs a subject.';
    if (!t.body.trim())
        return 'The text is empty.';
    const unknown = unknownPlaceholders(t, new Set(spec.placeholders.map((p) => p.key)));
    if (unknown.length)
        return `It uses ${unknown.map((k) => `{${k}}`).join(', ')}, which the app doesn’t know. Fix or remove ${unknown.length === 1 ? 'it' : 'them'} first.`;
    const missing = missingPlaceholders(t, spec.required ?? []);
    if (missing.length)
        return `It must include ${missing.map((k) => `{${k}}`).join(' and ')}.`;
    return null;
}
//# sourceMappingURL=config.js.map