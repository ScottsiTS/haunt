import { describe, it, expect } from 'vitest'
import { buildWalkabilityGrid, bfsPath } from '../pathfinding'
import { generateMansion } from '../tilemap'
import { TileType } from '../types'
import type { HauntGhost } from '../types'

function makeGhosts(count: number): HauntGhost[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ghost${i.toString().padStart(4, '0')}`,
    name: `db-${i}`,
    sizeBytes: (i + 1) * 100 * 1024 * 1024,
    status: 'running' as const,
    stats: { totalCalls: 100, totalExecTimeMs: 500, totalRows: 1000, cacheHitPct: 90, tableCount: 5 },
  }))
}

describe('buildWalkabilityGrid', () => {
  it('marks floor tiles as walkable', () => {
    const mansion = generateMansion(makeGhosts(2))
    const grid = buildWalkabilityGrid(mansion)

    // Spot interior should be walkable
    const spot = mansion.spots[0]
    expect(grid[spot.tileY][spot.tileX]).toBe(true)
  })

  it('marks empty tiles as unwalkable', () => {
    const mansion = generateMansion(makeGhosts(2))
    const grid = buildWalkabilityGrid(mansion)
    // Corner (0,0) should be empty/unwalkable
    expect(grid[0][0]).toBe(false)
  })

  it('marks interior floor as walkable', () => {
    const mansion = generateMansion(makeGhosts(2))
    const grid = buildWalkabilityGrid(mansion)
    // Find a floor tile inside the building
    let foundWalkableFloor = false
    for (let y = 0; y < mansion.height; y++) {
      for (let x = 0; x < mansion.width; x++) {
        const tile = mansion.tiles[y][x]
        if (tile === TileType.Floor || tile === TileType.FloorAlt1 || tile === TileType.FloorAlt2) {
          expect(grid[y][x]).toBe(true)
          foundWalkableFloor = true
          break
        }
      }
      if (foundWalkableFloor) break
    }
    expect(foundWalkableFloor).toBe(true)
  })
})

describe('bfsPath', () => {
  it('finds path between two walkable tiles', () => {
    const mansion = generateMansion(makeGhosts(2))
    const grid = buildWalkabilityGrid(mansion)
    const spot = mansion.spots[0]
    const start = { x: spot.tileX, y: spot.tileY }
    const goal = { x: spot.tileX + 2, y: spot.tileY }
    const path = bfsPath(grid, start, goal)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThanOrEqual(3)
    expect(path![0]).toEqual(start)
    expect(path![path!.length - 1]).toEqual(goal)
  })

  it('returns single-element path for same start and goal', () => {
    const mansion = generateMansion(makeGhosts(2))
    const grid = buildWalkabilityGrid(mansion)
    const spot = mansion.spots[0]
    const point = { x: spot.tileX, y: spot.tileY }
    const path = bfsPath(grid, point, point)
    expect(path).toEqual([point])
  })

  it('returns null for unreachable goals', () => {
    // 3x3 grid with center blocked
    const grid = [
      [true, false, true],
      [false, false, false],
      [true, false, true],
    ]
    const path = bfsPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 })
    expect(path).toBeNull()
  })

  it('finds path from spot to spot across open floor', () => {
    const mansion = generateMansion(makeGhosts(4))
    const grid = buildWalkabilityGrid(mansion)

    // Path from spot 0 to spot 1
    const spot0 = mansion.spots[0]
    const spot1 = mansion.spots[1]

    const start = { x: spot0.furnitureTileX, y: spot0.furnitureTileY }
    const goal = { x: spot1.tileX, y: spot1.tileY }

    const path = bfsPath(grid, start, goal)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(1)
  })
})
