import { describe, it, expect } from 'vitest'
import { spriteColorMap, computeBobOffset } from '../renderer'
import { COLORS } from '../constants'

describe('spriteColorMap', () => {
  it('maps 0 to transparent', () => {
    expect(spriteColorMap(0, COLORS.ghostDefault)).toBe('transparent')
  })
  it('maps 1 to outline', () => {
    expect(spriteColorMap(1, COLORS.ghostDefault)).toBe('#111122')
  })
  it('maps 2 to body color', () => {
    expect(spriteColorMap(2, COLORS.ghostDefault)).toBe(COLORS.ghostDefault)
  })
  it('maps 3 to eye color', () => {
    expect(spriteColorMap(3, COLORS.ghostDefault)).toBe('#2d3436')
  })
  it('maps 4 to mouth color', () => {
    expect(spriteColorMap(4, COLORS.ghostDefault)).toBe('#636e72')
  })
})

describe('computeBobOffset', () => {
  it('returns value within amplitude range', () => {
    for (let f = 0; f < 60; f++) {
      const offset = computeBobOffset(f, 4)
      expect(Math.abs(offset)).toBeLessThanOrEqual(4)
    }
  })
})
