import { bfsPath, buildWalkabilityGrid } from './pathfinding'
import type { TileCoord } from './pathfinding'
import type { MansionMap, GhostSpot, HauntGhost } from './types'

/**
 * Ghost behavior modes (Pixel Agents-style):
 * - possessing: At own furniture, glowing/pulsing when DB is active
 * - roaming: Floating across the open floor toward another ghost's spot
 * - visiting: Idling near another ghost's spot
 * - sleeping: Sunk behind furniture, DB is paused
 */
export type GhostBehavior = 'possessing' | 'roaming' | 'visiting' | 'sleeping'

export interface GhostAgent {
  ghostId: string
  behavior: GhostBehavior
  // Current position in tile coords (fractional for smooth movement)
  tileX: number
  tileY: number
  // Path to follow (tile coords)
  path: TileCoord[]
  pathIndex: number
  // Which spot index the ghost belongs to / is heading to
  homeSpotIndex: number
  targetSpotIndex: number
  // Timers (in frames)
  idleTimer: number     // how long to idle/possess before roaming
  visitTimer: number    // how long to visit before returning home
}

// Movement speed in tiles per frame (at 8fps, 0.12 = ~1 tile/sec)
const GHOST_SPEED = 0.12
// How long to possess before possibly roaming (frames)
const MIN_POSSESS_TIME = 80
const MAX_POSSESS_TIME = 240
// How long to visit another spot (frames)
const MIN_VISIT_TIME = 40
const MAX_VISIT_TIME = 120

/**
 * Initialize a ghost agent at its home spot's furniture.
 */
export function createGhostAgent(
  ghost: HauntGhost,
  spot: GhostSpot
): GhostAgent {
  const isSleeping = ghost.status === 'paused'
  return {
    ghostId: ghost.id,
    behavior: isSleeping ? 'sleeping' : 'possessing',
    tileX: spot.furnitureTileX,
    tileY: spot.furnitureTileY,
    path: [],
    pathIndex: 0,
    homeSpotIndex: spot.index,
    targetSpotIndex: spot.index,
    idleTimer: randomBetween(MIN_POSSESS_TIME, MAX_POSSESS_TIME),
    visitTimer: 0,
  }
}

/**
 * Advance one frame of ghost behavior.
 * Returns the updated agent (mutates in place for performance).
 */
