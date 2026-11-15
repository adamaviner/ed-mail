export interface MimeAttachment {
    filename: string;
    contentType: string;
    data: Uint8Array;
}
export interface MimeMail {
    from: {
        email: string;
        name?: string;
    };
    to: string[];
    cc?: string[];
    replyTo?: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: MimeAttachment[];
}
export declare function bytesToBase64(bytes: Uint8Array): string;
/** A header value: as is when plain ASCII, else an RFC 2047 encoded word. */
export declare function headerText(value: string): string;
/** "Name" <email>, or just the email. */
export declare function formatAddress(email: string, name?: string): string;
/** The whole message, with CRLF line ends. `boundary` is fixed only by tests. */
export declare function buildMime(mail: MimeMail, boundary?: string): string;
//# sourceMappingURL=mime.d.ts.map