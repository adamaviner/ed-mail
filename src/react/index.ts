// @earthdance/mail/react: the letter editor, the Admin → Email page and the status badge.
//
// Styled with Tailwind classes on the shadcn theme tokens the apps already define (bg-muted,
// text-destructive, ...). Apps add `@source "../node_modules/@earthdance/mail/dist";` to their CSS
// so Tailwind generates them; it skips node_modules otherwise. Nothing here knows the app's login
// (`auth` is passed through to its checks), router, bundler or where images are kept.
export { MailAdminPage, type MailAdminPageProps, type MailAdminTab } from './admin/MailAdminPage.js'
export { MailLog, type MailLogProps } from './admin/MailLog.js'
export type { RefLink } from './admin/MessageDialog.js'
export { RichEmailEditor, type RichEmailEditorHandle } from './editor/RichEmailEditor.js'
export { RichTextEditor, type HeadingLevel, type RichTextEditorHandle, type RichTextOptions, type UploadImage } from './editor/RichTextEditor.js'
export { IMAGE_MAX_BYTES, IMAGE_TYPES } from './editor/images.js'
export { LetterEditor, type LetterEditorProps } from './letter/LetterEditor.js'
export { LetterPreview, PreviewThemeSwitch } from './letter/LetterPreview.js'
export { checkPlaceholders, followSaved, saveBlocker, sameLetter, statusText, type PlaceholderCheck } from './letter/letterState.js'
export { PlaceholderChips, PlaceholderNotes } from './letter/parts.js'
export { defaultPreview, previewDocument, useAppTheme, type PreviewRenderer, type PreviewTheme, type RenderedPreview } from './letter/preview.js'
export { useLetterFields, type LetterField } from './letter/useLetterFields.js'
export { useUnsavedWarning } from './letter/useUnsavedWarning.js'
export { MailStatus, type MailStatusValue } from './MailStatus.js'
export type { ConnectedSender, ExtraEmailRow, KindKey, MailAdminApi, MailAuth, MailMessage, MailRef, MailSenders, MailText, PreviewRenderers, SenderKey, SenderLine } from './types.js'
export { errorMessage } from './errors.js'
export { useSaver } from './useSaver.js'
