// @earthdance/mail/react: the letter editor, the Admin → Email page and the status badge.
//
// Styled with Tailwind classes on the shadcn theme tokens the apps already define (bg-muted,
// text-destructive, ...). Apps add `@source "../node_modules/@earthdance/mail/dist";` to their CSS
// so Tailwind generates them; it skips node_modules otherwise. Nothing here knows the app's login
// (`auth` is passed through to its checks), router, bundler or where images are kept.
export { MailAdminPage } from './admin/MailAdminPage.js';
export { MailLog } from './admin/MailLog.js';
export { RichEmailEditor } from './editor/RichEmailEditor.js';
export { RichTextEditor } from './editor/RichTextEditor.js';
export { IMAGE_MAX_BYTES, IMAGE_TYPES } from './editor/images.js';
export { LetterEditor } from './letter/LetterEditor.js';
export { LetterPreview, PreviewThemeSwitch } from './letter/LetterPreview.js';
export { checkPlaceholders, followSaved, saveBlocker, sameLetter, statusText } from './letter/letterState.js';
export { PlaceholderChips, PlaceholderNotes } from './letter/parts.js';
export { defaultPreview, previewDocument, useAppTheme } from './letter/preview.js';
export { useLetterFields } from './letter/useLetterFields.js';
export { useUnsavedWarning } from './letter/useUnsavedWarning.js';
export { MailStatus } from './MailStatus.js';
export { errorMessage } from './errors.js';
export { useSaver } from './useSaver.js';
//# sourceMappingURL=index.js.map