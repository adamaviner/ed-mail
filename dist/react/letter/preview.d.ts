import type { KindSpec } from '../../core/config.js';
import { type Letter } from '../../core/template.js';
export interface RenderedPreview {
    /** The subject as it would arrive (empty for a text that isn't an email). */
    subject: string;
    /** The whole email's HTML, frame included. */
    html: string;
    /** Said above the preview, e.g. "Preview for a made-up event and registrant (Sam Lee)". */
    caption?: string;
}
/** Renders a kind's letter as it would arrive, for the editor's preview and "Send test to me". */
export type PreviewRenderer = (letter: Letter) => RenderedPreview;
/** The default preview: the kind's sample values filled in, empty fill-ins shown as their {placeholder} on yellow. */
export declare function defaultPreview(spec: KindSpec, letter: Letter): RenderedPreview;
export type PreviewTheme = 'light' | 'dark';
/** The app's theme (light unless <html> has the `dark` class), watched for changes. */
export declare const useAppTheme: () => PreviewTheme;
/** The page an email's HTML is shown in, light or dark. */
export declare const previewDocument: (html: string, theme: PreviewTheme) => string;
//# sourceMappingURL=preview.d.ts.map