'use client'

import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { useGhostData } from '@/hooks/useGhostData'
import { useAnimationLoop } from '@/hooks/useAnimationLoop'
import {
  drawTileLayer,
  drawGhost,
  drawParticles,
  drawMansionFog,
  drawMansionDust,
  applyFlicker,
  drawVignette,
} from '@/lib/renderer'
import { drawFurniture, getFurnitureBottomY } from '@/lib/furniture'
import { computeGhostScale, computeGlowIntensity, formatBytes } from '@/lib/ghost-client'
import { COLORS, TILE_RENDERED, SPRITE_SCALE } from '@/lib/constants'
import { generateMansion } from '@/lib/tilemap'
import { buildWalkabilityGrid } from '@/lib/pathfinding'
import { createGhostAgent, updateGhostAgent, behaviorToGhostState } from '@/lib/ghost-behavior'
import { saveLayout, buildLayoutFromMansion } from '@/lib/mansion-layout'
import type { GhostAgent } from '@/lib/ghost-behavior'
import type { GhostSprite, HauntGhost } from '@/lib/types'
import { GhostDex } from './GhostDex'

interface TooltipInfo {
  ghost: HauntGhost
  x: number
  y: number
}

export function MansionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { ghosts, error, loading } = useGhostData()
  const spriteFrameRef = useRef<Map<string, number>>(new Map())
  const agentsRef = useRef<Map<string, GhostAgent>>(new Map())
  const tileCacheRef = useRef<OffscreenCanvas | null>(null)
  const tileCacheKeyRef = useRef<string>('')
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [selectedGhost, setSelectedGhost] = useState<HauntGhost | null>(null)
  const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 })

  // Track viewport size for zoom-to-fit
  useEffect(() => {
    const update = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Generate mansion layout from ghost list
  const mansion = useMemo(() => generateMansion(ghosts), [ghosts])
  const walkGrid = useMemo(() => buildWalkabilityGrid(mansion), [mansion])

  // Persist layout to localStorage whenever mansion changes
  useEffect(() => {
    if (mansion.spots.length > 0) {
      saveLayout(buildLayoutFromMansion(mansion.spots))
    }
  }, [mansion])

  const canvasWidth = mansion.width * TILE_RENDERED
  const canvasHeight = mansion.height * TILE_RENDERED

  // Zoom-to-fit: scale canvas to fill viewport with padding
  const padding = 40
  const zoomScale = useMemo(() => {
    if (canvasWidth === 0 || canvasHeight === 0) return 1
    const scaleX = (viewportSize.w - padding * 2) / canvasWidth
    const scaleY = (viewportSize.h - padding * 2) / canvasHeight
    return Math.min(scaleX, scaleY, 2) // cap at 2x to prevent huge scaling for small mansions
  }, [canvasWidth, canvasHeight, viewportSize])

  const maxSizeBytes = useMemo(
    () => Math.max(...ghosts.map((g) => g.sizeBytes), 1),
    [ghosts]
  )

  const ghostById = useMemo(() => {
    const map = new Map<string, HauntGhost>()
    for (const g of ghosts) map.set(g.id, g)
    return map
  }, [ghosts])

  // Initialize ghost agents when ghosts/mansion change
  useEffect(() => {
    const agents = agentsRef.current
    const currentIds = new Set(ghosts.map(g => g.id))

    // Remove agents for ghosts that no longer exist
    for (const id of agents.keys()) {
      if (!currentIds.has(id)) agents.delete(id)
    }

    // Create agents for new ghosts
    for (const spot of mansion.spots) {
      const ghost = ghostById.get(spot.ghostId)
      if (ghost && !agents.has(ghost.id)) {
        agents.set(ghost.id, createGhostAgent(ghost, spot))
      }
    }
  }, [ghosts, mansion, ghostById])

  // Tooltip: find closest ghost by pixel proximity to actual agent position
  const getGhostAtPosition = useCallback(
    (mouseX: number, mouseY: number): HauntGhost | null => {
      const agents = agentsRef.current
      let closest: HauntGhost | null = null
      let closestDist = Infinity
      const threshold = TILE_RENDERED * 4 // generous hitbox for larger sprites

      for (const [ghostId, agent] of agents) {
        const ghost = ghostById.get(ghostId)
        if (!ghost) continue
        const ghostScale = computeGhostScale(ghost.sizeBytes, Math.max(...ghosts.map(g => g.sizeBytes), 1))
        const scale = SPRITE_SCALE * ghostScale
        // Center of the ghost sprite at its current agent position
        const cx = agent.tileX * TILE_RENDERED + TILE_RENDERED / 2
        const cy = agent.tileY * TILE_RENDERED - 14 * scale + 8 * scale
        const dx = mouseX - cx
        const dy = mouseY - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < closestDist && dist <= threshold) {
          closestDist = dist
          closest = ghost
        }
      }
      return closest
    },
    [ghostById, ghosts]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      // Convert screen coords → canvas coords accounting for CSS scale
      const canvasX = (e.clientX - rect.left) / zoomScale
      const canvasY = (e.clientY - rect.top) / zoomScale
      const ghost = getGhostAtPosition(canvasX, canvasY)
      if (ghost) {
        setTooltip({ ghost, x: e.clientX - rect.left, y: e.clientY - rect.top })
      } else {
        setTooltip(null)
      }
    },
    [getGhostAtPosition, zoomScale]
  )

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const canvasX = (e.clientX - rect.left) / zoomScale
      const canvasY = (e.clientY - rect.top) / zoomScale
      const ghost = getGhostAtPosition(canvasX, canvasY)
      if (ghost) {
        setSelectedGhost(ghost)
        setTooltip(null)
      } else {
        setSelectedGhost(null)
      }
    },
    [getGhostAtPosition, zoomScale]
  )

  const render = useCallback(
    (globalFrame: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = canvasWidth
      canvas.height = canvasHeight
      ctx.imageSmoothingEnabled = false

      // Background
      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // 1. Tile layer (cached for performance)
      const cacheKey = `${mansion.width}x${mansion.height}x${mansion.spots.length}`
      if (tileCacheKeyRef.current !== cacheKey || !tileCacheRef.current) {
        tileCacheRef.current = new OffscreenCanvas(canvasWidth, canvasHeight)
        const tileCtx = tileCacheRef.current.getContext('2d') as unknown as CanvasRenderingContext2D | null
        if (tileCtx) {
          tileCtx.imageSmoothingEnabled = false
          drawTileLayer(tileCtx, mansion)
        }
        tileCacheKeyRef.current = cacheKey
      }
      ctx.drawImage(tileCacheRef.current, 0, 0)

      // 2. Fog (3-layer parallax)
      drawMansionFog(ctx, canvasWidth, canvasHeight, globalFrame)

      // 3. Collect all drawable entities for Y-sorting
      type DrawEntity =
        | { kind: 'furniture'; sortY: number; spot: typeof mansion.spots[0] }
        | { kind: 'ghost'; sortY: number; sprite: GhostSprite; furniturePxY: number }

      const entities: DrawEntity[] = []

      // Add furniture entities
      for (const spot of mansion.spots) {
        const fpx = spot.furnitureTileX * TILE_RENDERED
        const fpy = spot.furnitureTileY * TILE_RENDERED
        entities.push({
          kind: 'furniture',
          sortY: getFurnitureBottomY(fpy, TILE_RENDERED),
          spot,
        })
      }

      // Update ghost agents and add ghost entities
      const agents = agentsRef.current
      for (const spot of mansion.spots) {
        const ghost = ghostById.get(spot.ghostId)
        if (!ghost) continue

        let agent = agents.get(ghost.id)
        if (!agent) continue

        // Update behavior state machine
        agent = updateGhostAgent(agent, ghost, mansion, walkGrid)
        agents.set(ghost.id, agent)

        // Update sprite frame counter
        const state = behaviorToGhostState(agent.behavior, ghost)
        const currentFrame = spriteFrameRef.current.get(ghost.id) ?? 0
        const frameSpeed = state === 'active' ? 2 : state === 'sleeping' ? 0 : 1
        const nextFrame = currentFrame + (globalFrame % (state === 'sleeping' ? 60 : 15) === 0 ? frameSpeed : 0)
        spriteFrameRef.current.set(ghost.id, nextFrame)

        // Convert tile position to pixel position
        const ghostScale = computeGhostScale(ghost.sizeBytes, maxSizeBytes)
        const scale = SPRITE_SCALE * ghostScale
        const ghostPxX = agent.tileX * TILE_RENDERED - 8 * scale + TILE_RENDERED / 2
        const ghostPxY = agent.tileY * TILE_RENDERED - 14 * scale
        const furniturePxY = spot.furnitureTileY * TILE_RENDERED

        const sprite: GhostSprite = {
          ghost,
          state,
          x: ghostPxX,
          y: ghostPxY,
          frame: nextFrame,
          scale: ghostScale,
          glowIntensity: computeGlowIntensity(ghost.stats),
          highlighted: tooltip?.ghost.id === ghost.id,
        }

        // Sort ghosts by the bottom of their sprite (Y + full height)
        const ghostBottomY = ghostPxY + 16 * scale
        entities.push({
          kind: 'ghost',
          sortY: ghostBottomY,
          sprite,
          furniturePxY,
        })
      }

      // 4. Y-sort: lower sortY (further from camera) draws first
      entities.sort((a, b) => a.sortY - b.sortY)

      // Track ghost states per spot for furniture isActive and light map
      const ghostStateBySpotId = new Map<string, string>()
      for (const entity of entities) {
        if (entity.kind === 'ghost') {
          ghostStateBySpotId.set(entity.sprite.ghost.id, entity.sprite.state)
        }
      }

      // 5. Draw all entities in sorted order
      for (const entity of entities) {
        if (entity.kind === 'furniture') {
          const fpx = entity.spot.furnitureTileX * TILE_RENDERED
          const fpy = entity.spot.furnitureTileY * TILE_RENDERED
          const ghostState = ghostStateBySpotId.get(entity.spot.ghostId)
          const isActive = ghostState === 'active'
          drawFurniture(ctx, entity.spot.furnitureType, fpx, fpy, TILE_RENDERED, globalFrame, isActive)
        } else {
          drawGhost(ctx, entity.sprite, globalFrame, entity.furniturePxY)
          drawParticles(ctx, entity.sprite, globalFrame)
        }
      }

      // 6. Dust
      drawMansionDust(ctx, canvasWidth, canvasHeight, globalFrame)

      // 8. Flicker
      applyFlicker(ctx, canvasWidth, canvasHeight, globalFrame)

      // 9. Vignette
      drawVignette(ctx, canvasWidth, canvasHeight)

      // Status bar
      ctx.fillStyle = COLORS.textPrimary
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`HAUNT — ${ghosts.length} ghost${ghosts.length !== 1 ? 's' : ''} — open floor`, 10, canvasHeight - 10)
    },
    [ghosts, ghostById, mansion, walkGrid, maxSizeBytes, canvasWidth, canvasHeight, tooltip]
  )

  useAnimationLoop(render)

  if (loading) {
    return (
      <div style={{ color: COLORS.textPrimary, fontFamily: 'monospace', padding: 40 }}>
        Summoning ghosts...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ color: COLORS.ghostDistressed, fontFamily: 'monospace', padding: 40 }}>
        Failed to connect to Ghost: {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: canvasWidth * zoomScale,
        height: canvasHeight * zoomScale,
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          imageRendering: 'pixelated',
          background: COLORS.background,
          cursor: tooltip ? 'pointer' : 'default',
          width: canvasWidth * zoomScale,
          height: canvasHeight * zoomScale,
        }}
      />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 16,
            top: tooltip.y - 10,
            background: '#1a1a2eee',
            border: '1px solid #2a2a4a',
            borderRadius: 4,
            padding: '10px 14px',
            fontFamily: 'monospace',
            fontSize: 12,
            color: COLORS.textPrimary,
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 180,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: '#fff' }}>
            {tooltip.ghost.name}
          </div>
          <div style={{ color: COLORS.textSecondary }}>
            Status: <span style={{ color: tooltip.ghost.status === 'running' ? '#a8ff78' : '#636e72' }}>
              {tooltip.ghost.status}
            </span>
          </div>
          <div style={{ color: COLORS.textSecondary }}>
            Size: {formatBytes(tooltip.ghost.sizeBytes)}
          </div>
          {tooltip.ghost.stats ? (
            <>
              <div style={{ color: COLORS.textSecondary }}>
                Tables: {tooltip.ghost.stats.tableCount}
              </div>
              <div style={{ color: COLORS.textSecondary }}>
                Queries: {tooltip.ghost.stats.totalCalls.toLocaleString()}
              </div>
              <div style={{ color: COLORS.textSecondary }}>
                Exec time: {(tooltip.ghost.stats.totalExecTimeMs / 1000).toFixed(1)}s
              </div>
              <div style={{ color: COLORS.textSecondary }}>
                Rows: {tooltip.ghost.stats.totalRows.toLocaleString()}
              </div>
              <div style={{ color: COLORS.textSecondary }}>
                Cache hit: <span style={{ color: tooltip.ghost.stats.cacheHitPct > 80 ? '#a8ff78' : tooltip.ghost.stats.cacheHitPct > 50 ? '#ffeaa7' : '#ff6b6b' }}>
                  {tooltip.ghost.stats.cacheHitPct}%
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: '#636e72', fontStyle: 'italic', marginTop: 4 }}>
              No stats (paused)
            </div>
          )}
        </div>
      )}
      {selectedGhost && (
        <GhostDex
          ghost={ghostById.get(selectedGhost.id) ?? selectedGhost}
          onClose={() => setSelectedGhost(null)}
        />
      )}
      {/* Usage bar */}
      <UsageBanner ghosts={ghosts} />
    </div>
  )
}

