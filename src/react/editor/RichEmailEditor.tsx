// A letter's body editor: the formatted-text editor, limited to what email clients show well, with
// the letter's placeholders. The value is HTML; emailShell styles it inline when the email is built.
import { type Ref, useMemo } from 'react'
import type { PlaceholderSpec } from '../../core/config.js'
import { EMAIL_WIDTH, emailHtmlWarnings } from '../../core/emailHtml.js'
import { bodyHtml } from '../../core/template.js'
import { RichTextEditor, type RichTextEditorHandle, type RichTextOptions, type UploadImage } from './RichTextEditor.js'

export type RichEmailEditorHandle = RichTextEditorHandle

/** `placeholders` usually come from the kind's text spec in the mail config (keep them stable between renders: the editor reads them once). */
export function RichEmailEditor({
  placeholders,
  label = 'Body',
  ...props
}: {
  value: string
  onChange: (html: string) => void
  onFocus?: () => void
  ref?: Ref<RichEmailEditorHandle>
  placeholders: readonly PlaceholderSpec[]
  uploadImage?: UploadImage
  label?: string
}) {
  const options = useMemo<RichTextOptions>(
    () => ({
      placeholders: new Set(placeholders.map((p) => p.key)),
      blockPlaceholders: new Set(placeholders.filter((p) => p.block).map((p) => p.key)),
      headings: [2, 3],
      toHtml: bodyHtml,
      warnings: emailHtmlWarnings,
      imageWidth: EMAIL_WIDTH,
      label,
    }),
    [placeholders, label],
  )
  return <RichTextEditor {...props} options={options} />
}
