import { TileType } from './types'
import type { MansionMap } from './types'

export interface TileCoord {
  x: number
  y: number
}

const WALKABLE_TILES = new Set([
  TileType.Floor,
  TileType.FloorAlt1,
  TileType.FloorAlt2,
  TileType.Hallway,
  TileType.HallwayAlt,
  TileType.Doorway,
])

/**
 * Build a boolean walkability grid from the mansion tilemap.
 */
export function buildWalkabilityGrid(mansion: MansionMap): boolean[][] {
  const grid: boolean[][] = []
  for (let y = 0; y < mansion.height; y++) {
    grid[y] = []
    for (let x = 0; x < mansion.width; x++) {
      grid[y][x] = WALKABLE_TILES.has(mansion.tiles[y][x])
    }
  }
  return grid
}

/**
 * BFS pathfinding from start to goal on a walkability grid.
 * Returns array of tile coordinates from start to goal (inclusive), or null if no path.
 */
export function bfsPath(
  grid: boolean[][],
  start: TileCoord,
  goal: TileCoord
): TileCoord[] | null {
  const height = grid.length
  const width = grid[0]?.length ?? 0

  if (!inBounds(start, width, height) || !inBounds(goal, width, height)) return null
  if (!grid[start.y][start.x] || !grid[goal.y][goal.x]) return null
  if (start.x === goal.x && start.y === goal.y) return [{ ...start }]

  // BFS
  const visited = new Set<string>()
  const parent = new Map<string, TileCoord>()
  const queue: TileCoord[] = [start]
  visited.add(key(start))

  const dirs = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 },  // right
  ]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const dir of dirs) {
      const next: TileCoord = { x: current.x + dir.x, y: current.y + dir.y }
      const k = key(next)

      if (!inBounds(next, width, height)) continue
      if (visited.has(k)) continue
      if (!grid[next.y][next.x]) continue

      visited.add(k)
      parent.set(k, current)

      if (next.x === goal.x && next.y === goal.y) {
        // Reconstruct path
        return reconstructPath(parent, start, goal)
      }

      queue.push(next)
    }
  }

  return null // no path found
}

function reconstructPath(
  parent: Map<string, TileCoord>,
  start: TileCoord,
  goal: TileCoord
): TileCoord[] {
  const path: TileCoord[] = []
  let current = goal
  while (!(current.x === start.x && current.y === start.y)) {
    path.push({ ...current })
    const p = parent.get(key(current))
    if (!p) break
    current = p
  }
  path.push({ ...start })
  path.reverse()
  return path
}

function key(c: TileCoord): string {
  return `${c.x},${c.y}`
}

function inBounds(c: TileCoord, width: number, height: number): boolean {
  return c.x >= 0 && c.x < width && c.y >= 0 && c.y < height
}
