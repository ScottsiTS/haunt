import { GHOST_CELL_W, GHOST_CELL_H, WALL_THICKNESS, EXTERIOR_PAD, TILE_RENDERED } from './constants'
import { TileType, FurnitureType } from './types'
import type { HauntGhost, MansionMap, GhostSpot } from './types'

/**
 * Deterministic hash of a string to a number 0..max-1
 */
function hashToIndex(str: string, max: number): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return ((hash % max) + max) % max
}

/**
 * Simple seeded RNG for deterministic floor-variant scattering
 */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/**
 * Generate the mansion tilemap from a list of ghosts.
 *
 * Layout — one big open floor inside exterior walls:
 *
 *  ░░░░░░░░░░░░░░░░░░░  ← Exterior graveyard
 *  ░░╔══════════════╗░░
 *  ░░║              ║░░
 *  ░░║  👻    👻    ║░░   One open floor
 *  ░░║              ║░░   Ghosts at grid spots
 *  ░░║  👻    👻    ║░░   Hover ghost = tooltip
 *  ░░║              ║░░
 *  ░░╚══════════════╝░░
 *  ░░░░░░░░░░░░░░░░░░░  ← Exterior graveyard
 */
export function generateMansion(ghosts: HauntGhost[]): MansionMap {
  const count = ghosts.length
  if (count === 0) {
    return { width: 8, height: 8, tiles: makeTiles(8, 8, TileType.Exterior), spots: [] }
  }

  const W = WALL_THICKNESS // 2
  const P = EXTERIOR_PAD   // 2

  // Grid layout: roughly square
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)

  // Building interior size in tiles
  const interiorW = cols * GHOST_CELL_W
  const interiorH = rows * GHOST_CELL_H

  // Total map size
  const mapWidth = P + W + interiorW + W + P
  const mapHeight = P + W + interiorH + W + P

  // Building rectangle (includes walls)
  const bx = P
  const by = P
  const bw = W + interiorW + W
  const bh = W + interiorH + W

  // Interior top-left
  const intLeft = bx + W
  const intTop = by + W

  const tiles = makeTiles(mapWidth, mapHeight, TileType.Exterior)
  const spots: GhostSpot[] = []
  const rng = seededRandom(42)

  // 1. Fill entire building rectangle with floor
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      tiles[y][x] = TileType.Floor
    }
  }

  // 2. Scatter floor variants in the interior
  for (let y = intTop; y < intTop + interiorH; y++) {
    for (let x = intLeft; x < intLeft + interiorW; x++) {
      const r = rng()
      if (r < 0.1) tiles[y][x] = TileType.FloorAlt1
      else if (r < 0.18) tiles[y][x] = TileType.FloorAlt2
      else tiles[y][x] = TileType.Floor
    }
  }

  // 3. Draw exterior walls (2-tile thick perimeter)
  // Top wall: 2 rows
  for (let x = bx; x < bx + bw; x++) {
    tiles[by][x] = TileType.WallTop
    tiles[by + 1][x] = TileType.WallFront
  }
  // Bottom wall: 2 rows
  for (let x = bx; x < bx + bw; x++) {
    tiles[by + bh - 2][x] = TileType.WallTop
    tiles[by + bh - 1][x] = TileType.WallFront
  }
  // Left wall: 2 cols
  for (let y = by; y < by + bh; y++) {
    tiles[y][bx] = TileType.WallLeft
    tiles[y][bx + 1] = TileType.WallLeft
  }
  // Right wall: 2 cols
  for (let y = by; y < by + bh; y++) {
    tiles[y][bx + bw - 2] = TileType.WallRight
    tiles[y][bx + bw - 1] = TileType.WallRight
  }
  // Corners — 2x2 blocks
  fillBlock(tiles, bx, by, W, W, TileType.WallCornerTL)
  fillBlock(tiles, bx + bw - W, by, W, W, TileType.WallCornerTR)
  fillBlock(tiles, bx, by + bh - W, W, W, TileType.WallCornerBL)
  fillBlock(tiles, bx + bw - W, by + bh - W, W, W, TileType.WallCornerBR)

  // 4. Place sconces along all exterior walls
  const sconceSpacing = Math.max(4, Math.floor(GHOST_CELL_W * 0.75))
  // Top wall interior face
  for (let x = intLeft + 2; x < intLeft + interiorW - 2; x += sconceSpacing) {
    tiles[by + 1][x] = TileType.Sconce
  }
  // Bottom wall interior face
  for (let x = intLeft + 2; x < intLeft + interiorW - 2; x += sconceSpacing) {
    tiles[by + bh - 2][x] = TileType.Sconce
  }
  // Left wall interior face
  for (let y = intTop + 2; y < intTop + interiorH - 2; y += sconceSpacing) {
    tiles[y][bx + 1] = TileType.Sconce
  }
  // Right wall interior face
  for (let y = intTop + 2; y < intTop + interiorH - 2; y += sconceSpacing) {
    tiles[y][bx + bw - 2] = TileType.Sconce
  }

  // 5. Place ghosts at cell centers with scattered furniture
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)

    const cellLeft = intLeft + col * GHOST_CELL_W
    const cellTop = intTop + row * GHOST_CELL_H

    // Ghost center tile
    const tileX = cellLeft + Math.floor(GHOST_CELL_W / 2)
    const tileY = cellTop + Math.floor(GHOST_CELL_H / 2)

    // Furniture: scatter naturally within the cell using deterministic hash
    const fHash = hashToIndex(ghosts[i].id + 'furn', 100)
    // Vary horizontal position: left third, center, or right third of cell
    const fxOffset = (fHash % 3) - 1 // -1, 0, or 1
    const furnitureTileX = Math.max(cellLeft + 1, Math.min(cellLeft + GHOST_CELL_W - 3,
      tileX + fxOffset * 2))
    // Vary vertical position: upper portion of cell (rows 1-3)
    const fyOffset = (fHash % 3) + 1 // 1, 2, or 3
    const furnitureTileY = cellTop + fyOffset

    const furnitureType = hashToIndex(ghosts[i].id, 8) as FurnitureType

    spots.push({
      index: i,
      ghostId: ghosts[i].id,
      ghostName: ghosts[i].name,
      tileX,
      tileY,
      furnitureType,
      furnitureTileX,
      furnitureTileY,
    })
  }

  return { width: mapWidth, height: mapHeight, tiles, spots }
}

function makeTiles(w: number, h: number, fill: TileType): TileType[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill))
}

function fillBlock(tiles: TileType[][], x: number, y: number, w: number, h: number, type: TileType) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles[y + dy][x + dx] = type
    }
  }
}

/**
 * Find the closest ghost spot within a pixel distance threshold.
 * Returns null if no ghost is within range.
 */
export function getGhostNearPixel(
  spots: GhostSpot[],
  pixelX: number,
  pixelY: number,
  threshold: number = TILE_RENDERED * 3
): GhostSpot | null {
  let closest: GhostSpot | null = null
  let closestDist = Infinity

  for (const spot of spots) {
    // Convert spot tile center to pixel center
    const spotPxX = spot.tileX * TILE_RENDERED + TILE_RENDERED / 2
    const spotPxY = spot.tileY * TILE_RENDERED + TILE_RENDERED / 2
    const dx = pixelX - spotPxX
    const dy = pixelY - spotPxY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < closestDist && dist <= threshold) {
      closestDist = dist
      closest = spot
    }
  }

  return closest
}
