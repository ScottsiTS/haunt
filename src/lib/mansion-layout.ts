import type { FurnitureType } from './types'

/**
 * Persistent mansion layout — saved to/loaded from JSON.
 * Stores spot assignments and furniture so designs persist across sessions.
 */
export interface MansionLayoutSpot {
  ghostId: string
  ghostName: string
  furnitureType: FurnitureType
  gridIndex: number
}

export interface MansionLayout {
  version: 2
  spots: MansionLayoutSpot[]
  updatedAt: string
}

const LAYOUT_STORAGE_KEY = 'haunt-mansion-layout'

/**
 * Save layout to localStorage (client-side persistence).
 */
export function saveLayout(layout: MansionLayout): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // localStorage might be full or unavailable
  }
}

/**
 * Load layout from localStorage.
 */
export function loadLayout(): MansionLayout | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 2) return null // discard stale v1 layouts
    return parsed as MansionLayout
  } catch {
    return null
  }
}

/**
 * Build a layout from the current mansion state for persistence.
 */
export function buildLayoutFromMansion(
  spots: Array<{ ghostId: string; ghostName: string; furnitureType: FurnitureType; index: number }>
): MansionLayout {
  return {
    version: 2,
    spots: spots.map((s) => ({
      ghostId: s.ghostId,
      ghostName: s.ghostName,
      furnitureType: s.furnitureType,
      gridIndex: s.index,
    })),
    updatedAt: new Date().toISOString(),
  }
}
