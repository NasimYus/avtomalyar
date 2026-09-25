/** Business timezone of the shop (ToR 3.6). */
export const BUSINESS_TIME_ZONE = 'Asia/Dushanbe'

/** Formats an API date string ("2026-09-24") as "24.09.2026". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}.${month}.${year}`
}

/** Formats an API date string as "24.09" — used in dense tables. */
export function formatDateShort(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  if (!month || !day) return isoDate
  return `${day}.${month}`
}

/**
 * Formats an API timestamp ("2026-09-25T12:43:09Z") as "25.09.2026, 12:43"
 * in the business timezone — used where the moment matters, such as when
 * promotion results were published.
 */
export function formatDateTime(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) return isoTimestamp

  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

/** Today's date in the business timezone, as an API date string. */
export function todayISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts
}
