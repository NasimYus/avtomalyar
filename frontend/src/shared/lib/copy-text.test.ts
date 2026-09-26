import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './copy-text'

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses the Clipboard API on a secure page', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(copyText('dealer.login')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('dealer.login')
  })

  it('falls back to select-and-copy on a plain-HTTP page instead of throwing', async () => {
    vi.stubGlobal('isSecureContext', false)
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })

    await expect(copyText('s3cret')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    // The helper field is cleaned up.
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('reports failure when the fallback is refused too', async () => {
    vi.stubGlobal('isSecureContext', false)
    Object.defineProperty(document, 'execCommand', {
      value: () => {
        throw new Error('not allowed')
      },
      configurable: true,
    })
    await expect(copyText('x')).resolves.toBe(false)
  })
})
