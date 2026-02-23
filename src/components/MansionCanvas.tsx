'use client'

import { useRef, useCallback, useMemo } from 'react'
import { useGhostData } from '@/hooks/useGhostData'
import { useAnimationLoop } from '@/hooks/useAnimationLoop'
import { drawRoom, drawGhost, drawParticles } from '@/lib/renderer'
import { computeGhostState, computeGhostScale, computeGlowIntensity } from '@/lib/ghost-client'
import { COLORS, ROOM_WIDTH, ROOM_HEIGHT, ROOM_PADDING, ROOMS_PER_ROW } from '@/lib/constants'
import type { GhostSprite } from '@/lib/types'

export function MansionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ghosts, error, loading } = useGhostData()
  const spriteFrameRef = useRef<Map<string, number>>(new Map())

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

  const render = useCallback(
    (globalFrame: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Update canvas dimensions
      canvas.width = width
      canvas.height = height

      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ghosts.forEach((ghost, i) => {
        const roomPos = drawRoom(ctx, i)

        const currentFrame = spriteFrameRef.current.get(ghost.id) ?? 0
        const state = computeGhostState(ghost.status, ghost.stats)
        const frameSpeed = state === 'active' ? 2 : state === 'sleeping' ? 0 : 1
        const nextFrame = currentFrame + (globalFrame % (state === 'sleeping' ? 60 : 15) === 0 ? frameSpeed : 0)
        spriteFrameRef.current.set(ghost.id, nextFrame)

        const sprite: GhostSprite = {
          ghost,
          state,
          x: roomPos.x,
          y: roomPos.y,
          frame: nextFrame,
          scale: computeGhostScale(ghost.sizeBytes, maxSizeBytes),
          glowIntensity: computeGlowIntensity(ghost.stats),
        }

        drawGhost(ctx, sprite, globalFrame)
        drawParticles(ctx, sprite, globalFrame)
      })

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
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ imageRendering: 'pixelated', background: COLORS.background }}
    />
  )
}
