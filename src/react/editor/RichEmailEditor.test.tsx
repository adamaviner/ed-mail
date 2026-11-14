// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RichEmailEditor } from './RichEmailEditor.js'

const placeholders = [
  { key: 'name', label: 'Name' },
  { key: 'list', label: 'List', block: true },
]

afterEach(cleanup)

test('shows the letter with its placeholders as chips; unknown ones in red', async () => {
  const { container } = render(<RichEmailEditor value="<p>Hi {name}, {nope}</p>" onChange={() => {}} placeholders={placeholders} />)
  await waitFor(() => expect(container.querySelector('.ProseMirror')?.textContent).toBe('Hi {name}, {nope}'))
  const chips = [...container.querySelectorAll('.ProseMirror span')].map((s) => [s.textContent, s.className.includes('destructive')])
  expect(chips).toEqual([
    ['{name}', false],
    ['{nope}', true],
  ])
})

test('the image button is there only when the app can upload', () => {
  render(<RichEmailEditor value="" onChange={() => {}} placeholders={placeholders} />)
  expect(screen.queryByTitle('Insert an image')).toBeNull()
  cleanup()
  render(<RichEmailEditor value="" onChange={() => {}} placeholders={placeholders} uploadImage={vi.fn()} />)
  expect(screen.getByTitle('Insert an image')).toBeTruthy()
})

test('the HTML view edits the value as text', () => {
  const onChange = vi.fn()
  render(<RichEmailEditor value="<p>Hi</p>" onChange={onChange} placeholders={placeholders} />)
  fireEvent.click(screen.getByRole('button', { name: /HTML/ }))
  fireEvent.change(screen.getByLabelText('Body HTML'), { target: { value: '<p>Hello</p>' } })
  expect(onChange).toHaveBeenCalledWith('<p>Hello</p>')
})
