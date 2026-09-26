/**
 * Copies text to the clipboard. Resolves to whether it worked.
 *
 * The Clipboard API exists only on secure pages (HTTPS or localhost); a
 * test stand opened over plain HTTP has no navigator.clipboard at all. So
 * it falls back to the old select-and-copy trick, which every browser
 * still supports, instead of throwing.
 */
export async function copyText(text: string): Promise<boolean> {
  // Typed as always there, but absent on plain-HTTP pages.
  if (typeof window !== 'undefined' && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Denied permission — try the fallback below.
    }
  }
  return legacyCopy(text)
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  // Off screen, and not zoomed into on iOS (font-size ≥ 16px).
  field.style.position = 'fixed'
  field.style.top = '-1000px'
  field.style.fontSize = '16px'
  // Inside an open <dialog> only the dialog is focusable, so the helper
  // field goes there rather than to <body>.
  const host = document.querySelector('dialog[open]') ?? document.body
  host.appendChild(field)
  field.select()
  field.setSelectionRange(0, text.length)
  try {
    // Deprecated, yet the only way without the Clipboard API.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
  }
}
