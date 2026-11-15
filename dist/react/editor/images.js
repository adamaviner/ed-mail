// Getting a picked, pasted or dropped image ready for the app's uploadImage: checked, and scaled
// down so a phone photo doesn't go out at full size in every email.
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** Uploads are scaled down to this width; they show at most the editor's `imageWidth` wide. */
const MAX_UPLOAD_WIDTH = 1200;
export const imagesIn = (files) => [...(files ?? [])].filter((f) => f.type.startsWith('image/'));
/**
 * Scales an image down to MAX_UPLOAD_WIDTH (GIFs as they are, to keep their animation) and returns
 * it with its width. A scaled image is a PNG or a JPEG, so its type may no longer match its name's
 * extension; the app's uploader goes by the type.
 */
export async function prepareImage(file) {
    if (!IMAGE_TYPES.includes(file.type))
        throw new Error('Pick a JPEG, PNG, GIF or WebP image.');
    const bitmap = await createImageBitmap(file).catch(() => {
        throw new Error('That image couldn’t be read. Try another, or save it again as a JPEG or PNG.');
    });
    const { width, height } = bitmap;
    if (file.type === 'image/gif' || width <= MAX_UPLOAD_WIDTH) {
        bitmap.close();
        return { file: checkSize(file), width };
    }
    const canvas = document.createElement('canvas');
    canvas.width = MAX_UPLOAD_WIDTH;
    canvas.height = Math.round((height * MAX_UPLOAD_WIDTH) / width);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
    if (!blob)
        throw new Error('That image couldn’t be read. Try another.');
    return { file: checkSize(new File([blob], file.name, { type })), width: MAX_UPLOAD_WIDTH };
}
function checkSize(file) {
    if (file.size > IMAGE_MAX_BYTES)
        throw new Error('That image is over 10 MB.');
    return file;
}
//# sourceMappingURL=images.js.map