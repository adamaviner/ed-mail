export type MailStatusValue = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
/** A small badge for an email's state, shown next to the thing the email belongs to. */
export declare function MailStatus({ status, title }: {
    status: MailStatusValue;
    title?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=MailStatus.d.ts.map