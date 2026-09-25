const DIRAMS_PER_SOMONI = 100

/**
 * Formats an integer amount in dirams (as stored and transmitted by the
 * API) as somoni: "142 000", or "142 000,50" when there are dirams.
 * The design shows whole somoni in tables, so trailing ",00" is dropped.
 */
export function formatMoney(amountInDirams: number): string {
  const whole = Math.trunc(amountInDirams / DIRAMS_PER_SOMONI)
  const dirams = Math.abs(amountInDirams % DIRAMS_PER_SOMONI)

  const formattedWhole = new Intl.NumberFormat('ru-RU').format(whole)
  return dirams === 0 ? formattedWhole : `${formattedWhole},${String(dirams).padStart(2, '0')}`
}

/** Same as formatMoney, with the "сом." unit the design uses in summaries. */
export function formatMoneyWithUnit(amountInDirams: number): string {
  return `${formatMoney(amountInDirams)} сом.`
}

/**
 * Parses what an admin typed into a money field ("120 000", "120000,50")
 * into an integer number of dirams. Returns null when the input isn't a
 * valid amount, so callers can show a validation message.
 */
export function parseMoneyInput(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (normalized === '' || !/^\d+(\.\d{1,2})?$/.test(normalized)) return null

  const [whole, fraction = ''] = normalized.split('.')
  const dirams = Number(fraction.padEnd(2, '0'))
  return Number(whole) * DIRAMS_PER_SOMONI + dirams
}
