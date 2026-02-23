'use client'

import { useRef, useCallback, useMemo, useState } from 'react'
import { useGhostData } from '@/hooks/useGhostData'
import { useAnimationLoop } from '@/hooks/useAnimationLoop'
import { drawRoom, drawGhost, drawParticles, drawTombstone, drawFog, drawCobwebs, drawDustMotes, applyFlicker } from '@/lib/renderer'
import { computeGhostState, computeGhostScale, computeGlowIntensity, formatBytes } from '@/lib/ghost-client'
import { COLORS, ROOM_WIDTH, ROOM_HEIGHT, ROOM_PADDING, ROOMS_PER_ROW, SPRITE_SCALE } from '@/lib/constants'
import type { GhostSprite, HauntGhost } from '@/lib/types'

interface TooltipInfo {
  ghost: HauntGhost
  x: number
  y: number
}

export function MansionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ghosts, error, loading } = useGhostData()
  const spriteFrameRef = useRef<Map<string, number>>(new Map())
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  const { width, height } = useMemo(() => {
    const count = Math.max(ghosts.length, 1)
    const cols = Math.min(count, ROOMS_PER_ROW)
    const rows = Math.ceil(count / ROOMS_PER_ROW)
    return {
      width: cols * (ROOM_WIDTH + ROOM_PADDING) + ROOM_PADDING,
      height: rows * (ROOM_HEIGHT + ROOM_PADDING) + ROOM_PADDING,
    }
  }, [ghosts.length])

  const maxSizeBytes = useMemo(
    () => Math.max(...ghosts.map((g) => g.sizeBytes), 1),
    [ghosts]
  )

  // Compute which room a mouse position falls in
  const getGhostAtPosition = useCallback(
    (mouseX: number, mouseY: number): HauntGhost | null => {
      for (let i = 0; i < ghosts.length; i++) {
        const col = i % ROOMS_PER_ROW
        const row = Math.floor(i / ROOMS_PER_ROW)
        const roomX = col * (ROOM_WIDTH + ROOM_PADDING) + ROOM_PADDING
        const roomY = row * (ROOM_HEIGHT + ROOM_PADDING) + ROOM_PADDING
        if (
          mouseX >= roomX && mouseX <= roomX + ROOM_WIDTH &&
          mouseY >= roomY && mouseY <= roomY + ROOM_HEIGHT
        ) {
          return ghosts[i]
        }
      }
      return null
    },
    [ghosts]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      const ghost = getGhostAtPosition(x, y)
      if (ghost) {
        setTooltip({ ghost, x: e.clientX - rect.left, y: e.clientY - rect.top })
      } else {
        setTooltip(null)
      }
    },
    [getGhostAtPosition]
  )

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const render = useCallback(
    (globalFrame: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = width
      canvas.height = height
      ctx.imageSmoothingEnabled = false

      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ghosts.forEach((ghost, i) => {
        const roomPos = drawRoom(ctx, i)

        const currentFrame = spriteFrameRef.current.get(ghost.id) ?? 0
        const state = computeGhostState(ghost.status, ghost.stats)
        const frameSpeed = state === 'active' ? 2 : state === 'sleeping' ? 0 : 1
        const nextFrame = currentFrame + (globalFrame % (state === 'sleeping' ? 60 : 15) === 0 ? frameSpeed : 0)
        spriteFrameRef.current.set(ghost.id, nextFrame)

        const scale = SPRITE_SCALE * computeGhostScale(ghost.sizeBytes, maxSizeBytes)
        const tombstoneScale = 3 * computeGhostScale(ghost.sizeBytes, maxSizeBytes)
        const tombstoneX = roomPos.centerX - 8 * tombstoneScale
        const tombstoneY = roomPos.y + ROOM_HEIGHT - 16 * tombstoneScale - 15

        const sprite: GhostSprite = {
          ghost,
          state,
          x: roomPos.centerX - 8 * scale,
          y: tombstoneY - 14 * scale,
          frame: nextFrame,
          scale: computeGhostScale(ghost.sizeBytes, maxSizeBytes),
          glowIntensity: computeGlowIntensity(ghost.stats),
        }

        drawFog(ctx, i, roomPos.x, roomPos.y, globalFrame)
        drawTombstone(ctx, tombstoneX, tombstoneY, tombstoneScale, ghost.name)
        drawGhost(ctx, sprite, globalFrame, tombstoneY)
        drawParticles(ctx, sprite, globalFrame)
        drawCobwebs(ctx, roomPos.x, roomPos.y)
        drawDustMotes(ctx, i, roomPos.x, roomPos.y, globalFrame)
      })

      applyFlicker(ctx, width, height, globalFrame)

      ctx.fillStyle = COLORS.textPrimary
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`HAUNT — ${ghosts.length} ghost${ghosts.length !== 1 ? 's' : ''}`, 10, height - 10)
    },
    [ghosts, maxSizeBytes, width, height]
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
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ imageRendering: 'pixelated', background: COLORS.background, cursor: tooltip ? 'pointer' : 'default' }}
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
    </div>
  )
}
