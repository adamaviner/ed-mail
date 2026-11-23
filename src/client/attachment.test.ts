import { afterEach, expect, test, vi } from 'vitest'
import { AttachmentSkipped, attachmentProblem, directDownloadUrl, fetchAttachment } from './index.js'

afterEach(() => vi.unstubAllGlobals())

const PDF = new TextEncoder().encode('%PDF-1.7 …')
const PAGE = new TextEncoder().encode('<!doctype html><title>Google Drive</title>')

/** Answers every fetch with this body and these headers, and records the URLs asked for. */
function serve(body: Uint8Array, headers: Record<string, string>, status = 200) {
  const asked: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    asked.push(url)
    return new Response(new Blob([body.slice()]), { status, headers })
  })
  return asked
}

test('directDownloadUrl turns Drive share links into downloads and leaves others alone', () => {
  const download = 'https://drive.google.com/uc?export=download&id=12X19TXw_T-a'
  expect(directDownloadUrl('https://drive.google.com/file/d/12X19TXw_T-a/view?usp=sharing')).toBe(download)
  expect(directDownloadUrl('https://drive.google.com/open?id=12X19TXw_T-a')).toBe(download)
  expect(directDownloadUrl('https://drive.google.com/uc?export=download&id=12X19TXw_T-a')).toBe(download)
  expect(directDownloadUrl('https://drive.google.com/file/d/12X19TXw_T-a/view?usp=sharing&resourcekey=0-AbC_d')).toBe(`${download}&resourcekey=0-AbC_d`)
  expect(directDownloadUrl(' https://earthdance.net/files/Orientation.pdf ')).toBe('https://earthdance.net/files/Orientation.pdf')
})

test('a Drive link is fetched as a download and named from its header', async () => {
  const asked = serve(PDF, { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="x.pdf"; filename*=UTF-8''Orientation%20Guide.pdf` })
  const file = await fetchAttachment('https://drive.google.com/file/d/abc/view?usp=sharing', 'Orientation.pdf', { pdf: true })
  expect(asked).toEqual(['https://drive.google.com/uc?export=download&id=abc'])
  expect(file).toMatchObject({ filename: 'Orientation Guide.pdf', contentType: 'application/pdf' })
})

test('a Drive download with no name header takes the fallback, not "uc"', async () => {
  serve(PDF, { 'content-type': 'application/octet-stream' })
  expect(await fetchAttachment('https://drive.google.com/file/d/abc/view', 'Orientation.pdf', { pdf: true })).toMatchObject({ filename: 'Orientation.pdf', contentType: 'application/pdf' })
})

test('a web page is never attached; a link that should be a PDF must be one', async () => {
  serve(PAGE, { 'content-type': 'text/html; charset=utf-8' })
  await expect(fetchAttachment('https://drive.google.com/file/d/abc/view', 'Orientation.pdf')).rejects.toThrow(AttachmentSkipped)
  expect(await attachmentProblem('https://drive.google.com/file/d/abc/view', { pdf: true })).toMatch(/web page, not a file \(is the Drive file shared/)
  serve(new TextEncoder().encode('PK…'), { 'content-type': 'application/zip' })
  expect(await attachmentProblem('https://example.org/guide.zip', { pdf: true })).toBe('The link https://example.org/guide.zip doesn’t lead to a PDF.')
})

test('a site that is down is an ordinary error, retried, not a skip', async () => {
  serve(PAGE, { 'content-type': 'text/html' }, 503)
  const err = await fetchAttachment('https://example.org/Orientation.pdf', 'Orientation.pdf').catch((e: unknown) => e)
  expect(err).toBeInstanceOf(Error)
  expect(err).not.toBeInstanceOf(AttachmentSkipped)
  expect(await attachmentProblem('https://example.org/Orientation.pdf', { pdf: true })).toMatch(
    /^The link https:\/\/example.org\/Orientation.pdf couldn’t be opened \(.*503.*\)\. Check it and try again\.$/,
  )
  serve(PDF, { 'content-type': 'application/pdf' })
  expect(await attachmentProblem('https://example.org/files/Orientation.pdf', { pdf: true })).toBeNull()
  // A badly encoded name doesn't throw; the file is named as the link spells it.
  expect((await fetchAttachment('https://example.org/files/Bad%E0name.pdf', 'Orientation.pdf', { pdf: true })).filename).toBe('Bad%E0name.pdf')
})
