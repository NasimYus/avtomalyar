import { describe, expect, it } from 'vitest'
import ru from './locales/ru.json'
import tg from './locales/tg.json'

interface Tree {
  [key: string]: string | Tree
}

function flatten(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : flatten(value, `${prefix}${key}.`),
  )
}

/** Plural forms (key_one, key_few…) count as the key itself. */
const PLURAL = /_(zero|one|two|few|many|other)$/
const keysOf = (tree: Tree) => new Set(flatten(tree).map((key) => key.replace(PLURAL, '')))

const ruKeys = keysOf(ru)
const tgKeys = keysOf(tg)

// Every source file, to find the keys the code asks for.
const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('locales', () => {
  it('have the same keys in Russian and Tajik', () => {
    expect([...ruKeys].filter((key) => !tgKeys.has(key))).toEqual([])
    expect([...tgKeys].filter((key) => !ruKeys.has(key))).toEqual([])
  })

  it('have every key the code uses', () => {
    const used = new Set<string>()
    for (const source of Object.values(sources)) {
      for (const match of source.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) used.add(match[1])
      // Keys chosen by a condition: t(cond ? 'a.b' : 'a.c').
      for (const match of source.matchAll(
        /\bt\([^)]*?\?\s*'([a-z][\w.]+)'\s*:\s*'([a-z][\w.]+)'/g,
      )) {
        used.add(match[1])
        used.add(match[2])
      }
    }
    const missing = [...used].filter((key) => !ruKeys.has(key) || !tgKeys.has(key))
    expect(missing).toEqual([])
  })

  it('leave no Tajik text empty', () => {
    const blank = (tree: Tree, prefix = ''): string[] =>
      Object.entries(tree).flatMap(([key, value]) =>
        typeof value === 'string'
          ? value.trim() === ''
            ? [prefix + key]
            : []
          : blank(value, `${prefix}${key}.`),
      )
    expect(blank(tg)).toEqual([])
  })
})
