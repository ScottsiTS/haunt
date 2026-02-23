import { describe, it, expect } from 'vitest'
import { GHOST_SPRITES, getGhostFrame } from '../sprites'

describe('GHOST_SPRITES', () => {
  it('has all 4 states', () => {
    expect(Object.keys(GHOST_SPRITES)).toEqual(
      expect.arrayContaining(['idle', 'active', 'sleeping', 'distressed'])
    )
  })
  it('each state has at least 2 frames', () => {
    for (const state of Object.keys(GHOST_SPRITES) as Array<keyof typeof GHOST_SPRITES>) {
      expect(GHOST_SPRITES[state].length).toBeGreaterThanOrEqual(2)
    }
  })
  it('each frame is 16x16', () => {
    for (const state of Object.keys(GHOST_SPRITES) as Array<keyof typeof GHOST_SPRITES>) {
      for (const frame of GHOST_SPRITES[state]) {
        expect(frame.length).toBe(16)
        for (const row of frame) {
          expect(row.length).toBe(16)
        }
      }
    }
  })
})

describe('getGhostFrame', () => {
  it('cycles through frames', () => {
    const frame0 = getGhostFrame('idle', 0)
    const frame1 = getGhostFrame('idle', 1)
    expect(frame0).toBeDefined()
    expect(frame1).toBeDefined()
  })
  it('wraps frame index', () => {
    const frameCount = GHOST_SPRITES.idle.length
    const wrapped = getGhostFrame('idle', frameCount)
    const first = getGhostFrame('idle', 0)
    expect(wrapped).toEqual(first)
  })
})
