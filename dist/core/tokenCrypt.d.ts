/** "iv.ciphertext", both base64. */
export declare function encryptToken(secret: string, token: string): Promise<string>;
export declare function decryptToken(secret: string, stored: string): Promise<string>;
//# sourceMappingURL=tokenCrypt.d.ts.map