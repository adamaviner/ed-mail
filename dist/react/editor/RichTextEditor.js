import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// A formatted-text editor (TipTap) for templates with {placeholders}: paragraphs, headings,
// bold/italic/underline, links, lists, quotes, rules and images, with placeholders shown as chips,
// plus an HTML view for hand-written markup. The value is HTML either way. Images go wherever the
// app's uploadImage puts them (ed-schedule: WordPress's media library); the editor only gets the
// address back. Without uploadImage there is no image button.
import { Extension } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AlignCenter, AlignLeft, Bold, Code, Heading2, Heading3, Heading4, ImageUp, Italic, Link as LinkIcon, List, ListOrdered, Minus, Quote, Redo, Underline, Undo } from 'lucide-react';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PLACEHOLDER } from '../../core/template.js';
import { cn } from '../cn.js';
import { Button } from '../ui/button.js';
import { Input, Textarea } from '../ui/input.js';
import { ErrorNote } from '../ui/notes.js';
import { useSaver } from '../useSaver.js';
import { IMAGE_TYPES, imagesIn, prepareImage } from './images.js';
/** An href that is one placeholder ({event_url}): filled in when the text is built. */
const PLACEHOLDER_HREF = /^\{[A-Za-z][A-Za-z0-9_]*\}$/;
/**
 * Markup the editor can't keep (tables, styles, spans, classes…). A value with any opens in the
 * HTML view, so switching to the editor (which would drop it) is the user's choice.
 */
