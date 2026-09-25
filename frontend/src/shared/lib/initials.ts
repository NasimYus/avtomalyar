/**
 * Two-letter initials for an avatar circle, as in the dealers table
 * («Рангсоз» → «РС», ООО «КрасТех» → «КТ»). Legal-form prefixes and
 * quotes are ignored so the initials come from the actual name.
 */
const IGNORED_PREFIXES = new Set(['ооо', 'зао', 'оао', 'ип', 'чп', 'ҷдмм', 'ltd', 'llc'])

export function initials(fullName: string): string {
  const words = fullName
    .replace(/[«»"'(),.]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((word) => !IGNORED_PREFIXES.has(word.toLowerCase()))

  if (words.length === 0) return '—'

  if (words.length === 1) {
    // Compound names like «КрасТех» read as two parts — take both capitals.
    const capitals = words[0].match(/\p{Lu}/gu)
    if (capitals && capitals.length >= 2) return (capitals[0] + capitals[1]).toUpperCase()
    return words[0].slice(0, 2).toUpperCase()
  }

  return (words[0][0] + words[1][0]).toUpperCase()
}
