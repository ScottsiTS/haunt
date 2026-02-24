import { SPRITE_SCALE, BOB_AMPLITUDE, COLORS, TILE_RENDERED, FOG_SPEED, FOG_OPACITY, DUST_MOTE_COUNT, DUST_OPACITY_MIN, DUST_OPACITY_MAX, FLICKER_SPEED, FLICKER_AMOUNT } from './constants'
import { getGhostFrame, drawTile } from './sprites'
import type { GhostSprite, MansionMap } from './types'
import { TileType } from './types'

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

// --- TILE LAYER ---

export function drawTileLayer(ctx: CanvasRenderingContext2D, mansion: MansionMap) {
  for (let y = 0; y < mansion.height; y++) {
    for (let x = 0; x < mansion.width; x++) {
      const tile = mansion.tiles[y][x]
      if (tile === TileType.Empty) continue
      drawTile(ctx, tile, x * TILE_RENDERED, y * TILE_RENDERED, TILE_RENDERED)
    }
  }
}

// --- GHOST ---

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  sprite: GhostSprite,
  globalFrame: number,
  furnitureY: number
) {
  const frame = getGhostFrame(sprite.state, sprite.frame)
  const scale = SPRITE_SCALE * sprite.scale

  let bobOffset = 0
  if (sprite.state === 'active') {
    bobOffset = computeBobOffset(globalFrame * 2, BOB_AMPLITUDE * 1.5)
  } else if (sprite.state === 'idle') {
    bobOffset = computeBobOffset(globalFrame, BOB_AMPLITUDE)
  } else if (sprite.state === 'distressed') {
    bobOffset = (globalFrame % 2 === 0 ? 2 : -2)
  }

  const drawX = sprite.x
  let drawY = sprite.y + bobOffset

  // Sleeping ghosts sink behind their furniture
  const isBuried = sprite.state === 'sleeping'
  if (isBuried) {
    drawY = furnitureY - 3 * scale
  }

  // Neon pulse glow for active ghosts
  if (sprite.state === 'active' && sprite.glowIntensity > 0) {
    const pulsePhase = Math.sin(globalFrame * 0.15) * 0.5 + 0.5
    const glowRadius = (25 + pulsePhase * 10) * sprite.scale * sprite.glowIntensity
    const gradient = ctx.createRadialGradient(
      drawX + (8 * scale), drawY + (8 * scale), 0,
      drawX + (8 * scale), drawY + (8 * scale), glowRadius
    )
    const neonHue = (globalFrame * 2) % 360
    const neonColor = neonHue < 180 ? '#a8ff78' : '#b388ff'
    gradient.addColorStop(0, neonColor + '55')
    gradient.addColorStop(0.5, neonColor + '22')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(drawX - glowRadius, drawY - glowRadius, 16 * scale + glowRadius * 2, 16 * scale + glowRadius * 2)
  } else if (sprite.state === 'distressed' && sprite.glowIntensity > 0) {
    const glowRadius = 20 * sprite.scale * sprite.glowIntensity
    const gradient = ctx.createRadialGradient(
      drawX + (8 * scale), drawY + (8 * scale), 0,
      drawX + (8 * scale), drawY + (8 * scale), glowRadius
    )
    gradient.addColorStop(0, COLORS.ghostDistressed + '44')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(drawX - glowRadius, drawY - glowRadius, 16 * scale + glowRadius * 2, 16 * scale + glowRadius * 2)
  }

  let bodyColor: string = COLORS.ghostDefault
  if (sprite.state === 'sleeping') bodyColor = COLORS.ghostSleeping
  if (sprite.state === 'distressed') bodyColor = COLORS.ghostDistressed
  if (sprite.state === 'active') bodyColor = mixColor(COLORS.ghostDefault, COLORS.ghostGlow, sprite.glowIntensity)

  // Clip buried ghosts behind furniture
  if (isBuried) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(drawX - 10, drawY - 10, 16 * scale + 20, furnitureY - drawY + 4 * (scale / SPRITE_SCALE))
    ctx.clip()
  }

  // Draw sprite pixel by pixel
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const color = spriteColorMap(frame[y][x], bodyColor)
      if (color === 'transparent') continue
      ctx.fillStyle = color
      ctx.globalAlpha = isBuried ? 0.6 : 1
      ctx.fillRect(drawX + x * scale, drawY + y * scale, scale, scale)
    }
  }
  ctx.globalAlpha = 1

  if (isBuried) {
    ctx.restore()
  }

  // Name above ghost (always visible, white with glow)
  if (!isBuried) {
    const nameCx = drawX + 8 * scale
    const nameY = drawY - 24
    ctx.save()
    ctx.font = `bold ${18 * sprite.scale}px monospace`
    ctx.textAlign = 'center'
    // Glow effect
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#ffffff'
    ctx.fillText(sprite.ghost.name, nameCx, nameY)
    // Second pass for crisp text
    ctx.shadowBlur = 0
    ctx.fillText(sprite.ghost.name, nameCx, nameY)
    ctx.restore()
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

// --- MANSION FOG (3-LAYER PARALLAX) ---

interface FogCloud {
  x: number
  y: number
  width: number
  speed: number
}

interface FogLayer {
  clouds: FogCloud[]
  opacity: number
  color: string
  yScale: number // vertical squash of ellipse
}

const fogLayers: FogLayer[] = []
let fogInitialized = false

function initFogLayers(mapWidthPx: number, mapHeightPx: number) {
  if (fogInitialized) return
  fogInitialized = true

  const layerConfigs = [
    // Back layer: large, slow, dim — deep atmospheric haze
    { count: Math.max(4, Math.floor(mapWidthPx / 200)), speedMul: 0.15, widthMin: 80, widthMax: 160, opacity: 0.04, color: '#6a7a8a', yScale: 14 },
    // Mid layer: medium, normal speed
    { count: Math.max(5, Math.floor(mapWidthPx / 120)), speedMul: 0.35, widthMin: 50, widthMax: 100, opacity: 0.06, color: '#8a9aaa', yScale: 10 },
    // Front layer: small, fast, brighter — wisps
    { count: Math.max(6, Math.floor(mapWidthPx / 80)), speedMul: 0.7, widthMin: 30, widthMax: 70, opacity: 0.05, color: '#c8d6e5', yScale: 7 },
  ]

  for (const cfg of layerConfigs) {
    const clouds: FogCloud[] = []
    for (let i = 0; i < cfg.count; i++) {
      clouds.push({
        x: Math.random() * mapWidthPx,
        y: mapHeightPx * 0.35 + Math.random() * mapHeightPx * 0.55,
        width: cfg.widthMin + Math.random() * (cfg.widthMax - cfg.widthMin),
        speed: FOG_SPEED * cfg.speedMul * (0.5 + Math.random() * 0.5),
      })
    }
    fogLayers.push({ clouds, opacity: cfg.opacity, color: cfg.color, yScale: cfg.yScale })
  }
}

export function drawMansionFog(ctx: CanvasRenderingContext2D, mapWidthPx: number, mapHeightPx: number, globalFrame: number) {
  initFogLayers(mapWidthPx, mapHeightPx)

  for (const layer of fogLayers) {
    for (const cloud of layer.clouds) {
      cloud.x += cloud.speed
      if (cloud.x > mapWidthPx + cloud.width) {
        cloud.x = -cloud.width
      }

      ctx.save()
      ctx.globalAlpha = layer.opacity + Math.sin(globalFrame * 0.02 + cloud.x * 0.01) * 0.02
      ctx.beginPath()
      ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, layer.yScale, 0, 0, Math.PI * 2)
      ctx.fillStyle = layer.color
      ctx.fill()
      ctx.restore()
    }
  }
}

