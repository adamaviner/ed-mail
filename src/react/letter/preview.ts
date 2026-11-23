// What the letter editor's preview shows: by default the kind's built-in sample values filled into
// the template the same way the server fills real ones (fillTemplate), in the email's frame. An app
// passes its own renderer for a kind whose preview needs more (ed-schedule's welcome letter builds
// a whole made-up event).
import { useSyncExternalStore } from 'react'
import type { KindSpec } from '../../core/config.js'
import { emailShell } from '../../core/emailHtml.js'
import { specKeys } from '../../core/render.js'
import { type Letter, fillTemplate } from '../../core/template.js'

export interface RenderedPreview {
  /** The subject as it would arrive (empty for a text that isn't an email). */
  subject: string
  /** The whole email's HTML, frame included. */
  html: string
  /** Said above the preview, e.g. "Preview for a made-up event and registrant (Sam Lee)". */
  caption?: string
}

/** Renders a kind's letter as it would arrive, for the editor's preview and "Send test to me". */
export type PreviewRenderer = (letter: Letter) => RenderedPreview

/** The default preview: the kind's sample values filled in, empty fill-ins shown as their {placeholder} on yellow. */
export function defaultPreview(spec: KindSpec, letter: Letter): RenderedPreview {
  const text = spec.text
  const filled = fillTemplate({
    subject: letter.subject,
    body: letter.body,
    values: { ...text?.sample },
    ...(text ? specKeys(text) : { known: new Set<string>() }),
    marked: () => true,
    dropParagraph: text?.dropParagraph,
  })
  return {
    subject: spec.email === false ? '' : filled.subject,
    html: spec.email === false ? filled.body : emailShell(filled.body),
    caption: text?.sample && Object.keys(text.sample).length ? 'Preview with sample values' : 'Preview: fill-ins show as their {placeholder}',
  }
}

export type PreviewTheme = 'light' | 'dark'

// The app's own theme, from the `dark` class shadcn apps put on <html>, watched so the preview follows a switch.
const appTheme = (): PreviewTheme => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
function subscribe(cb: () => void) {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {}
  const observer = new MutationObserver(cb)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/** The app's theme (light unless <html> has the `dark` class), watched for changes. */
export const useAppTheme = (): PreviewTheme => useSyncExternalStore(subscribe, appTheme, () => 'light')

const PREVIEW_CSS = 'body{font:14px/1.5 system-ui,sans-serif;color:#222;margin:12px}a{color:#1a5fb4}'

/**
 * The letter in dark colors, as a mail app in dark mode shows it. The mail sets no colors of its own
 * (emailHtml.ts), so this only softens the borders; colors an admin set themselves stay.
 */
const DARK_CSS =
  ':root{color-scheme:dark}body{background:oklch(0.205 0 0);color:oklch(0.985 0 0)}a{color:#8ab4f8}' +
  '[style*="border-left:3px solid #cccccc"]{border-left-color:#555!important}hr[style*="#dddddd"]{border-top-color:#444!important}'

/** The page an email's HTML is shown in, light or dark. */
export const previewDocument = (html: string, theme: PreviewTheme) => `<!doctype html><meta charset="utf-8"><style>${PREVIEW_CSS}${theme === 'dark' ? DARK_CSS : ''}</style>${html}`
