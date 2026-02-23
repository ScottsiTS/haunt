import { SPRITE_SCALE, BOB_AMPLITUDE, COLORS, ROOM_WIDTH, ROOM_HEIGHT, ROOM_PADDING, ROOMS_PER_ROW, FOG_CLOUD_COUNT, FOG_SPEED, FOG_OPACITY, DUST_MOTE_COUNT, DUST_OPACITY_MIN, DUST_OPACITY_MAX, FLICKER_SPEED, FLICKER_AMOUNT, TOMBSTONE_COLORS } from './constants'
import { getGhostFrame, TOMBSTONE_SPRITE, COBWEB_SPRITE } from './sprites'
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

function tombstoneColorMap(value: number): string {
  switch (value) {
    case 0: return 'transparent'
    case 1: return TOMBSTONE_COLORS.outline
    case 6: return TOMBSTONE_COLORS.body
    case 7: return TOMBSTONE_COLORS.highlight
    case 8: return TOMBSTONE_COLORS.dark
    default: return 'transparent'
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

// --- TOMBSTONE ---

export function drawTombstone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  dbName: string
) {
  // Draw tombstone pixel by pixel
  for (let py = 0; py < 16; py++) {
    for (let px = 0; px < 16; px++) {
      const color = tombstoneColorMap(TOMBSTONE_SPRITE[py][px])
      if (color === 'transparent') continue
      ctx.fillStyle = color
      ctx.fillRect(x + px * scale, y + py * scale, scale, scale)
    }
  }

  // Engrave DB name on the tombstone (tiny pixel font)
  ctx.fillStyle = TOMBSTONE_COLORS.engraving
  ctx.font = `${Math.max(5 * (scale / 3), 7)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Draw name in the middle area of the tombstone (rows 5-8 area)
  const textX = x + 8 * scale
  const textY = y + 6.5 * scale
  ctx.fillText(dbName, textX, textY, 14 * scale) // maxWidth to prevent overflow
}

// --- GHOST (updated with buried state and neon pulse) ---

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  sprite: GhostSprite,
  globalFrame: number,
  tombstoneY: number // y position of tombstone top for clipping buried ghosts
) {
  const frame = getGhostFrame(sprite.state, sprite.frame)
  const scale = SPRITE_SCALE * sprite.scale

  // Compute bob offset based on state
  let bobOffset = 0
  if (sprite.state === 'active') {
    bobOffset = computeBobOffset(globalFrame * 2, BOB_AMPLITUDE * 1.5) // bigger bob for active
  } else if (sprite.state === 'idle') {
    bobOffset = computeBobOffset(globalFrame, BOB_AMPLITUDE)
  } else if (sprite.state === 'distressed') {
    bobOffset = (globalFrame % 2 === 0 ? 2 : -2)
  }
  // sleeping: no bob offset, ghost is buried

  const drawX = sprite.x
  let drawY = sprite.y + bobOffset

  // For sleeping/buried ghosts: position them lower, behind the tombstone
  const isBuried = sprite.state === 'sleeping'
  if (isBuried) {
    drawY = tombstoneY - 3 * scale // only top portion visible above tombstone
  }

  // Draw neon pulse glow for active ghosts
  if (sprite.state === 'active' && sprite.glowIntensity > 0) {
    const pulsePhase = Math.sin(globalFrame * 0.15) * 0.5 + 0.5 // 0-1 oscillation
    const glowRadius = (50 + pulsePhase * 20) * sprite.scale * sprite.glowIntensity
    const gradient = ctx.createRadialGradient(
      drawX + (8 * scale), drawY + (8 * scale), 0,
      drawX + (8 * scale), drawY + (8 * scale), glowRadius
    )
    // Neon green/purple color cycle
    const neonHue = (globalFrame * 2) % 360
    const neonColor = neonHue < 180 ? '#a8ff78' : '#b388ff'
    gradient.addColorStop(0, neonColor + '55')
    gradient.addColorStop(0.5, neonColor + '22')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(drawX - glowRadius, drawY - glowRadius, 16 * scale + glowRadius * 2, 16 * scale + glowRadius * 2)
  } else if (sprite.state === 'distressed' && sprite.glowIntensity > 0) {
    const glowRadius = 40 * sprite.scale * sprite.glowIntensity
    const gradient = ctx.createRadialGradient(
      drawX + (8 * scale), drawY + (8 * scale), 0,
      drawX + (8 * scale), drawY + (8 * scale), glowRadius
    )
    gradient.addColorStop(0, COLORS.ghostDistressed + '44')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(drawX - glowRadius, drawY - glowRadius, 16 * scale + glowRadius * 2, 16 * scale + glowRadius * 2)
  }

  // Determine body color
  let bodyColor: string = COLORS.ghostDefault
  if (sprite.state === 'sleeping') bodyColor = COLORS.ghostSleeping
  if (sprite.state === 'distressed') bodyColor = COLORS.ghostDistressed
  if (sprite.state === 'active') bodyColor = mixColor(COLORS.ghostDefault, COLORS.ghostGlow, sprite.glowIntensity)

  // For buried ghosts: use canvas clipping to only show top portion
  if (isBuried) {
    ctx.save()
    ctx.beginPath()
    // Clip region: everything above the tombstone top + a few pixels into it
    ctx.rect(drawX - 10, drawY - 10, 16 * scale + 20, tombstoneY - drawY + 4 * (scale / SPRITE_SCALE))
    ctx.clip()
  }

  // Draw sprite pixel by pixel
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const color = spriteColorMap(frame[y][x], bodyColor)
      if (color === 'transparent') continue
      ctx.fillStyle = color
      ctx.globalAlpha = isBuried ? 0.6 : 1 // buried ghosts are slightly transparent
      ctx.fillRect(drawX + x * scale, drawY + y * scale, scale, scale)
    }
  }
  ctx.globalAlpha = 1

  if (isBuried) {
    ctx.restore()
  }

  // Draw name above ghost (only for non-buried — buried name is on tombstone)
  if (!isBuried) {
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = `${10 * sprite.scale}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(sprite.ghost.name, drawX + 8 * scale, drawY - 12)
  }

  // Draw table count badge (only for non-buried with stats)
  if (!isBuried && sprite.ghost.stats) {
    const badgeText = `${sprite.ghost.stats.tableCount} tables`
    ctx.fillStyle = COLORS.badgeBg
    ctx.font = '10px monospace'
    const textWidth = ctx.measureText(badgeText).width
    ctx.fillRect(drawX + 8 * scale - textWidth / 2 - 4, drawY + 17 * scale, textWidth + 8, 14)
    ctx.fillStyle = COLORS.textSecondary
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

// --- ROOM ---

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

  // Candles on wall trim
  drawCandle(ctx, x + 15, y + 6)
  drawCandle(ctx, x + ROOM_WIDTH - 25, y + 6)

  return { x, y, centerX: x + ROOM_WIDTH / 2, centerY: y + ROOM_HEIGHT / 2 }
}

function drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#dfe6e9'
  ctx.fillRect(x, y + 4, 4, 8)

  const flicker = Math.random() * 2 - 1
  ctx.fillStyle = COLORS.candleFlame
  ctx.fillRect(x + flicker, y, 4, 4)

  const gradient = ctx.createRadialGradient(x + 2, y + 2, 0, x + 2, y + 2, 20)
  gradient.addColorStop(0, 'rgba(255, 170, 51, 0.2)')
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(x - 18, y - 18, 40, 40)
}

