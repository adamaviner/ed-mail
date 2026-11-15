// An admin's editor for one kind's wording: subject and body with placeholder chips, notes that
// stop a save (unknown or missing placeholders), Save / Undo changes / Reset to built-in / Compare
// with built-in / Send test to me, which sender it goes out from, and a preview beside it.
import { useMutation, useQuery } from 'convex/react'
import { GitCompare, RotateCcw, Save, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KindSpec, MailConfig } from '../../core/config.js'
import type { Letter } from '../../core/template.js'
import { RichEmailEditor } from '../editor/RichEmailEditor.js'
import type { UploadImage } from '../editor/RichTextEditor.js'
import type { KindKey, MailAdminBase, MailText, SenderLine } from '../types.js'
import { Button } from '../ui/button.js'
import { ConfirmButton } from '../ui/ConfirmButton.js'
import { Input } from '../ui/input.js'
import { ErrorNote, Note } from '../ui/notes.js'
import { useSaver } from '../useSaver.js'
import { CompareDialog } from './CompareDialog.js'
import { checkPlaceholders, sameLetter, saveBlocker, statusText } from './letterState.js'
import { LetterPreview } from './LetterPreview.js'
import { PlaceholderChips, PlaceholderNotes } from './parts.js'
import { defaultPreview, type PreviewRenderer } from './preview.js'
import { useLetterFields } from './useLetterFields.js'
import { useUnsavedWarning } from './useUnsavedWarning.js'

export interface LetterEditorProps<C extends MailConfig> extends MailAdminBase<C> {
  kind: KindKey<C>
  /** Puts an image somewhere public and returns its address. Without it the editor has no image button. */
  uploadImage?: UploadImage
  /** How the preview (and "Send test to me") renders this kind; default: its sample values filled in. */
  preview?: PreviewRenderer
  /** The "change" link beside the sender (e.g. to the Senders tab). Without it there's no link. */
  onChangeSender?: () => void
  /** Told when the letter gets or loses unsaved changes, so the app can stop its router leaving. */
  onDirtyChange?: (dirty: boolean) => void
}

export function LetterEditor<C extends MailConfig>(props: LetterEditorProps<C>) {
  const { api, auth, config, kind } = props
  const texts = useQuery(api.texts, { auth })
  const senders = useQuery(api.senders, { auth })
  const spec = (config.kinds as Record<string, KindSpec>)[kind]
  if (texts === undefined) return <p className="text-sm text-muted-foreground">Loading…</p>
  const row = texts.find((t) => t.kind === kind)
  if (!spec || !row) return <ErrorNote error={`${spec?.title ?? kind} has no wording to change.`} />
  const line = senders?.senders.find((s) => s.key === spec.sender)
  return <LetterForm {...props} spec={spec} row={row} line={line} googleReady={senders?.googleReady ?? true} />
}

