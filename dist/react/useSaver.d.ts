/**
 * Runs saves, keeping the last error for display and whether one is still running. `save`
 * resolves to whether it succeeded. `fallback` is the message for errors that carry none.
 */
export declare function useSaver(fallback?: string): {
    error: string | null;
    save: (fn: () => Promise<unknown>) => Promise<boolean>;
    clear: () => void;
    busy: boolean;
};
//# sourceMappingURL=useSaver.d.ts.map