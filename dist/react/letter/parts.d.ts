/** Every placeholder as a chip; clicking one puts it where the cursor was. */
export declare function PlaceholderChips({ onInsert, placeholders, samples, }: {
    onInsert: (key: string) => void;
    placeholders: readonly {
        key: string;
        label: string;
    }[];
    samples?: Readonly<Record<string, string>>;
}): import("react").JSX.Element | null;
/** Placeholders the app doesn't know (they'd go out as typed), and required ones left out. Both stop a save. */
export declare function PlaceholderNotes({ unknown, missing }: {
    unknown: string[];
    missing: string[];
}): import("react").JSX.Element;
//# sourceMappingURL=parts.d.ts.map