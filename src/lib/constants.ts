export const SPRITE_SIZE = 16
export const SPRITE_SCALE = 5  // 16px × 5 = 80px max ghost size
export const RENDERED_SIZE = SPRITE_SIZE * SPRITE_SCALE

// Tile-based mansion layout
export const TILE_SIZE = 16
export const TILE_SCALE = 3
export const TILE_RENDERED = TILE_SIZE * TILE_SCALE // 48px per tile

export const GHOST_CELL_W = 8  // grid cell width per ghost (tiles)
export const GHOST_CELL_H = 8  // grid cell height per ghost (tiles)
export const WALL_THICKNESS = 2 // tiles — top row = cap (light), bottom row = front (dark)
export const EXTERIOR_PAD = 2   // tiles of graveyard ground around the building

export const FRAME_RATE = 8
export const BOB_AMPLITUDE = 2
export const POLL_INTERVAL = 10_000

export const COLORS = {
  background: '#0a0a14',
  roomFloor: '#1a1a2e',
  roomWall: '#16213e',
  wallTrim: '#2a2a4a',
  candleFlame: '#ffbb44',
  candleGlow: 'rgba(255, 187, 68, 0.18)',
  ghostDefault: '#c8d6e5',
  ghostGlow: '#66ff88',
  ghostDistressed: '#ff6b6b',
  ghostSleeping: '#636e72',
  textPrimary: '#c8d0d8',
  textSecondary: '#8a94a0',
  badgeBg: '#2d3436',
  particle: '#ffeaa7',
} as const

// Ambient effects
export const FOG_CLOUD_COUNT = 3 // clouds per room
export const FOG_SPEED = 0.3 // pixels per frame
export const FOG_OPACITY = 0.08
export const DUST_MOTE_COUNT = 25 // per room
export const DUST_OPACITY_MIN = 0.1
export const DUST_OPACITY_MAX = 0.3
export const FLICKER_SPEED = 0.05 // sine wave speed
export const FLICKER_AMOUNT = 0.05 // ±5% brightness

// Tile palette — unified floor, 3D wall depth, exterior ground
export const TILE_COLORS = {
  floor: '#1a1a2e',
  floorAlt1: '#1c1c32',
  floorAlt2: '#181828',
  wallCap: '#3a3a5a',       // lighter top surface of wall (viewed from above)
  wallFront: '#1e1e36',     // darker front face (shadow side, creates depth)
  wallSide: '#2a2a4a',
  wallCorner: '#2e2e4e',
  doorway: '#1e1e34',
  hallway: '#1a1a2e',       // same as floor — unified stone
  hallwayAlt: '#1c1c32',    // same as floorAlt1
  sconce: '#ffbb44',
  sconceGlow: 'rgba(255, 187, 68, 0.15)',
  exterior: '#0a0a14',      // dark graveyard ground
} as const

// Stone dither colors for weathered texture
export const STONE_DITHER = {
  light: 'rgba(255,255,255,0.04)',
  dark: 'rgba(0,0,0,0.08)',
  crack: 'rgba(0,0,0,0.14)',
} as const

// Furniture palette
export const FURNITURE_COLORS = {
  wood: '#5a3a1a',
  woodDark: '#3d2610',
  woodLight: '#7a5a3a',
  metal: '#6a6a7a',
  metalDark: '#4a4a5a',
  metalLight: '#8a8a9a',
  crystal: '#8866cc',
  crystalGlow: '#aa88ff',
  cauldronGreen: '#44aa55',
  cauldronDark: '#2a2a2a',
  canvasBeige: '#c8b898',
  frameGold: '#c8a832',
  ivory: '#e8e0d0',
  coffin: '#3a2a1a',
  coffinLid: '#4a3a2a',
} as const