// --- VIGNETTE ---

export function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  const outerRadius = Math.max(w, h) * 0.7
  const gradient = ctx.createRadialGradient(cx, cy, outerRadius * 0.3, cx, cy, outerRadius)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(0.8, 'rgba(0,0,0,0.05)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.15)')
  ctx.save()
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// --- DUST MOTES (mansion-wide) ---

const mansionDust: Array<{ x: number; y: number; opacity: number; driftX: number; speed: number }> = []
let dustInitialized = false

function initMansionDust(mapWidthPx: number, mapHeightPx: number) {
  if (dustInitialized) return
  dustInitialized = true
  const count = Math.max(DUST_MOTE_COUNT, Math.floor(mapWidthPx * mapHeightPx / 8000))
  for (let i = 0; i < count; i++) {
    mansionDust.push({
      x: Math.random() * mapWidthPx,
      y: Math.random() * mapHeightPx,
      opacity: DUST_OPACITY_MIN + Math.random() * (DUST_OPACITY_MAX - DUST_OPACITY_MIN),
      driftX: (Math.random() - 0.5) * 0.3,
      speed: 0.1 + Math.random() * 0.2,
    })
  }
}

export function drawMansionDust(ctx: CanvasRenderingContext2D, mapWidthPx: number, mapHeightPx: number, globalFrame: number) {
  initMansionDust(mapWidthPx, mapHeightPx)

  for (const mote of mansionDust) {
    mote.y -= mote.speed
    mote.x += mote.driftX + Math.sin(globalFrame * 0.05 + mote.x) * 0.1

    if (mote.y < 0) {
      mote.y = mapHeightPx
      mote.x = Math.random() * mapWidthPx
    }
    if (mote.x < 0) mote.x = mapWidthPx
    if (mote.x > mapWidthPx) mote.x = 0

    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = mote.opacity * (0.5 + Math.sin(globalFrame * 0.03 + mote.x) * 0.5)
    ctx.fillRect(Math.round(mote.x), Math.round(mote.y), 1, 1)
  }
  ctx.globalAlpha = 1
}

// --- FLICKER ---

export function applyFlicker(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, globalFrame: number) {
  const flickerBase = Math.sin(globalFrame * FLICKER_SPEED) * FLICKER_AMOUNT
  const quickFlicker = (globalFrame % 120 < 3) ? 0.08 : 0
  const darkness = Math.max(0, flickerBase + quickFlicker)

  if (darkness > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }
}

// --- PARTICLES ---

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  sprite: GhostSprite,
  globalFrame: number
) {
  const scale = SPRITE_SCALE * sprite.scale
  const cx = sprite.x + 8 * scale
  const cy = sprite.y

  if (sprite.state === 'sleeping') {
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
    for (let i = 0; i < 5; i++) {
      const angle = ((globalFrame * 3 + i * 72) % 360) * (Math.PI / 180)
      const radius = (18 + Math.sin(globalFrame * 0.1 + i) * 4) * sprite.scale
      const px = cx + Math.cos(angle) * radius
      const py = cy + 16 * sprite.scale + Math.sin(angle) * radius * 0.6
      const neonColor = i % 2 === 0 ? COLORS.ghostGlow : '#b388ff'
      ctx.fillStyle = neonColor
      ctx.globalAlpha = 0.5 + Math.sin(globalFrame * 0.2 + i) * 0.5
      ctx.fillRect(px - 1, py - 1, 2, 2)
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

/**
 * Reset fog/dust state (for hot-reload or tests).
 */
export function resetAmbientState() {
  fogLayers.length = 0
  fogInitialized = false
  mansionDust.length = 0
  dustInitialized = false
}
