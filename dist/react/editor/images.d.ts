export declare const IMAGE_TYPES: readonly ["image/jpeg", "image/png", "image/gif", "image/webp"];
export declare const IMAGE_MAX_BYTES: number;
export declare const imagesIn: (files: FileList | null | undefined) => File[];
/**
 * Scales an image down to MAX_UPLOAD_WIDTH (GIFs as they are, to keep their animation) and returns
 * it with its width. A scaled image is a PNG or a JPEG, so its type may no longer match its name's
 * extension; the app's uploader goes by the type.
 */
export declare function prepareImage(file: File): Promise<{
    file: File;
    width: number;
}>;
//# sourceMappingURL=images.d.ts.map