// Free tier limits
const FREE_STORAGE_GB = 1024 // 1 TB
const FREE_COMPUTE_HOURS = 100

function UsageBanner({ ghosts }: { ghosts: HauntGhost[] }) {
  const totalStorageBytes = ghosts.reduce((sum, g) => sum + g.sizeBytes, 0)
  const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024)
  const storagePct = Math.min(100, (totalStorageGB / FREE_STORAGE_GB) * 100)

  const runningCount = ghosts.filter(g => g.status === 'running').length
  // Compute hours aren't available from the API — show as unknown
  const computeHoursUsed: number | null = null
  const computePct = 0

  const barStyle = (pct: number, color: string): React.CSSProperties => ({
    height: 4,
    background: '#1e1e30',
    borderRadius: 2,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  })

  const fillColor = (pct: number) => pct > 80 ? '#ff6b6b' : pct > 60 ? '#ffeaa7' : '#54b87c'

  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      left: 16,
      zIndex: 100,
      background: 'rgba(13, 13, 24, 0.9)',
      border: '1px solid #1e1e30',
      borderRadius: 8,
      padding: '10px 16px',
      fontFamily: 'monospace',
      fontSize: 10,
      color: '#6a6a8a',
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Storage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
        <span style={{ color: '#8a94a0' }}>Storage</span>
        <div style={barStyle(storagePct, '')}>
          <div style={{ width: `${storagePct}%`, height: '100%', background: fillColor(storagePct), borderRadius: 2, transition: 'width 0.5s' }} />
        </div>
        <span style={{ color: '#fff', whiteSpace: 'nowrap' }}>
          {totalStorageGB.toFixed(1)}<span style={{ color: '#6a6a8a' }}>/{FREE_STORAGE_GB} GB</span>
        </span>
      </div>

      {/* Compute */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
        <span style={{ color: '#8a94a0' }}>Compute</span>
        <div style={barStyle(computePct, '')}>
          <div style={{ width: `${computePct}%`, height: '100%', background: fillColor(computePct), borderRadius: 2, transition: 'width 0.5s' }} />
        </div>
        <span style={{ color: '#fff', whiteSpace: 'nowrap' }}>
          {computeHoursUsed !== null ? computeHoursUsed : '—'}<span style={{ color: '#6a6a8a' }}>/{FREE_COMPUTE_HOURS} hrs</span>
        </span>
      </div>

      {/* Service count */}
      <span style={{ color: '#8a94a0' }}>
        {runningCount}<span style={{ color: '#4a4a6a' }}>/{ghosts.length}</span> running
      </span>
    </div>
  )
}
