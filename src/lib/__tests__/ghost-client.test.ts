import { describe, it, expect } from 'vitest'
import { parseSizeToBytes, computeGhostState, computeGhostScale, computeGlowIntensity } from '../ghost-client'

describe('parseSizeToBytes', () => {
  it('parses MB', () => {
    expect(parseSizeToBytes('339MB')).toBe(339 * 1024 * 1024)
  })
  it('parses GB', () => {
    expect(parseSizeToBytes('1GB')).toBe(1024 * 1024 * 1024)
  })
  it('parses KB', () => {
    expect(parseSizeToBytes('512KB')).toBe(512 * 1024)
  })
  it('returns 0 for unparseable', () => {
    expect(parseSizeToBytes('unknown')).toBe(0)
  })
})

describe('computeGhostState', () => {
  it('returns sleeping when paused', () => {
    expect(computeGhostState('paused', null)).toBe('sleeping')
  })
  it('returns idle when no stats', () => {
    expect(computeGhostState('running', null)).toBe('idle')
  })
  it('returns active when calls > 100', () => {
    expect(computeGhostState('running', {
      totalCalls: 500, totalExecTimeMs: 100, totalRows: 1000, cacheHitPct: 95, tableCount: 5,
    })).toBe('active')
  })
  it('returns distressed when cache hit < 50%', () => {
    expect(computeGhostState('running', {
      totalCalls: 500, totalExecTimeMs: 100, totalRows: 1000, cacheHitPct: 30, tableCount: 5,
    })).toBe('distressed')
  })
  it('returns idle when low activity', () => {
    expect(computeGhostState('running', {
      totalCalls: 10, totalExecTimeMs: 5, totalRows: 20, cacheHitPct: 95, tableCount: 2,
    })).toBe('idle')
  })
})

describe('computeGhostScale', () => {
  it('returns 1.0 for max size', () => {
    expect(computeGhostScale(100, 100)).toBe(1.0)
  })
  it('returns 0.7 for zero size', () => {
    expect(computeGhostScale(0, 100)).toBe(0.7)
  })
  it('returns 1 when maxSizeBytes is 0', () => {
    expect(computeGhostScale(0, 0)).toBe(1)
  })
})

describe('computeGlowIntensity', () => {
  it('returns 0 for null stats', () => {
    expect(computeGlowIntensity(null)).toBe(0)
  })
  it('returns 0 for zero calls', () => {
    expect(computeGlowIntensity({ totalCalls: 0, totalExecTimeMs: 0, totalRows: 0, cacheHitPct: 0, tableCount: 0 })).toBe(0)
  })
  it('caps at 1', () => {
    expect(computeGlowIntensity({ totalCalls: 5000, totalExecTimeMs: 0, totalRows: 0, cacheHitPct: 0, tableCount: 0 })).toBe(1)
  })
})
