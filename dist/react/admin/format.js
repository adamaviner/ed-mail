import { useEffect, useState } from 'react';
export const kindsOf = (config) => config.kinds;
export const sendersOf = (config) => config.senders;
/** The kinds a sender line sends, in the config's order. The test email is left out: it's only ever an admin's own. */
export const kindsFrom = (config, senderKey) => Object.entries(kindsOf(config)).filter(([kind, k]) => k.sender === senderKey && kind !== 'mail.test');
export const kindTitle = (config, kind) => kindsOf(config)[kind]?.title ?? kind;
export const senderTitle = (config, key) => sendersOf(config)[key]?.title ?? key;
export const dateTime = (ms) => new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
/** `value` once it has stopped changing for `ms`, so a search box doesn't start a query per keystroke. */
export function useDebounced(value, ms) {
    const [settled, setSettled] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setSettled(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return settled;
}
//# sourceMappingURL=format.js.map