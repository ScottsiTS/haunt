import { TILE_COLORS, STONE_DITHER } from './constants'
import type { GhostState } from './types'
import { TileType } from './types'

export type SpriteFrame = number[][]

export const GHOST_SPRITES: Record<GhostState, SpriteFrame[]> = {
  idle: [
    // Frame 0: neutral face, tentacles position A
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,2,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: neutral face, tentacles position B
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,2,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,0,1,2,2,1,0,1,2,2,1,0,1,2,2,1],
      [0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0],
    ],
  ],
  active: [
    // Frame 0: happy face (arched eyes, smile)
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,5,2,2,2,2,5,5,2,2,2,1,0],
      [1,2,2,2,3,3,2,2,2,2,3,3,2,2,2,1],
      [1,2,2,3,2,2,2,2,2,3,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,4,2,2,2,4,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,4,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: happy face, slight squish
    [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,5,2,2,2,2,5,5,2,2,2,1,0],
      [1,2,2,2,3,3,2,2,2,2,3,3,2,2,2,1],
      [1,2,2,3,2,2,2,2,2,3,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,4,2,2,2,4,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,4,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,0,1,2,2,1,0,1,2,2,1,0,1,2,2,1],
      [0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0],
    ],
  ],
  sleeping: [
    // Frame 0: eyes closed (horizontal lines)
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [1,2,2,3,3,3,2,2,2,3,3,3,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: identical (sleeping barely animates)
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [1,2,2,3,3,3,2,2,2,3,3,3,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
  ],
  distressed: [
    // Frame 0: worried eyes, squiggly mouth
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,5,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,4,2,4,2,4,2,4,2,2,2,2,1],
      [1,2,2,2,2,4,2,4,2,4,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: same face, shift for shake effect
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,5,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,4,2,4,2,4,2,2,2,2,2,1],
      [1,2,2,2,4,2,4,2,4,2,4,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
  ],
}

export function getGhostFrame(state: GhostState, frameIndex: number): SpriteFrame {
  const frames = GHOST_SPRITES[state]
  return frames[frameIndex % frames.length]
}

// Tombstone sprite: 16x16, pixel values: 0=transparent, 1=outline(dark), 6=stone body, 7=stone highlight, 8=stone dark
// Classic rounded-top gravestone shape
export const TOMBSTONE_SPRITE: number[][] = [
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,7,7,7,7,7,7,1,1,0,0,0],
  [0,0,1,7,6,6,6,6,6,6,6,6,7,1,0,0],
  [0,1,6,6,6,6,6,6,6,6,6,6,6,6,1,0],
  [0,1,6,6,6,6,6,6,6,6,6,6,6,6,1,0],
  [0,1,6,6,6,6,6,6,6,6,6,6,6,6,1,0],
  [0,1,6,6,6,6,6,6,6,6,6,6,6,6,1,0],
  [0,1,6,6,6,6,6,6,6,6,6,6,6,6,1,0],
  [0,1,6,6,6,6,6,6,6,6,6,6,6,6,1,0],
  [0,1,8,6,6,6,6,6,6,6,6,6,6,8,1,0],
  [0,1,8,8,6,6,6,6,6,6,6,6,8,8,1,0],
  [0,1,8,8,6,6,6,6,6,6,6,6,8,8,1,0],
  [1,1,8,8,6,6,6,6,6,6,6,6,8,8,1,1],
  [1,8,8,8,8,8,8,8,8,8,8,8,8,8,8,1],
  [1,8,8,8,8,8,8,8,8,8,8,8,8,8,8,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

// Cobweb sprite: 16x16, for top-left corner (flip for top-right)
// 0=transparent, 9=web thread
export const COBWEB_SPRITE: number[][] = [
  [9,9,9,9,9,9,0,0,0,0,0,0,0,0,0,0],
  [9,0,0,0,0,9,9,0,0,0,0,0,0,0,0,0],
  [9,0,0,0,0,0,9,9,0,0,0,0,0,0,0,0],
  [9,0,0,0,0,0,0,9,9,0,0,0,0,0,0,0],
  [9,0,0,0,0,0,0,0,9,0,0,0,0,0,0,0],
  [9,9,0,0,0,0,0,0,0,9,0,0,0,0,0,0],
  [0,9,9,0,0,0,0,0,0,0,9,0,0,0,0,0],
  [0,0,9,9,0,0,0,0,0,0,0,9,0,0,0,0],
  [0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

// --- TILE SPRITES ---
// Each tile is drawn as a filled rect with accent lines rather than full 16x16 arrays,
// using a color-lookup approach for performance.

/**
 * Returns the hex color for a tile type.
 */
export function tileColorMap(tile: TileType): string {
  switch (tile) {
    case TileType.Empty: return 'transparent'
    case TileType.Floor: return TILE_COLORS.floor
    case TileType.FloorAlt1: return TILE_COLORS.floorAlt1
    case TileType.FloorAlt2: return TILE_COLORS.floorAlt2
    case TileType.WallTop: return TILE_COLORS.wallCap       // lighter cap (top surface)
    case TileType.WallBottom: return TILE_COLORS.wallCap
    case TileType.WallLeft: return TILE_COLORS.wallSide
    case TileType.WallRight: return TILE_COLORS.wallSide
    case TileType.WallCornerTL: return TILE_COLORS.wallCorner
    case TileType.WallCornerTR: return TILE_COLORS.wallCorner
    case TileType.WallCornerBL: return TILE_COLORS.wallCorner
    case TileType.WallCornerBR: return TILE_COLORS.wallCorner
    case TileType.Doorway: return TILE_COLORS.doorway
    case TileType.Hallway: return TILE_COLORS.hallway
    case TileType.HallwayAlt: return TILE_COLORS.hallwayAlt
    case TileType.Sconce: return TILE_COLORS.wallFront // sits on front face
    case TileType.WallFront: return TILE_COLORS.wallFront   // darker face (3D depth)
    case TileType.Exterior: return TILE_COLORS.exterior      // graveyard ground
    default: return 'transparent'
  }
}

/**
 * Draw a single tile with decorative detail.
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  px: number,
  py: number,
  size: number
) {
  const color = tileColorMap(tile)
  if (color === 'transparent') return

  ctx.fillStyle = color
  ctx.fillRect(px, py, size, size)

  // Add grout lines + stone dither to floor tiles
  if (tile === TileType.Floor || tile === TileType.FloorAlt1 || tile === TileType.FloorAlt2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)

    // Deterministic 6x6 dither grid for weathered stone
    const step = size / 6
    for (let dy = 0; dy < 6; dy++) {
      for (let dx = 0; dx < 6; dx++) {
        const hash = ((px + dx * 17) * 31 + (py + dy * 13) * 37) & 0xff
        if (hash < 30) {
          ctx.fillStyle = STONE_DITHER.light
          ctx.fillRect(px + dx * step, py + dy * step, step, step)
        } else if (hash > 220) {
          ctx.fillStyle = STONE_DITHER.dark
          ctx.fillRect(px + dx * step, py + dy * step, step, step)
        }
        // Occasional crack line
        if (hash > 248) {
          ctx.strokeStyle = STONE_DITHER.crack
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(px + dx * step, py + dy * step)
          ctx.lineTo(px + dx * step + step, py + dy * step + step * 0.7)
          ctx.stroke()
        }
      }
    }
  }

  // Wall cap (top surface) — 2-layer rim lighting (cool blue + white)
  if (tile === TileType.WallTop || tile === TileType.WallBottom) {
    // Cool blue rim (1px)
    ctx.fillStyle = 'rgba(100,140,200,0.12)'
    ctx.fillRect(px, py, size, 1)
    // White edge (1px)
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    ctx.fillRect(px, py + 1, size, 1)
    // Stone block lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px + size / 2, py)
    ctx.lineTo(px + size / 2, py + size)
    ctx.stroke()
  }

  // Wall front face — darker with shadow gradient for 3D depth
  if (tile === TileType.WallFront) {
    // Gradient: slightly lighter at top (where it meets the cap), darker at bottom
    const grad = ctx.createLinearGradient(px, py, px, py + size)
    grad.addColorStop(0, 'rgba(255,255,255,0.06)')
    grad.addColorStop(1, 'rgba(0,0,0,0.1)')
    ctx.fillStyle = grad
    ctx.fillRect(px, py, size, size)
    // Mortar lines between stone blocks
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px + size / 2, py)
    ctx.lineTo(px + size / 2, py + size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(px, py + size / 2)
    ctx.lineTo(px + size, py + size / 2)
    ctx.stroke()
  }

  // Wall side (left/right) — vertical stone blocks
  if (tile === TileType.WallLeft || tile === TileType.WallRight) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, py + size / 2)
    ctx.lineTo(px + size, py + size / 2)
    ctx.stroke()
  }

  // Corner blocks — subtle stone texture
  if (tile >= TileType.WallCornerTL && tile <= TileType.WallCornerBR) {
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(px + 2, py + 2, size - 4, size - 4)
  }

  // Hallway grout lines (same as floor — unified stone look)
  if (tile === TileType.Hallway || tile === TileType.HallwayAlt) {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)
  }

  // Exterior graveyard ground — subtle dirt/gravel texture
  if (tile === TileType.Exterior) {
    // Scattered dark spots for gravel
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    const hashVal = (px * 7 + py * 13) & 0xff
    if (hashVal < 40) {
      ctx.fillRect(px + 4, py + 6, 2, 2)
    }
    if (hashVal > 200) {
      ctx.fillRect(px + 10, py + 3, 2, 1)
    }
  }

  // Sconce: draw a small flame on the wall tile
  if (tile === TileType.Sconce) {
    const cx = px + size / 2
    const cy = py + size / 2
    // Candle body
    ctx.fillStyle = '#dfe6e9'
    ctx.fillRect(cx - 2, cy, 4, 6)
    // Flame
    ctx.fillStyle = TILE_COLORS.sconce
    ctx.fillRect(cx - 2, cy - 4, 4, 4)
    // Glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.5)
    gradient.addColorStop(0, 'rgba(255, 170, 51, 0.15)')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, size * 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Doorway — floor-colored with subtle arch marks on edges
  if (tile === TileType.Doorway) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    ctx.fillRect(px, py, 2, size)
    ctx.fillRect(px + size - 2, py, 2, size)
  }
}
