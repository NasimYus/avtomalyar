/**
 * Grade tiers — how a loyalty level looks.
 *
 * The shop defines its own ladder: three grades or ten, named however it
 * likes. So the look is split in two independent parts:
 *
 * - the **material** (bronze, gold, emerald, …) — the colour. The admin
 *   may pick one per grade; if they do not, it follows from the grade's
 *   place in the ladder (see autoTierColors);
 * - the **rank** — how showy the grade is. It always follows the place in
 *   the ladder, whatever the colour: the upper half shimmers and the top
 *   grade wears a crown and a glow. So a ladder of any length and any
 *   palette still reads bottom-to-top at a glance.
 */

/**
 * Every material, from the humblest to the most prestigious. The backend
 * validates against the same list (grade_handlers.go), so a new material
 * goes into both, plus its palette in app/styles/index.css.
 */
export const TIER_COLORS = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'sapphire',
  'amethyst',
  'ruby',
  'diamond',
  'onyx',
] as const

export type TierColor = (typeof TIER_COLORS)[number]

export function isTierColor(value: unknown): value is TierColor {
  return typeof value === 'string' && (TIER_COLORS as readonly string[]).includes(value)
}

/** The metals every shop expects at the bottom of a ladder. */
const METALS: TierColor[] = ['bronze', 'silver', 'gold', 'platinum']
/** Gems that fill a long ladder between the metals and the summit. */
const GEMS: TierColor[] = ['emerald', 'sapphire', 'amethyst', 'ruby']

/**
 * The default palette for a ladder of `total` grades.
 *
 * Short ladders stay classic (bronze → silver → gold → platinum →
 * diamond); longer ones slot gems in between and crown the tenth grade
 * with onyx. The top of the ladder always gets the most precious material
 * the length allows, so the summit never looks like a middle step.
 */
export function autoTierColors(total: number): TierColor[] {
  if (total <= 0) return []
  if (total === 1) return ['gold']
  if (total === 2) return ['silver', 'gold']
  if (total <= 4) return METALS.slice(0, total)

  // Five and up: the four metals, gems in the middle, diamond on top —
  // and from ten grades on, onyx above the diamond.
  const summit: TierColor[] = total >= 10 ? ['diamond', 'onyx'] : ['diamond']
  const middle = total - METALS.length - summit.length
  const gems = Array.from({ length: middle }, (_, i) => GEMS[i % GEMS.length])
  return [...METALS, ...gems, ...summit]
}

/**
 * How showy a grade is, by its place in the ladder:
 * `base` — plain metal; `shine` — a light sweeps across it (upper half);
 * `crown` — the top grade: shine, glow and a crown.
 */
export type TierRank = 'base' | 'shine' | 'crown'

export interface Tier {
  color: TierColor
  rank: TierRank
  /** 1-based level number — "level 3 of 10". */
  level: number
  total: number
}

export function tierRank(index: number, total: number): TierRank {
  if (index >= total - 1) return 'crown'
  // Upper half, never the entry grade: with three grades only the top
  // one is special, with ten the last five are.
  if (index > 0 && index >= Math.ceil(total / 2)) return 'shine'
  return 'base'
}

/**
 * The tier of the grade at `index` in a ladder of `total` grades. An
 * explicit colour chosen by the admin wins; an unknown one (say, from a
 * newer backend) falls back to the automatic palette rather than breaking.
 */
export function tierAt(index: number, total: number, color?: string | null): Tier {
  return {
    color: isTierColor(color) ? color : (autoTierColors(total)[index] ?? 'gold'),
    rank: tierRank(index, total),
    level: index + 1,
    total,
  }
}

/**
 * The tier of grade `id` within `ladder`, which must be sorted by
 * threshold (every API that returns grades does so). Undefined for a
 * dealer without a grade, or a grade that is not in the ladder.
 */
export function tierOf(
  ladder: readonly { id: number; color?: string | null }[],
  id: number | undefined,
): Tier | undefined {
  if (id === undefined) return undefined
  const index = ladder.findIndex((grade) => grade.id === id)
  if (index === -1) return undefined
  return tierAt(index, ladder.length, ladder[index].color)
}
