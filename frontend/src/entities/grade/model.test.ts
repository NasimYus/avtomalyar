import { describe, expect, it } from 'vitest'
import { gradeToneByIndex } from './model'

describe('gradeToneByIndex', () => {
  it('paints the entry grade bronze and the top one gold', () => {
    expect(gradeToneByIndex(0, 3)).toBe('bronze')
    expect(gradeToneByIndex(2, 3)).toBe('gold')
  })

  it('paints everything in between silver', () => {
    expect(gradeToneByIndex(1, 3)).toBe('silver')
    expect(gradeToneByIndex(2, 5)).toBe('silver')
  })

  it('treats a single grade as the top one', () => {
    expect(gradeToneByIndex(0, 1)).toBe('gold')
  })

  it('has no silver when there are only two grades', () => {
    expect(gradeToneByIndex(0, 2)).toBe('bronze')
    expect(gradeToneByIndex(1, 2)).toBe('gold')
  })
})
