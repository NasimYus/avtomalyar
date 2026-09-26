/**
 * Tajik numbers are +992 followed by nine national digits, displayed as
 * "+992 92 555 01 10" — the format the design and the demo data use.
 */
const COUNTRY_CODE = '992'
const NATIONAL_LENGTH = 9
const GROUPS = [2, 3, 2, 2]

/** Digits a user actually typed, without the country code. */
function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith(COUNTRY_CODE)) digits = digits.slice(COUNTRY_CODE.length)
  return digits.slice(0, NATIONAL_LENGTH)
}

/**
 * Formats anything the user types (or a stored value) as the display
 * format, keeping partial input usable while typing. An empty input stays
 * empty so the field can show its placeholder.
 */
export function formatPhone(input: string): string {
  const digits = nationalDigits(input)
  if (digits === '') return ''

  const parts: string[] = []
  let offset = 0
  for (const size of GROUPS) {
    if (offset >= digits.length) break
    parts.push(digits.slice(offset, offset + size))
    offset += size
  }

  return `+${COUNTRY_CODE} ${parts.join(' ')}`
}

/** True once a full national number has been entered. */
export function isPhoneComplete(input: string): boolean {
  return nationalDigits(input).length === NATIONAL_LENGTH
}