function LetterForm<C extends MailConfig>({
  api,
  auth,
  kind,
  spec,
  row,
  line,
  googleReady,
  uploadImage,
  preview,
  onChangeSender,
  onDirtyChange,
}: LetterEditorProps<C> & { spec: KindSpec; row: MailText; line: SenderLine | undefined; googleReady: boolean }) {
  const isEmail = spec.email !== false
  const saved = useMemo<Letter>(() => ({ subject: row.subject, body: row.body }), [row.subject, row.body])
  const f = useLetterFields(saved, { hasSubject: isEmail })
  const save = useMutation(api.saveText)
  const reset = useMutation(api.resetText)
  const sendTest = useMutation(api.sendTest)
  const saver = useSaver('The wording wasn’t saved.')
  const tester = useSaver('The test wasn’t sent.')
  const [notice, setNotice] = useState<string | null>(null)
  const [tested, setTested] = useState(false)
  const [comparing, setComparing] = useState(false)
  const placeholders = spec.text?.placeholders ?? []

  const render = (l: Letter) => (preview ? preview(l) : defaultPreview(spec, l))
  const rendered = useMemo(() => (preview ? preview(f.letter) : defaultPreview(spec, f.letter)), [f.letter, preview, spec])
  const check = checkPlaceholders(spec, f.letter)
  const blocker = saveBlocker(spec, f.letter, f.dirty)
  const builtIn = row.builtIn
  const connected = googleReady && !!line?.sender

  useUnsavedWarning(f.dirty)
  // Through a ref, so an app passing a new function each render isn't told twice.
  const dirtyChanged = useRef(onDirtyChange)
  useEffect(() => {
    dirtyChanged.current = onDirtyChange
  })
  useEffect(() => dirtyChanged.current?.(f.dirty), [f.dirty])
  // Leaving the editor shouldn't leave the app thinking something is unsaved.
  useEffect(() => () => dirtyChanged.current?.(false), [])

  const onSave = () =>
    void saver.save(async () => {
      const stored = await save({ auth, kind, subject: f.subject, body: f.body })
      // What was stored is cleaned (safeHtml), so it may differ a little from what was typed.
      f.set(stored)
      setNotice('Saved. Emails from now on use this wording.')
    })

  const onReset = () =>
    saver.save(async () => {
      await reset({ auth, kind })
      f.set(builtIn)
      setNotice('Back to the built-in wording.')
    })

  const onTest = () =>
    void tester.save(async () => {
      setTested(false)
      await sendTest({ auth, senderKey: spec.sender, letter: { subject: rendered.subject, html: rendered.html } })
      setTested(true)
    })

  return (
    <div className="space-y-4 text-sm">
      {notice && !f.dirty && <Note>{notice}</Note>}
      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-3">
          {isEmail && <SentFrom line={line} googleReady={googleReady} onChange={onChangeSender} />}
          {isEmail && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Subject</span>
              <Input {...f.subjectProps} />
            </label>
          )}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{isEmail ? 'Body' : 'Text'}</span>
            <RichEmailEditor {...f.bodyProps} placeholders={placeholders} uploadImage={uploadImage} label={isEmail ? 'Body' : 'Text'} />
          </div>
          <PlaceholderChips onInsert={f.insert} placeholders={placeholders} samples={spec.text?.sample} />
          <PlaceholderNotes unknown={check.unknown} missing={check.missing} />
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={!!blocker || saver.busy} title={blocker ?? undefined} onClick={onSave}>
              <Save /> {saver.busy ? 'Saving…' : 'Save'}
            </Button>
            {f.dirty && (
              <Button variant="ghost" onClick={f.undo}>
                Undo changes
              </Button>
            )}
            {row.custom && (
              <ConfirmButton
                icon={<RotateCcw />}
                confirmLabel="Reset this wording"
                hint="Throws away the saved wording and goes back to the one built into the app."
                disabled={saver.busy}
                onConfirm={onReset}
              >
                Reset to built-in
              </ConfirmButton>
            )}
            {!sameLetter(f.letter, builtIn) && (
              <Button variant="outline" onClick={() => setComparing(true)}>
                <GitCompare /> Compare with built-in
              </Button>
            )}
            {isEmail && (
              <Button variant="outline" disabled={!connected || tester.busy} title={connected ? 'Sends the preview, as it is now, to your own address' : 'Connect a sender first'} onClick={onTest}>
                <Send /> {tester.busy ? 'Sending…' : 'Send test to me'}
              </Button>
            )}
          </div>
          <p className={f.dirty && blocker ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {statusText({ dirty: f.dirty, custom: row.custom, updatedBy: row.updatedBy, updatedAt: row.updatedAt })}
            {f.dirty && blocker && ` ${blocker}`}
          </p>
          {tested && <p className="text-xs text-primary">A test is on its way to your email address.</p>}
          <ErrorNote error={saver.error ?? tester.error} />
        </div>

        {/* Stays in view beside the form, so the preview is next to whatever is being typed. */}
        <div className="space-y-2 self-start xl:sticky xl:top-4">
          {rendered.caption && <p className="text-xs text-muted-foreground">{rendered.caption}</p>}
          <LetterPreview subject={isEmail ? rendered.subject : undefined} html={rendered.html} />
        </div>
      </div>
      {comparing && (
        <CompareDialog
          open
          onOpenChange={setComparing}
          current={rendered}
          builtIn={render(builtIn)}
          hasSubject={isEmail}
          onUseBuiltIn={() => {
            f.set(builtIn)
            setNotice(null)
          }}
        />
      )}
    </div>
  )
}

/** "Sent from <address> · change", or a warning that nothing goes out until a sender is connected. */
function SentFrom({ line, googleReady, onChange }: { line: SenderLine | undefined; googleReady: boolean; onChange?: () => void }) {
  const change = onChange && (
    <>
      {' · '}
      <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={onChange}>
        {line?.sender && googleReady ? 'change' : 'connect one'}
      </button>
    </>
  )
  const title = line?.title ?? 'this line'
  if (!googleReady || !line?.sender) {
    return (
      <Note tone="warn">
        Not sent yet: no Google account is connected for {title.toLowerCase()}.{change}
      </Note>
    )
  }
  const { fromEmail, fromName, account } = line.sender
  const address = fromEmail ?? account
  return (
    <p className="text-xs text-muted-foreground">
      Sent from <span className="font-medium text-foreground">{fromName ? `${fromName} <${address}>` : address}</span> ({title.toLowerCase()}){change}
    </p>
  )
}
