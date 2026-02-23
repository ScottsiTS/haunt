import { SPRITE_SCALE, BOB_AMPLITUDE, COLORS, ROOM_WIDTH, ROOM_HEIGHT, ROOM_PADDING, ROOMS_PER_ROW } from './constants'
import { getGhostFrame } from './sprites'
import type { GhostSprite } from './types'

export function spriteColorMap(value: number, bodyColor: string): string {
  switch (value) {
    case 0: return 'transparent'
    case 1: return '#111122'
    case 2: return bodyColor
    case 3: return '#2d3436'
    case 4: return '#636e72'
    case 5: return lightenColor(bodyColor, 0.3)
    default: return bodyColor
  }
}

function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount))
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount))
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
  return `rgb(${r},${g},${b})`
}

export function computeBobOffset(frame: number, amplitude: number): number {
  return Math.sin((frame / 30) * Math.PI * 2) * amplitude
}

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  sprite: GhostSprite,
  globalFrame: number
) {
  const frame = getGhostFrame(sprite.state, sprite.frame)
  const scale = SPRITE_SCALE * sprite.scale

  // Compute bob offset based on state
  let bobOffset = 0
  if (sprite.state === 'active') {
    bobOffset = computeBobOffset(globalFrame * 2, BOB_AMPLITUDE)
  } else if (sprite.state === 'idle') {
    bobOffset = computeBobOffset(globalFrame, BOB_AMPLITUDE)
  } else if (sprite.state === 'distressed') {
    bobOffset = (globalFrame % 2 === 0 ? 2 : -2)
  }

  const drawX = sprite.x
  const drawY = sprite.y + bobOffset

  // Draw glow behind ghost
  if (sprite.glowIntensity > 0) {
    const glowRadius = 40 * sprite.scale * sprite.glowIntensity
    const gradient = ctx.createRadialGradient(
      drawX + (8 * scale), drawY + (8 * scale), 0,
      drawX + (8 * scale), drawY + (8 * scale), glowRadius
    )
    const glowColor = sprite.state === 'distressed' ? COLORS.ghostDistressed : COLORS.ghostGlow
    gradient.addColorStop(0, glowColor + '44')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(drawX - glowRadius, drawY - glowRadius, 16 * scale + glowRadius * 2, 16 * scale + glowRadius * 2)
  }

  // Determine body color
  let bodyColor = COLORS.ghostDefault
  if (sprite.state === 'sleeping') bodyColor = COLORS.ghostSleeping
  if (sprite.state === 'distressed') bodyColor = COLORS.ghostDistressed
  if (sprite.state === 'active') bodyColor = mixColor(COLORS.ghostDefault, COLORS.ghostGlow, sprite.glowIntensity)

  // Draw sprite pixel by pixel
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const color = spriteColorMap(frame[y][x], bodyColor)
      if (color === 'transparent') continue
      ctx.fillStyle = color
      ctx.fillRect(drawX + x * scale, drawY + y * scale, scale, scale)
    }
  }

  // Draw name above ghost
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = `${10 * sprite.scale}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(sprite.ghost.name, drawX + 8 * scale, drawY - 8)

  // Draw table count badge
  if (sprite.ghost.stats) {
    const badgeText = `${sprite.ghost.stats.tableCount} tables`
    ctx.fillStyle = COLORS.badgeBg
    const textWidth = ctx.measureText(badgeText).width
    ctx.fillRect(drawX + 8 * scale - textWidth / 2 - 4, drawY + 17 * scale, textWidth + 8, 14)
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = '10px monospace'
    ctx.fillText(badgeText, drawX + 8 * scale, drawY + 17 * scale + 11)
  }
}

function mixColor(base: string, target: string, amount: number): string {
  if (amount <= 0) return base
  if (amount >= 1) return target
  const b = hexToRgb(base)
  const t = hexToRgb(target)
  if (!b || !t) return base
  const r = Math.round(b.r + (t.r - b.r) * amount)
  const g = Math.round(b.g + (t.g - b.g) * amount)
  const bl = Math.round(b.b + (t.b - b.b) * amount)
  return `rgb(${r},${g},${bl})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return null
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
}

export function drawRoom(ctx: CanvasRenderingContext2D, roomIndex: number) {
  const col = roomIndex % ROOMS_PER_ROW
  const row = Math.floor(roomIndex / ROOMS_PER_ROW)
  const x = col * (ROOM_WIDTH + ROOM_PADDING) + ROOM_PADDING
  const y = row * (ROOM_HEIGHT + ROOM_PADDING) + ROOM_PADDING

  // Floor
  ctx.fillStyle = COLORS.roomFloor
  ctx.fillRect(x, y, ROOM_WIDTH, ROOM_HEIGHT)

  // Walls
  ctx.strokeStyle = COLORS.wallTrim
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, ROOM_WIDTH, ROOM_HEIGHT)

  // Wall top trim
  ctx.fillStyle = COLORS.roomWall
  ctx.fillRect(x, y, ROOM_WIDTH, 20)

  // Candles
  drawCandle(ctx, x + 15, y + 12)
  drawCandle(ctx, x + ROOM_WIDTH - 25, y + 12)

  return { x: x + ROOM_WIDTH / 2 - 32, y: y + 40 }
}

function drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#dfe6e9'
  ctx.fillRect(x, y + 4, 4, 8)

  const flicker = Math.random() * 2 - 1
  ctx.fillStyle = COLORS.candleFlame
  ctx.fillRect(x + flicker, y, 4, 4)

  const gradient = ctx.createRadialGradient(x + 2, y + 2, 0, x + 2, y + 2, 15)
  gradient.addColorStop(0, COLORS.candleGlow)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(x - 13, y - 13, 30, 30)
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  sprite: GhostSprite,
  globalFrame: number
) {
  const cx = sprite.x + 8 * SPRITE_SCALE * sprite.scale
  const cy = sprite.y

  if (sprite.state === 'sleeping') {
    const zOffset = (globalFrame % 60) / 60
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = `${12 + zOffset * 8}px monospace`
    ctx.globalAlpha = 1 - zOffset
    ctx.fillText('z', cx + 30 + zOffset * 10, cy - 10 - zOffset * 20)
    ctx.font = `${8 + zOffset * 6}px monospace`
    ctx.fillText('z', cx + 20 + zOffset * 8, cy - zOffset * 15)
    ctx.globalAlpha = 1
  }

  if (sprite.state === 'active') {
    for (let i = 0; i < 3; i++) {
      const angle = ((globalFrame * 3 + i * 120) % 360) * (Math.PI / 180)
      const radius = 35 * sprite.scale
      const px = cx + Math.cos(angle) * radius
      const py = cy + 32 + Math.sin(angle) * radius
      ctx.fillStyle = COLORS.particle
      ctx.globalAlpha = 0.6 + Math.sin(globalFrame * 0.2 + i) * 0.4
      ctx.fillRect(px - 1, py - 1, 3, 3)
    }
    ctx.globalAlpha = 1
  }

  if (sprite.state === 'distressed') {
    const dropY = cy + 8 + (globalFrame % 20)
    ctx.fillStyle = '#74b9ff'
    ctx.globalAlpha = 1 - (globalFrame % 20) / 20
    ctx.fillRect(cx + 28, dropY, 3, 5)
    ctx.fillRect(cx - 12, dropY + 5, 3, 5)
    ctx.globalAlpha = 1
  }
}