const UNSUPPORTED = /<(table|style|font|span|div|center|pre|code|iframe|script|figure)\b|\sclass\s*=|\sstyle\s*=\s*"(?!\s*text-align:\s*\w+;?\s*")/i;
const needsHtmlView = (html) => UNSUPPORTED.test(html);
const CHIP = 'rounded bg-primary/10 px-0.5 font-mono text-[0.85em] text-primary';
const BLOCK_CHIP = 'rounded border border-dashed border-primary/60 bg-primary/5 px-1 font-mono text-[0.85em] text-primary';
const UNKNOWN_CHIP = 'rounded bg-destructive/15 px-0.5 font-mono text-[0.85em] text-destructive';
/** {placeholders} as chips: blocks dashed, ones the app doesn't know in red. */
const placeholderChips = (known, blocks) => Extension.create({
    name: 'placeholderChips',
    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    decorations(state) {
                        const decorations = [];
                        state.doc.descendants((node, pos) => {
                            if (!node.isText || !node.text)
                                return;
                            for (const m of node.text.matchAll(PLACEHOLDER)) {
                                const from = pos + m.index;
                                const cls = !known.has(m[1]) ? UNKNOWN_CHIP : blocks.has(m[1]) ? BLOCK_CHIP : CHIP;
                                decorations.push(Decoration.inline(from, from + m[0].length, { class: cls }));
                            }
                        });
                        return DecorationSet.create(state.doc, decorations);
                    },
                },
            }),
        ];
    },
});
const extensionsFor = (o) => [
    StarterKit.configure({
        heading: { levels: [...o.headings] },
        code: false,
        codeBlock: false,
        link: {
            openOnClick: false,
            autolink: true,
            defaultProtocol: 'https',
            isAllowedUri: (url, ctx) => PLACEHOLDER_HREF.test(url) || ctx.defaultValidate(url),
        },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center'] }),
    Image.configure({ resize: { enabled: true, directions: ['bottom-right', 'bottom-left'], minWidth: 40, alwaysPreserveAspectRatio: true } }),
    placeholderChips(o.placeholders, o.blockPlaceholders ?? new Set()),
];
export function RichTextEditor({ value, onChange, onFocus, ref, options, uploadImage, }) {
    const { toHtml, imageWidth, label } = options;
    const [view, setView] = useState(() => (needsHtmlView(value) ? 'html' : 'rich'));
    const textareaRef = useRef(null);
    /** The last value the editor reported, so a change from outside (Undo changes) can be told apart. */
    const emitted = useRef(value);
    const uploader = useSaver('The image didn’t upload.');
    const [uploading, setUploading] = useState(0);
    // The editor's paste and drop handlers are set once; they reach the current upload through this.
    const uploadRef = useRef(null);
    // The editor is made once, so its extensions are too.
    const [extensions] = useState(() => extensionsFor(options));
    const editor = useEditor({
        extensions,
        content: toHtml(value),
        editorProps: {
            attributes: {
                'aria-label': label,
                role: 'textbox',
                'aria-multiline': 'true',
                class: cn('min-h-64 px-3 py-2 text-sm outline-none', '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-xs [&_h4]:font-semibold [&_h4]:uppercase [&_p]:my-2', '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6', '[&_a]:text-primary [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground', '[&_.ProseMirror-selectednode]:ring-primary [&_.ProseMirror-selectednode_img]:ring-2 [&_hr]:my-4 [&_img]:my-2 [&_img]:max-w-full [&_img.ProseMirror-selectednode]:ring-2'),
            },
            handlePaste: (_view, event) => {
                const files = imagesIn(event.clipboardData?.files);
                if (!files.length || !uploadRef.current)
                    return false;
                files.forEach((f) => uploadRef.current?.(f));
                return true;
            },
            handleDrop: (_view, event) => {
                const files = imagesIn(event.dataTransfer?.files);
                if (!files.length || !uploadRef.current)
                    return false;
                event.preventDefault();
                files.forEach((f) => uploadRef.current?.(f));
                return true;
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.isEmpty ? '' : editor.getHTML();
            emitted.current = html;
            onChange(html);
        },
        onFocus: () => onFocus?.(),
    });
    const upload = uploadImage
        ? (picked) => void uploader.save(async () => {
            setUploading((n) => n + 1);
            try {
                const { file, width } = await prepareImage(picked);
                const src = await uploadImage(file);
                editor
                    ?.chain()
                    .focus()
                    .setImage({ src, alt: '', width: Math.min(width, imageWidth) })
                    .run();
            }
            finally {
                setUploading((n) => n - 1);
            }
        })
        : null;
    useEffect(() => {
        uploadRef.current = upload;
    });
    // A value set from outside (Undo changes, or typed in the HTML view) goes into the editor.
    useEffect(() => {
        if (!editor || value === emitted.current)
            return;
        emitted.current = value;
        editor.commands.setContent(toHtml(value), { emitUpdate: false });
    }, [editor, value, toHtml]);
    useImperativeHandle(ref, () => ({
        insert: (text) => {
            if (view === 'rich') {
                editor?.chain().focus().insertContent(text).run();
                return;
            }
            const el = textareaRef.current;
            const start = el?.selectionStart ?? value.length;
            const end = el?.selectionEnd ?? value.length;
            onChange(value.slice(0, start) + text + value.slice(end));
            requestAnimationFrame(() => {
                el?.focus();
                el?.setSelectionRange(start + text.length, start + text.length);
            });
        },
    }), [view, editor, value, onChange]);
    const warnings = view === 'html' && options.warnings ? options.warnings(value) : [];
    const lossy = view === 'html' && needsHtmlView(value);
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "overflow-hidden rounded-lg border bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1", children: [view === 'rich' && editor && _jsx(Toolbar, { editor: editor, headings: options.headings, onImage: upload, uploading: uploading > 0 }), _jsxs(Button, { variant: view === 'html' ? 'default' : 'ghost', className: "ml-auto", "aria-pressed": view === 'html', title: view === 'html' ? 'Back to the formatted editor' : 'Edit the HTML', onClick: () => setView(view === 'html' ? 'rich' : 'html'), children: [_jsx(Code, {}), " HTML"] })] }), view === 'rich' ? (_jsx(EditorContent, { editor: editor })) : (_jsx(Textarea, { ref: textareaRef, "aria-label": `${label} HTML`, rows: 14, className: "min-h-64 rounded-none border-0 font-mono text-xs focus-visible:ring-0", value: value, onChange: (e) => onChange(e.target.value), onFocus: () => onFocus?.() }))] }), lossy && (_jsx("p", { className: "text-xs text-muted-foreground", children: "This HTML has markup the formatted editor can\u2019t keep (tables, styles, spans\u2026), so it opens as HTML. Switching to the editor would drop it." })), warnings.length > 0 && (_jsx("ul", { role: "alert", className: "list-disc space-y-0.5 rounded-lg border border-amber-500/50 bg-amber-500/10 py-2 pr-3 pl-7 text-xs", children: warnings.map((w) => (_jsx("li", { children: w }, w))) })), _jsx(ErrorNote, { error: uploader.error })] }));
}
const HEADING_ICONS = { 2: _jsx(Heading2, {}), 3: _jsx(Heading3, {}), 4: _jsx(Heading4, {}) };
function Toolbar({ editor, headings: [h, sub], onImage, uploading }) {
    const s = useEditorState({
        editor,
        selector: ({ editor: e }) => ({
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            heading: e.isActive('heading', { level: h }),
            subheading: e.isActive('heading', { level: sub }),
            bullets: e.isActive('bulletList'),
            numbers: e.isActive('orderedList'),
            quote: e.isActive('blockquote'),
            link: e.isActive('link'),
            center: e.isActive({ textAlign: 'center' }),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
        }),
    });
    const [linkOpen, setLinkOpen] = useState(false);
    const [href, setHref] = useState('');
    const chain = () => editor.chain().focus();
    const applyLink = () => {
        const url = href.trim();
        if (!url)
            chain().extendMarkRange('link').unsetLink().run();
        else if (editor.state.selection.empty && !editor.isActive('link'))
            chain()
                .insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] })
                .run();
        else
            chain().extendMarkRange('link').setLink({ href: url }).run();
        setLinkOpen(false);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Tool, { label: "Bold", active: s.bold, onClick: () => chain().toggleBold().run(), icon: _jsx(Bold, {}) }), _jsx(Tool, { label: "Italic", active: s.italic, onClick: () => chain().toggleItalic().run(), icon: _jsx(Italic, {}) }), _jsx(Tool, { label: "Underline", active: s.underline, onClick: () => chain().toggleUnderline().run(), icon: _jsx(Underline, {}) }), _jsx(Sep, {}), _jsx(Tool, { label: "Heading", active: s.heading, onClick: () => chain().toggleHeading({ level: h }).run(), icon: HEADING_ICONS[h] }), _jsx(Tool, { label: "Subheading", active: s.subheading, onClick: () => chain().toggleHeading({ level: sub }).run(), icon: HEADING_ICONS[sub] }), _jsx(Tool, { label: "Bulleted list", active: s.bullets, onClick: () => chain().toggleBulletList().run(), icon: _jsx(List, {}) }), _jsx(Tool, { label: "Numbered list", active: s.numbers, onClick: () => chain().toggleOrderedList().run(), icon: _jsx(ListOrdered, {}) }), _jsx(Tool, { label: "Quote", active: s.quote, onClick: () => chain().toggleBlockquote().run(), icon: _jsx(Quote, {}) }), _jsx(Tool, { label: "Align left", active: !s.center, onClick: () => chain().setTextAlign('left').run(), icon: _jsx(AlignLeft, {}) }), _jsx(Tool, { label: "Center", active: s.center, onClick: () => chain().setTextAlign('center').run(), icon: _jsx(AlignCenter, {}) }), _jsx(Sep, {}), _jsx(Tool, { label: "Link", active: s.link || linkOpen, onClick: () => {
                    setHref(editor.getAttributes('link').href ?? '');
                    setLinkOpen(!linkOpen);
                }, icon: _jsx(LinkIcon, {}) }), onImage && (_jsxs("label", { title: "Insert an image", className: cn('inline-flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted [&_svg]:size-3.5', uploading && 'pointer-events-none opacity-50'), children: [_jsx(ImageUp, { "aria-hidden": true }), _jsx("span", { className: "sr-only", children: uploading ? 'Uploading image…' : 'Insert an image' }), _jsx("input", { type: "file", accept: IMAGE_TYPES.join(','), className: "sr-only", disabled: uploading, onChange: (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file)
                                onImage(file);
                        } })] })), _jsx(Tool, { label: "Divider", onClick: () => chain().setHorizontalRule().run(), icon: _jsx(Minus, {}) }), _jsx(Sep, {}), _jsx(Tool, { label: "Undo", disabled: !s.canUndo, onClick: () => chain().undo().run(), icon: _jsx(Undo, {}) }), _jsx(Tool, { label: "Redo", disabled: !s.canRedo, onClick: () => chain().redo().run(), icon: _jsx(Redo, {}) }), uploading && _jsx("span", { className: "px-1 text-xs text-muted-foreground", children: "Uploading\u2026" }), linkOpen && (_jsxs("form", { className: "flex w-full items-center gap-1 pt-1", onSubmit: (e) => {
                    e.preventDefault();
                    applyLink();
                }, children: [_jsx(Input, { autoFocus: true, "aria-label": "Link address", placeholder: "https://\u2026 or {event_url}", className: "h-7 flex-1 text-xs", value: href, onChange: (e) => setHref(e.target.value), onKeyDown: (e) => e.key === 'Escape' && setLinkOpen(false) }), _jsx(Button, { type: "submit", children: href.trim() ? 'Apply' : 'Remove link' }), _jsx(Button, { variant: "ghost", onClick: () => setLinkOpen(false), children: "Cancel" })] }))] }));
}
function Tool({ label, icon, onClick, active = false, disabled = false }) {
    return (_jsx(Button, { size: "icon", variant: "ghost", className: active ? 'bg-muted text-foreground' : undefined, title: label, "aria-label": label, "aria-pressed": active, disabled: disabled, onMouseDown: (e) => e.preventDefault(), onClick: onClick, children: icon }));
}
const Sep = () => _jsx("span", { "aria-hidden": true, className: "mx-0.5 h-5 w-px bg-border" });
//# sourceMappingURL=RichTextEditor.js.map