export function updateGhostAgent(
  agent: GhostAgent,
  ghost: HauntGhost,
  mansion: MansionMap,
  walkGrid: boolean[][]
): GhostAgent {
  // If DB just got paused, go to sleep
  if (ghost.status === 'paused' && agent.behavior !== 'sleeping') {
    agent.behavior = 'sleeping'
    agent.path = []
    agent.pathIndex = 0
    // Navigate home first if not already there
    const homeSpot = mansion.spots[agent.homeSpotIndex]
    if (homeSpot) {
      agent.tileX = homeSpot.furnitureTileX
      agent.tileY = homeSpot.furnitureTileY
    }
    return agent
  }

  // If DB just resumed from paused, wake up
  if (ghost.status === 'running' && agent.behavior === 'sleeping') {
    agent.behavior = 'possessing'
    agent.idleTimer = randomBetween(MIN_POSSESS_TIME, MAX_POSSESS_TIME)
    return agent
  }

  switch (agent.behavior) {
    case 'sleeping':
      // Do nothing, ghost stays at furniture
      break

    case 'possessing':
      // At home furniture. Count down, then maybe roam.
      agent.idleTimer--
      if (agent.idleTimer <= 0 && mansion.spots.length > 1) {
        // Pick a random other spot to visit
        const otherSpots = mansion.spots.filter(s => s.index !== agent.homeSpotIndex)
        if (otherSpots.length > 0) {
          const target = otherSpots[Math.floor(Math.random() * otherSpots.length)]
          const homeSpot = mansion.spots[agent.homeSpotIndex]

          // Build path from home to target
          const path = buildSpotToSpotPath(homeSpot, target, walkGrid)
          if (path && path.length > 1) {
            agent.behavior = 'roaming'
            agent.targetSpotIndex = target.index
            agent.path = path
            agent.pathIndex = 0
          } else {
            // Can't pathfind, reset timer
            agent.idleTimer = randomBetween(MIN_POSSESS_TIME, MAX_POSSESS_TIME)
          }
        }
      }
      break

    case 'roaming':
      // Follow path tile by tile
      if (agent.pathIndex < agent.path.length) {
        const target = agent.path[agent.pathIndex]
        const dx = target.x - agent.tileX
        const dy = target.y - agent.tileY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < GHOST_SPEED) {
          // Arrived at this waypoint
          agent.tileX = target.x
          agent.tileY = target.y
          agent.pathIndex++
        } else {
          // Move toward waypoint
          agent.tileX += (dx / dist) * GHOST_SPEED
          agent.tileY += (dy / dist) * GHOST_SPEED
        }
      }

      // Reached end of path
      if (agent.pathIndex >= agent.path.length) {
        if (agent.targetSpotIndex === agent.homeSpotIndex) {
          // Returned home
          agent.behavior = 'possessing'
          agent.idleTimer = randomBetween(MIN_POSSESS_TIME, MAX_POSSESS_TIME)
          // Snap to furniture
          const homeSpot = mansion.spots[agent.homeSpotIndex]
          if (homeSpot) {
            agent.tileX = homeSpot.furnitureTileX
            agent.tileY = homeSpot.furnitureTileY
          }
        } else {
          // Arrived at visit target
          agent.behavior = 'visiting'
          agent.visitTimer = randomBetween(MIN_VISIT_TIME, MAX_VISIT_TIME)
        }
        agent.path = []
        agent.pathIndex = 0
      }
      break

    case 'visiting':
      // Idle near another ghost's spot, then head home
      agent.visitTimer--
      if (agent.visitTimer <= 0) {
        const currentSpot = mansion.spots[agent.targetSpotIndex]
        const homeSpot = mansion.spots[agent.homeSpotIndex]

        const path = buildSpotToSpotPath(currentSpot, homeSpot, walkGrid)
        if (path && path.length > 1) {
          agent.behavior = 'roaming'
          agent.targetSpotIndex = agent.homeSpotIndex
          agent.path = path
          agent.pathIndex = 0
        } else {
          // Can't pathfind home, just teleport
          agent.behavior = 'possessing'
          agent.tileX = homeSpot.furnitureTileX
          agent.tileY = homeSpot.furnitureTileY
          agent.idleTimer = randomBetween(MIN_POSSESS_TIME, MAX_POSSESS_TIME)
        }
      }
      break
  }

  return agent
}

/**
 * Build a path from one ghost spot to another across the open floor.
 * No doorway waypoints needed — it's all open space.
 */
function buildSpotToSpotPath(
  from: GhostSpot,
  to: GhostSpot,
  walkGrid: boolean[][]
): TileCoord[] | null {
  const start: TileCoord = { x: from.furnitureTileX, y: from.furnitureTileY }
  const goal: TileCoord = { x: to.tileX, y: to.tileY }

  return bfsPath(walkGrid, start, goal)
}

/**
 * Map GhostBehavior to the visual GhostState for rendering.
 */
export function behaviorToGhostState(
  behavior: GhostBehavior,
  ghost: HauntGhost
): 'idle' | 'active' | 'sleeping' | 'distressed' {
  if (behavior === 'sleeping') return 'sleeping'

  // Check distress regardless of behavior
  if (ghost.stats && ghost.stats.cacheHitPct < 50) return 'distressed'

  if (behavior === 'possessing') {
    // Active if DB has significant queries
    if (ghost.stats && ghost.stats.totalCalls > 100) return 'active'
    return 'idle'
  }

  if (behavior === 'roaming') return 'idle' // floating across floor
  if (behavior === 'visiting') return 'idle' // idling near another ghost

  return 'idle'
}

function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min))
}
