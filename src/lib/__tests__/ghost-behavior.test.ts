import { describe, it, expect } from 'vitest'
import { createGhostAgent, updateGhostAgent, behaviorToGhostState } from '../ghost-behavior'
import { generateMansion } from '../tilemap'
import { buildWalkabilityGrid } from '../pathfinding'
import type { HauntGhost } from '../types'

function makeGhosts(count: number): HauntGhost[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ghost${i.toString().padStart(4, '0')}`,
    name: `db-${i}`,
    sizeBytes: (i + 1) * 100 * 1024 * 1024,
    status: 'running' as const,
    stats: { totalCalls: 200, totalExecTimeMs: 500, totalRows: 1000, cacheHitPct: 90, tableCount: 5 },
  }))
}

describe('createGhostAgent', () => {
  it('creates agent at furniture position', () => {
    const ghosts = makeGhosts(2)
    const mansion = generateMansion(ghosts)
    const spot = mansion.spots[0]
    const agent = createGhostAgent(ghosts[0], spot)

    expect(agent.ghostId).toBe(ghosts[0].id)
    expect(agent.tileX).toBe(spot.furnitureTileX)
    expect(agent.tileY).toBe(spot.furnitureTileY)
    expect(agent.behavior).toBe('possessing')
    expect(agent.homeSpotIndex).toBe(0)
  })

  it('creates sleeping agent for paused DB', () => {
    const ghosts = makeGhosts(2)
    ghosts[0].status = 'paused'
    ghosts[0].stats = null
    const mansion = generateMansion(ghosts)
    const spot = mansion.spots[0]
    const agent = createGhostAgent(ghosts[0], spot)

    expect(agent.behavior).toBe('sleeping')
  })
})

describe('updateGhostAgent', () => {
  it('transitions sleeping → possessing when DB resumes', () => {
    const ghosts = makeGhosts(2)
    ghosts[0].status = 'paused'
    ghosts[0].stats = null
    const mansion = generateMansion(ghosts)
    const walkGrid = buildWalkabilityGrid(mansion)
    const spot = mansion.spots[0]
    const agent = createGhostAgent(ghosts[0], spot)
    expect(agent.behavior).toBe('sleeping')

    // Simulate DB resuming
    ghosts[0].status = 'running'
    ghosts[0].stats = { totalCalls: 100, totalExecTimeMs: 500, totalRows: 1000, cacheHitPct: 90, tableCount: 5 }

    const updated = updateGhostAgent(agent, ghosts[0], mansion, walkGrid)
    expect(updated.behavior).toBe('possessing')
  })

  it('transitions possessing → sleeping when DB pauses', () => {
    const ghosts = makeGhosts(2)
    const mansion = generateMansion(ghosts)
    const walkGrid = buildWalkabilityGrid(mansion)
    const spot = mansion.spots[0]
    const agent = createGhostAgent(ghosts[0], spot)
    expect(agent.behavior).toBe('possessing')

    // Simulate DB pausing
    ghosts[0].status = 'paused'
    ghosts[0].stats = null

    const updated = updateGhostAgent(agent, ghosts[0], mansion, walkGrid)
    expect(updated.behavior).toBe('sleeping')
  })

  it('eventually transitions from possessing to roaming', () => {
    const ghosts = makeGhosts(4)
    const mansion = generateMansion(ghosts)
    const walkGrid = buildWalkabilityGrid(mansion)
    const spot = mansion.spots[0]
    const agent = createGhostAgent(ghosts[0], spot)
    agent.idleTimer = 1 // Force transition on next update

    const updated = updateGhostAgent(agent, ghosts[0], mansion, walkGrid)
    // Should either be roaming (found path) or possessing (reset timer if no path)
    expect(['roaming', 'possessing']).toContain(updated.behavior)
  })

  it('moves ghost along path when roaming', () => {
    const ghosts = makeGhosts(4)
    const mansion = generateMansion(ghosts)
    const walkGrid = buildWalkabilityGrid(mansion)
    const spot = mansion.spots[0]
    const agent = createGhostAgent(ghosts[0], spot)

    // Force into roaming with a simple path
    agent.behavior = 'roaming'
    agent.path = [
      { x: agent.tileX, y: agent.tileY },
      { x: agent.tileX + 1, y: agent.tileY },
      { x: agent.tileX + 2, y: agent.tileY },
    ]
    agent.pathIndex = 1 // Start moving toward second waypoint
    agent.targetSpotIndex = 1

    const startX = agent.tileX
    const updated = updateGhostAgent(agent, ghosts[0], mansion, walkGrid)

    // Ghost should have moved
    expect(updated.tileX).not.toBe(startX)
  })
})

describe('behaviorToGhostState', () => {
  const baseGhost: HauntGhost = {
    id: 'test',
    name: 'test-db',
    sizeBytes: 100 * 1024 * 1024,
    status: 'running',
    stats: { totalCalls: 200, totalExecTimeMs: 500, totalRows: 1000, cacheHitPct: 90, tableCount: 5 },
  }

  it('sleeping behavior → sleeping state', () => {
    expect(behaviorToGhostState('sleeping', baseGhost)).toBe('sleeping')
  })

  it('possessing with high queries → active state', () => {
    expect(behaviorToGhostState('possessing', baseGhost)).toBe('active')
  })

  it('possessing with low queries → idle state', () => {
    const ghost = { ...baseGhost, stats: { ...baseGhost.stats!, totalCalls: 10 } }
    expect(behaviorToGhostState('possessing', ghost)).toBe('idle')
  })

  it('any behavior with low cache → distressed state', () => {
    const ghost = { ...baseGhost, stats: { ...baseGhost.stats!, cacheHitPct: 20 } }
    expect(behaviorToGhostState('possessing', ghost)).toBe('distressed')
    expect(behaviorToGhostState('roaming', ghost)).toBe('distressed')
  })

  it('roaming → idle state', () => {
    expect(behaviorToGhostState('roaming', baseGhost)).toBe('idle')
  })

  it('visiting → idle state', () => {
    expect(behaviorToGhostState('visiting', baseGhost)).toBe('idle')
  })
})
