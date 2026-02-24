import { describe, it, expect } from 'vitest'
import { getFurnitureForDb, FURNITURE_LABELS } from '../furniture'
import { FurnitureType } from '../types'

describe('getFurnitureForDb', () => {
  it('returns a valid FurnitureType (0-7)', () => {
    const ids = ['abc123', 'xyz789', 'test', 'mock00001a', 'mock00002b']
    for (const id of ids) {
      const type = getFurnitureForDb(id)
      expect(type).toBeGreaterThanOrEqual(0)
      expect(type).toBeLessThanOrEqual(7)
    }
  })

  it('is deterministic (same ID → same furniture)', () => {
    const id = 'deterministic-test-id'
    const first = getFurnitureForDb(id)
    const second = getFurnitureForDb(id)
    expect(first).toBe(second)
  })

  it('different IDs can produce different furniture', () => {
    const types = new Set<number>()
    // With enough different IDs, we should get more than 1 unique type
    for (let i = 0; i < 100; i++) {
      types.add(getFurnitureForDb(`unique-id-${i}`))
    }
    expect(types.size).toBeGreaterThan(1)
  })
})

describe('FURNITURE_LABELS', () => {
  it('has a label for all 8 furniture types', () => {
    for (let i = 0; i <= 7; i++) {
      expect(FURNITURE_LABELS[i as FurnitureType]).toBeDefined()
      expect(typeof FURNITURE_LABELS[i as FurnitureType]).toBe('string')
    }
  })
})