// --- FOG ---

// Persistent fog cloud positions (seeded per room)
const fogClouds: Map<number, Array<{ x: number; y: number; width: number; speed: number }>> = new Map()

function getFogClouds(roomIndex: number, roomX: number, roomY: number) {
  if (!fogClouds.has(roomIndex)) {
    const clouds = []
    for (let i = 0; i < FOG_CLOUD_COUNT; i++) {
      clouds.push({
        x: Math.random() * ROOM_WIDTH,
        y: roomY + ROOM_HEIGHT * 0.7 + Math.random() * ROOM_HEIGHT * 0.25,
        width: 40 + Math.random() * 60,
        speed: FOG_SPEED * (0.5 + Math.random()),
      })
    }
    fogClouds.set(roomIndex, clouds)
  }
  return fogClouds.get(roomIndex)!
}

export function drawFog(ctx: CanvasRenderingContext2D, roomIndex: number, roomX: number, roomY: number, globalFrame: number) {
  const clouds = getFogClouds(roomIndex, roomX, roomY)

  for (const cloud of clouds) {
    // Drift clouds
    cloud.x += cloud.speed
    if (cloud.x > roomX + ROOM_WIDTH + cloud.width) {
      cloud.x = roomX - cloud.width
    }

    // Draw soft cloud ellipse
    ctx.save()
    ctx.globalAlpha = FOG_OPACITY + Math.sin(globalFrame * 0.02 + cloud.x * 0.01) * 0.03
    ctx.beginPath()
    const cx = cloud.x
    const cy = cloud.y
    ctx.ellipse(cx, cy, cloud.width / 2, 8, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#c8d6e5'
    ctx.fill()
    ctx.restore()
  }
}

// --- COBWEBS ---

export function drawCobwebs(ctx: CanvasRenderingContext2D, roomX: number, roomY: number) {
  const cobwebScale = 2.5
  const webColor = 'rgba(200, 214, 229, 0.25)'

  // Top-left cobweb
  for (let py = 0; py < 16; py++) {
    for (let px = 0; px < 16; px++) {
      if (COBWEB_SPRITE[py][px] === 9) {
        ctx.fillStyle = webColor
        ctx.fillRect(roomX + px * cobwebScale, roomY + py * cobwebScale, cobwebScale, cobwebScale)
      }
    }
  }

  // Top-right cobweb (mirror horizontally)
  for (let py = 0; py < 16; py++) {
    for (let px = 0; px < 16; px++) {
      if (COBWEB_SPRITE[py][15 - px] === 9) {
        ctx.fillStyle = webColor
        ctx.fillRect(roomX + ROOM_WIDTH - 16 * cobwebScale + px * cobwebScale, roomY + py * cobwebScale, cobwebScale, cobwebScale)
      }
    }
  }
}

// --- DUST MOTES ---

const dustMotes: Map<number, Array<{ x: number; y: number; opacity: number; driftX: number; speed: number }>> = new Map()

function getDustMotes(roomIndex: number, roomX: number, roomY: number) {
  if (!dustMotes.has(roomIndex)) {
    const motes = []
    for (let i = 0; i < DUST_MOTE_COUNT; i++) {
      motes.push({
        x: roomX + Math.random() * ROOM_WIDTH,
        y: roomY + 20 + Math.random() * (ROOM_HEIGHT - 40),
        opacity: DUST_OPACITY_MIN + Math.random() * (DUST_OPACITY_MAX - DUST_OPACITY_MIN),
        driftX: (Math.random() - 0.5) * 0.3,
        speed: 0.1 + Math.random() * 0.2,
      })
    }
    dustMotes.set(roomIndex, motes)
  }
  return dustMotes.get(roomIndex)!
}

export function drawDustMotes(ctx: CanvasRenderingContext2D, roomIndex: number, roomX: number, roomY: number, globalFrame: number) {
  const motes = getDustMotes(roomIndex, roomX, roomY)

  for (const mote of motes) {
    // Float upward and drift
    mote.y -= mote.speed
    mote.x += mote.driftX + Math.sin(globalFrame * 0.05 + mote.x) * 0.1

    // Reset when reaching top
    if (mote.y < roomY + 20) {
      mote.y = roomY + ROOM_HEIGHT - 10
      mote.x = roomX + Math.random() * ROOM_WIDTH
    }
    // Wrap horizontally
    if (mote.x < roomX) mote.x = roomX + ROOM_WIDTH
    if (mote.x > roomX + ROOM_WIDTH) mote.x = roomX

    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = mote.opacity * (0.5 + Math.sin(globalFrame * 0.03 + mote.x) * 0.5)
    ctx.fillRect(Math.round(mote.x), Math.round(mote.y), 1, 1)
  }
  ctx.globalAlpha = 1
}

// --- FLICKER ---

export function applyFlicker(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, globalFrame: number) {
  // Slow sine wave for ambient flicker
  const flickerBase = Math.sin(globalFrame * FLICKER_SPEED) * FLICKER_AMOUNT

  // Occasional quick dip (dying candle effect)
  const quickFlicker = (globalFrame % 120 < 3) ? 0.08 : 0

  const darkness = Math.max(0, flickerBase + quickFlicker)

  if (darkness > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }
}

// --- PARTICLES (updated) ---

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  sprite: GhostSprite,
  globalFrame: number
) {
  const scale = SPRITE_SCALE * sprite.scale
  const cx = sprite.x + 8 * scale
  const cy = sprite.y

  if (sprite.state === 'sleeping') {
    // Zzz particles floating up from behind tombstone
    const zOffset = (globalFrame % 60) / 60
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = `${12 + zOffset * 8}px monospace`
    ctx.textAlign = 'center'
    ctx.globalAlpha = 1 - zOffset
    ctx.fillText('z', cx + 30 + zOffset * 10, cy - 10 - zOffset * 25)
    ctx.font = `${8 + zOffset * 6}px monospace`
    ctx.fillText('z', cx + 20 + zOffset * 8, cy - zOffset * 18)
    ctx.globalAlpha = 1
  }

  if (sprite.state === 'active') {
    // Orbiting neon sparkles
    for (let i = 0; i < 5; i++) {
      const angle = ((globalFrame * 3 + i * 72) % 360) * (Math.PI / 180)
      const radius = (35 + Math.sin(globalFrame * 0.1 + i) * 8) * sprite.scale
      const px = cx + Math.cos(angle) * radius
      const py = cy + 32 * sprite.scale + Math.sin(angle) * radius * 0.6 // slightly elliptical
      const neonColor = i % 2 === 0 ? COLORS.ghostGlow : '#b388ff'
      ctx.fillStyle = neonColor
      ctx.globalAlpha = 0.5 + Math.sin(globalFrame * 0.2 + i) * 0.5
      ctx.fillRect(px - 1, py - 1, 2, 2)
    }
    ctx.globalAlpha = 1
  }

  if (sprite.state === 'distressed') {
    // Sweat drops
    const dropY = cy + 8 + (globalFrame % 20)
    ctx.fillStyle = '#74b9ff'
    ctx.globalAlpha = 1 - (globalFrame % 20) / 20
    ctx.fillRect(cx + 28, dropY, 3, 5)
    ctx.fillRect(cx - 12, dropY + 5, 3, 5)
    ctx.globalAlpha = 1
  }
}
