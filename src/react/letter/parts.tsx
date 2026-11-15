// Pieces of the letter editor an app can use on its own (ed-schedule's per-event welcome editor).
import { Note } from '../ui/notes.js'

const braces = (keys: string[]) => keys.map((k) => `{${k}}`)

/** Every placeholder as a chip; clicking one puts it where the cursor was. */
export function PlaceholderChips({
  onInsert,
  placeholders,
  samples,
}: {
  onInsert: (key: string) => void
  placeholders: readonly { key: string; label: string }[]
  samples?: Readonly<Record<string, string>>
}) {
  if (!placeholders.length) return null
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">Placeholders (click to insert):</p>
      <div className="flex flex-wrap gap-1">
        {placeholders.map((p) => {
          const sample = samples?.[p.key]
          return (
            <button
              key={p.key}
              type="button"
              // A sample that's HTML (a list) would read badly in a tooltip.
              title={sample && !sample.includes('<') ? `${p.label}, e.g. ${sample}` : p.label}
              // Focus stays in the subject or body, so typing carries on after the placeholder.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onInsert(p.key)}
              className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs hover:border-primary"
            >
              {`{${p.key}}`}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Placeholders the app doesn't know (they'd go out as typed), and required ones left out. Both stop a save. */
export function PlaceholderNotes({ unknown, missing }: { unknown: string[]; missing: string[] }) {
  return (
    <>
      {unknown.length > 0 && (
        <Note tone="error">
          The app doesn’t know {braces(unknown).join(', ')}. {unknown.length === 1 ? 'It would go out' : 'They would go out'} as typed; fix or remove {unknown.length === 1 ? 'it' : 'them'} before
          saving.
        </Note>
      )}
      {missing.length > 0 && (
        <Note tone="error">
          This letter must include {braces(missing).join(' and ')}: each person’s own {missing.length === 1 ? 'value goes' : 'values go'} there. Put {missing.length === 1 ? 'it' : 'them'} back before
          saving.
        </Note>
      )}
    </>
  )
}
