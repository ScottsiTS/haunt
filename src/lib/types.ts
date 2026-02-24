// Raw data from Ghost MCP
export interface GhostDatabase {
  id: string
  name: string
  size: string // e.g. "339MB"
  status: 'running' | 'paused' | 'creating' | 'error'
}

// Stats we compute per-database
export interface DatabaseStats {
  totalCalls: number
  totalExecTimeMs: number
  totalRows: number
  cacheHitPct: number
  tableCount: number
}

// Merged data for the frontend
export interface HauntGhost {
  id: string
  name: string
  sizeBytes: number
  status: GhostDatabase['status']
  stats: DatabaseStats | null // null if paused or unreachable
}

// Ghost sprite visual state
export type GhostState = 'idle' | 'active' | 'sleeping' | 'distressed'

// Canvas ghost with rendering info
export interface GhostSprite {
  ghost: HauntGhost
  state: GhostState
  x: number
  y: number
  frame: number
  scale: number // 0.5-2.0 based on relative size
  glowIntensity: number // 0-1 based on query activity
  highlighted?: boolean // true when mouse is hovering
}

// Tile types for the mansion floor plan
export enum TileType {
  Empty = 0,
  Floor = 1,
  FloorAlt1 = 2,
  FloorAlt2 = 3,
  WallTop = 4,       // lighter cap (top surface of wall, viewed from above)
  WallBottom = 5,
  WallLeft = 6,
  WallRight = 7,
  WallCornerTL = 8,
  WallCornerTR = 9,
  WallCornerBL = 10,
  WallCornerBR = 11,
  Doorway = 12,
  Hallway = 13,
  HallwayAlt = 14,
  Sconce = 15,
  WallFront = 16,    // darker front face (creates 3D depth below cap)
  Exterior = 17,     // graveyard ground outside the mansion
}

// Furniture types assigned to each database
export enum FurnitureType {
  GrandfatherClock = 0,
  CrystalBall = 1,
  SuitOfArmor = 2,
  Cauldron = 3,
  HauntedPainting = 4,
  Bookshelf = 5,
  Coffin = 6,
  Piano = 7,
}

// A single ghost spot on the open floor
export interface GhostSpot {
  index: number
  ghostId: string
  ghostName: string
  // Center position in tile coordinates
  tileX: number
  tileY: number
  // Furniture placement (absolute tile coords)
  furnitureType: FurnitureType
  furnitureTileX: number
  furnitureTileY: number
}

// The full mansion map
export interface MansionMap {
  width: number  // total tiles wide
  height: number // total tiles tall
  tiles: TileType[][]
  spots: GhostSpot[]
}
