import { describe, it, expect } from 'vitest'
import { generateMansion, getGhostNearPixel } from '../tilemap'
import { TileType } from '../types'
import type { HauntGhost } from '../types'
import { GHOST_CELL_W, GHOST_CELL_H, WALL_THICKNESS, EXTERIOR_PAD, TILE_RENDERED } from '../constants'

function makeGhosts(count: number): HauntGhost[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ghost${i.toString().padStart(4, '0')}`,
    name: `db-${i}`,
    sizeBytes: (i + 1) * 100 * 1024 * 1024,
    status: 'running' as const,
    stats: { totalCalls: 100, totalExecTimeMs: 500, totalRows: 1000, cacheHitPct: 90, tableCount: 5 },
  }))
}

const WALL_TILES = new Set([
  TileType.WallTop, TileType.WallBottom, TileType.WallLeft, TileType.WallRight,
  TileType.WallCornerTL, TileType.WallCornerTR, TileType.WallCornerBL, TileType.WallCornerBR,
  TileType.WallFront, TileType.Sconce,
])

const FLOOR_TILES = new Set([TileType.Floor, TileType.FloorAlt1, TileType.FloorAlt2])

describe('generateMansion', () => {
  it('returns empty map for 0 ghosts', () => {
    const mansion = generateMansion([])
    expect(mansion.spots).toHaveLength(0)
    expect(mansion.width).toBeGreaterThan(0)
    expect(mansion.height).toBeGreaterThan(0)
  })

  it('creates one spot for 1 ghost', () => {
    const mansion = generateMansion(makeGhosts(1))
    expect(mansion.spots).toHaveLength(1)
    expect(mansion.spots[0].ghostId).toBe('ghost0000')
  })

  it('creates spots matching ghost count', () => {
    for (const count of [2, 3, 4, 6, 10]) {
      const mansion = generateMansion(makeGhosts(count))
      expect(mansion.spots).toHaveLength(count)
    }
  })

  it('floor fills the interior', () => {
    const mansion = generateMansion(makeGhosts(4))
    const intLeft = EXTERIOR_PAD + WALL_THICKNESS
    const intTop = EXTERIOR_PAD + WALL_THICKNESS
    const cols = Math.ceil(Math.sqrt(4))
    const rows = Math.ceil(4 / cols)
    const intW = cols * GHOST_CELL_W
    const intH = rows * GHOST_CELL_H

    let floorCount = 0
    for (let y = intTop; y < intTop + intH; y++) {
      for (let x = intLeft; x < intLeft + intW; x++) {
        if (FLOOR_TILES.has(mansion.tiles[y][x])) floorCount++
      }
    }
    expect(floorCount).toBe(intW * intH)
  })

  it('has exterior graveyard ground around the building', () => {
    const mansion = generateMansion(makeGhosts(4))
    expect(mansion.tiles[0][0]).toBe(TileType.Exterior)
    expect(mansion.tiles[0][mansion.width - 1]).toBe(TileType.Exterior)
    expect(mansion.tiles[mansion.height - 1][0]).toBe(TileType.Exterior)
  })

  it('has 2-tile thick exterior walls', () => {
    const mansion = generateMansion(makeGhosts(4))
    const wallStartY = EXTERIOR_PAD
    for (let dy = 0; dy < WALL_THICKNESS; dy++) {
      for (let x = EXTERIOR_PAD; x < mansion.width - EXTERIOR_PAD; x++) {
        expect(WALL_TILES.has(mansion.tiles[wallStartY + dy][x])).toBe(true)
      }
    }
  })

  it('has WallFront tiles for 3D depth', () => {
    const mansion = generateMansion(makeGhosts(4))
    let foundFront = false
    for (let y = 0; y < mansion.height && !foundFront; y++) {
      for (let x = 0; x < mansion.width && !foundFront; x++) {
        if (mansion.tiles[y][x] === TileType.WallFront) foundFront = true
      }
    }
    expect(foundFront).toBe(true)
  })

  it('has NO interior wall tiles (open floor)', () => {
    const mansion = generateMansion(makeGhosts(4))
    const intLeft = EXTERIOR_PAD + WALL_THICKNESS
    const intTop = EXTERIOR_PAD + WALL_THICKNESS
    const cols = Math.ceil(Math.sqrt(4))
    const rows = Math.ceil(4 / cols)
    const intW = cols * GHOST_CELL_W
    const intH = rows * GHOST_CELL_H

    for (let y = intTop; y < intTop + intH; y++) {
      for (let x = intLeft; x < intLeft + intW; x++) {
        const tile = mansion.tiles[y][x]
        expect(WALL_TILES.has(tile)).toBe(false)
      }
    }
  })

  it('has no hallway or doorway tiles', () => {
    const mansion = generateMansion(makeGhosts(4))
    for (let y = 0; y < mansion.height; y++) {
      for (let x = 0; x < mansion.width; x++) {
        expect(mansion.tiles[y][x]).not.toBe(TileType.Hallway)
        expect(mansion.tiles[y][x]).not.toBe(TileType.HallwayAlt)
        expect(mansion.tiles[y][x]).not.toBe(TileType.Doorway)
      }
    }
  })

  it('scales map with more ghosts', () => {
    const small = generateMansion(makeGhosts(2))
    const large = generateMansion(makeGhosts(8))
    expect(large.width * large.height).toBeGreaterThan(small.width * small.height)
  })
})

describe('getGhostNearPixel', () => {
  it('returns closest ghost when within threshold', () => {
    const mansion = generateMansion(makeGhosts(4))
    const spot = mansion.spots[0]
    // Pixel near spot center
    const px = spot.tileX * TILE_RENDERED + TILE_RENDERED / 2
    const py = spot.tileY * TILE_RENDERED + TILE_RENDERED / 2
    const found = getGhostNearPixel(mansion.spots, px, py)
    expect(found).not.toBeNull()
    expect(found!.ghostId).toBe(spot.ghostId)
  })

  it('returns null when far from any ghost', () => {
    const mansion = generateMansion(makeGhosts(2))
    // Way outside the building
    const found = getGhostNearPixel(mansion.spots, 0, 0)
    expect(found).toBeNull()
  })

  it('respects custom threshold', () => {
    const mansion = generateMansion(makeGhosts(2))
    const spot = mansion.spots[0]
    const px = spot.tileX * TILE_RENDERED + TILE_RENDERED / 2
    const py = spot.tileY * TILE_RENDERED + TILE_RENDERED / 2
    // Very tight threshold should still find the ghost at its center
    const found = getGhostNearPixel(mansion.spots, px, py, 10)
    expect(found).not.toBeNull()
    // Far offset should miss with tight threshold
    const far = getGhostNearPixel(mansion.spots, px + 500, py + 500, 10)
    expect(far).toBeNull()
  })
})
