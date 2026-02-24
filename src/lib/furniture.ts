import { FURNITURE_COLORS } from './constants'
import { FurnitureType } from './types'

/**
 * Deterministic furniture assignment from database ID.
 */
export function getFurnitureForDb(dbId: string): FurnitureType {
  let hash = 0
  for (let i = 0; i < dbId.length; i++) {
    hash = ((hash << 5) - hash + dbId.charCodeAt(i)) | 0
  }
  return (((hash % 8) + 8) % 8) as FurnitureType
}

export const FURNITURE_LABELS: Record<FurnitureType, string> = {
  [FurnitureType.GrandfatherClock]: 'Grandfather Clock',
  [FurnitureType.CrystalBall]: 'Crystal Ball',
  [FurnitureType.SuitOfArmor]: 'Suit of Armor',
  [FurnitureType.Cauldron]: 'Cauldron',
  [FurnitureType.HauntedPainting]: 'Haunted Painting',
  [FurnitureType.Bookshelf]: 'Bookshelf',
  [FurnitureType.Coffin]: 'Coffin',
  [FurnitureType.Piano]: 'Piano',
}

/**
 * Draw a 3-layer ambient occlusion shadow under furniture.
 */
function drawShadow(ctx: CanvasRenderingContext2D, cx: number, bottomY: number, radiusX: number, radiusY: number) {
  ctx.save()
  // Layer 1: outer soft penumbra
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.ellipse(cx, bottomY + 1, radiusX * 1.3, radiusY * 1.5, 0, 0, Math.PI * 2)
  ctx.fill()
  // Layer 2: inner contact shadow
  ctx.globalAlpha = 0.25
  ctx.beginPath()
  ctx.ellipse(cx, bottomY, radiusX, radiusY, 0, 0, Math.PI * 2)
  ctx.fill()
  // Layer 3: 1px dark drop line right at the base
  ctx.globalAlpha = 0.35
  ctx.fillRect(cx - radiusX * 0.6, bottomY - 0.5, radiusX * 1.2, 1)
  ctx.restore()
}

/**
 * Draw a furniture piece at the given pixel position.
 * All pieces are drawn in 3/4 perspective: top surface visible (lighter) + front/side face (darker).
 * Each piece occupies roughly 2 tiles wide × 2 tiles tall.
 */
export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  type: FurnitureType,
  px: number,
  py: number,
  tileSize: number,
  frame: number,
  isActive?: boolean
) {
  const w = tileSize * 2
  const h = tileSize * 2

  switch (type) {
    case FurnitureType.GrandfatherClock:
      drawGrandfatherClock(ctx, px, py, w, h, frame)
      break
    case FurnitureType.CrystalBall:
      drawCrystalBall(ctx, px, py, w, h, frame)
      break
    case FurnitureType.SuitOfArmor:
      drawSuitOfArmor(ctx, px, py, w, h)
      break
    case FurnitureType.Cauldron:
      drawCauldron(ctx, px, py, w, h, frame, isActive)
      break
    case FurnitureType.HauntedPainting:
      drawHauntedPainting(ctx, px, py, w, h)
      break
    case FurnitureType.Bookshelf:
      drawBookshelf(ctx, px, py, w, h)
      break
    case FurnitureType.Coffin:
      drawCoffin(ctx, px, py, w, h)
      break
    case FurnitureType.Piano:
      drawPiano(ctx, px, py, w, h)
      break
  }
}

/**
 * Returns the Y coordinate of the bottom of this furniture piece (for Y-sorting).
 */
export function getFurnitureBottomY(py: number, tileSize: number): number {
  return py + tileSize * 2
}

// --- 3/4 PERSPECTIVE FURNITURE ---

function drawGrandfatherClock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const cx = x + w / 2
  const bodyW = w * 0.4
  const bodyH = h * 0.7
  const bodyX = cx - bodyW / 2
  const bodyY = y + h * 0.15
  const bottomY = y + h * 0.92

  // Shadow
  drawShadow(ctx, cx, bottomY, w * 0.25, h * 0.06)

  // Front face (darker)
  ctx.fillStyle = FURNITURE_COLORS.wood
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH)

  // Right side face (3/4 view — narrower, darker)
  const sideW = w * 0.1
  ctx.fillStyle = FURNITURE_COLORS.woodDark
  ctx.beginPath()
  ctx.moveTo(bodyX + bodyW, bodyY)
  ctx.lineTo(bodyX + bodyW + sideW, bodyY - h * 0.04)
  ctx.lineTo(bodyX + bodyW + sideW, bodyY + bodyH - h * 0.04)
  ctx.lineTo(bodyX + bodyW, bodyY + bodyH)
  ctx.closePath()
  ctx.fill()

  // Top surface (lighter, visible from above)
  ctx.fillStyle = FURNITURE_COLORS.woodLight
  ctx.beginPath()
  ctx.moveTo(bodyX, bodyY)
  ctx.lineTo(bodyX + sideW, bodyY - h * 0.04)
  ctx.lineTo(bodyX + bodyW + sideW, bodyY - h * 0.04)
  ctx.lineTo(bodyX + bodyW, bodyY)
  ctx.closePath()
  ctx.fill()

  // Cap molding
  ctx.fillStyle = FURNITURE_COLORS.woodDark
  ctx.fillRect(bodyX - 2, bodyY + h * 0.02, bodyW + 4, h * 0.05)

  // Clock face
  ctx.fillStyle = FURNITURE_COLORS.ivory
  ctx.beginPath()
  ctx.arc(cx, bodyY + h * 0.18, w * 0.13, 0, Math.PI * 2)
  ctx.fill()
  // Clock hands
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1.5
  const hourAngle = (frame * 0.01) % (Math.PI * 2)
  ctx.beginPath()
  ctx.moveTo(cx, bodyY + h * 0.18)
  ctx.lineTo(cx + Math.cos(hourAngle) * w * 0.08, bodyY + h * 0.18 + Math.sin(hourAngle) * w * 0.08)
  ctx.stroke()

  // Pendulum (animated)
  const pendulumAngle = Math.sin(frame * 0.08) * 0.3
  const pendulumLen = h * 0.2
  ctx.strokeStyle = FURNITURE_COLORS.metalLight
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, bodyY + h * 0.35)
  ctx.lineTo(cx + Math.sin(pendulumAngle) * pendulumLen, bodyY + h * 0.35 + Math.cos(pendulumAngle) * pendulumLen)
  ctx.stroke()
  ctx.fillStyle = FURNITURE_COLORS.metal
  ctx.beginPath()
  ctx.arc(cx + Math.sin(pendulumAngle) * pendulumLen, bodyY + h * 0.35 + Math.cos(pendulumAngle) * pendulumLen, 3, 0, Math.PI * 2)
  ctx.fill()

  // Base (wider)
  ctx.fillStyle = FURNITURE_COLORS.woodLight
  ctx.fillRect(bodyX - 3, bodyY + bodyH - h * 0.06, bodyW + 6, h * 0.06)
}

function drawCrystalBall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const cx = x + w / 2
  const bottomY = y + h * 0.88

  // Shadow
  drawShadow(ctx, cx, bottomY, w * 0.22, h * 0.05)

  // Table/stand — 3/4 view box
  const standW = w * 0.35
  const standH = h * 0.12
  const standX = cx - standW / 2
  const standY = y + h * 0.68
  const standSide = w * 0.08

  // Stand front
  ctx.fillStyle = FURNITURE_COLORS.metalDark
  ctx.fillRect(standX, standY, standW, standH)
  // Stand right side
  ctx.fillStyle = '#3a3a4a'
  ctx.beginPath()
  ctx.moveTo(standX + standW, standY)
  ctx.lineTo(standX + standW + standSide, standY - h * 0.03)
  ctx.lineTo(standX + standW + standSide, standY + standH - h * 0.03)
  ctx.lineTo(standX + standW, standY + standH)
  ctx.closePath()
  ctx.fill()
  // Stand top
  ctx.fillStyle = FURNITURE_COLORS.metalLight
  ctx.beginPath()
  ctx.moveTo(standX, standY)
  ctx.lineTo(standX + standSide, standY - h * 0.03)
  ctx.lineTo(standX + standW + standSide, standY - h * 0.03)
  ctx.lineTo(standX + standW, standY)
  ctx.closePath()
  ctx.fill()

  // Pedestal base
  ctx.fillStyle = FURNITURE_COLORS.metalDark
  ctx.fillRect(cx - w * 0.2, y + h * 0.8, w * 0.4, h * 0.06)

  // Crystal ball
  const ballCy = y + h * 0.42
  const gradient = ctx.createRadialGradient(cx - 4, ballCy - 4, 2, cx, ballCy, w * 0.22)
  gradient.addColorStop(0, FURNITURE_COLORS.crystalGlow)
  gradient.addColorStop(0.7, FURNITURE_COLORS.crystal)
  gradient.addColorStop(1, '#443366')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(cx, ballCy, w * 0.22, 0, Math.PI * 2)
  ctx.fill()

  // Inner glow pulse
  const pulse = Math.sin(frame * 0.1) * 0.3 + 0.5
  ctx.fillStyle = `rgba(170, 136, 255, ${pulse * 0.3})`
  ctx.beginPath()
  ctx.arc(cx, ballCy, w * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  ctx.beginPath()
  ctx.arc(cx - w * 0.08, ballCy - w * 0.08, w * 0.05, 0, Math.PI * 2)
  ctx.fill()
}

function drawSuitOfArmor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2
  const bottomY = y + h * 0.92

  // Shadow
  drawShadow(ctx, cx, bottomY, w * 0.2, h * 0.05)

  // Legs — 3/4 cylinders
  ctx.fillStyle = FURNITURE_COLORS.metalDark
  ctx.fillRect(cx - w * 0.16, y + h * 0.6, w * 0.12, h * 0.28)
  ctx.fillRect(cx + w * 0.04, y + h * 0.6, w * 0.12, h * 0.28)
  // Leg highlights
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(cx - w * 0.16, y + h * 0.6, w * 0.04, h * 0.28)
  ctx.fillRect(cx + w * 0.04, y + h * 0.6, w * 0.04, h * 0.28)

  // Torso — 3/4 box
  const torsoW = w * 0.38
  const torsoH = h * 0.3
  const torsoX = cx - torsoW / 2
  const torsoY = y + h * 0.28
  const torsoSide = w * 0.08

  // Front
  ctx.fillStyle = FURNITURE_COLORS.metalLight
  ctx.fillRect(torsoX, torsoY, torsoW, torsoH)
  // Right side (darker)
  ctx.fillStyle = FURNITURE_COLORS.metal
  ctx.beginPath()
  ctx.moveTo(torsoX + torsoW, torsoY)
  ctx.lineTo(torsoX + torsoW + torsoSide, torsoY - h * 0.02)
  ctx.lineTo(torsoX + torsoW + torsoSide, torsoY + torsoH - h * 0.02)
  ctx.lineTo(torsoX + torsoW, torsoY + torsoH)
  ctx.closePath()
  ctx.fill()
  // Top (shoulder plate)
  ctx.fillStyle = '#9a9aaa'
  ctx.beginPath()
  ctx.moveTo(torsoX - w * 0.05, torsoY)
  ctx.lineTo(torsoX + torsoSide, torsoY - h * 0.02)
  ctx.lineTo(torsoX + torsoW + torsoSide + w * 0.05, torsoY - h * 0.02)
  ctx.lineTo(torsoX + torsoW + w * 0.05, torsoY)
  ctx.closePath()
  ctx.fill()

  // Chest line
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, torsoY + 2)
  ctx.lineTo(cx, torsoY + torsoH - 2)
  ctx.stroke()

  // Arms
  ctx.fillStyle = FURNITURE_COLORS.metal
  ctx.fillRect(cx - w * 0.3, y + h * 0.3, w * 0.08, h * 0.22)
  ctx.fillRect(cx + w * 0.22, y + h * 0.3, w * 0.08, h * 0.22)

  // Helmet
  ctx.fillStyle = FURNITURE_COLORS.metal
  ctx.beginPath()
  ctx.arc(cx, y + h * 0.18, w * 0.15, 0, Math.PI * 2)
  ctx.fill()
  // Helmet top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.beginPath()
  ctx.arc(cx, y + h * 0.14, w * 0.08, 0, Math.PI * 2)
  ctx.fill()
  // Visor slit
  ctx.fillStyle = '#111'
  ctx.fillRect(cx - w * 0.1, y + h * 0.17, w * 0.2, 2)
}

function drawCauldron(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, isActive?: boolean) {
  const cx = x + w / 2
  const bottomY = y + h * 0.88

  // Shadow
  drawShadow(ctx, cx, bottomY, w * 0.3, h * 0.06)

  // Legs (tripod)
  ctx.fillStyle = FURNITURE_COLORS.metalDark
  ctx.fillRect(cx - w * 0.25, y + h * 0.75, 3, h * 0.12)
  ctx.fillRect(cx + w * 0.22, y + h * 0.75, 3, h * 0.12)
  ctx.fillRect(cx - 1, y + h * 0.78, 3, h * 0.1)

  // Cauldron body — 3/4 elliptical pot
  ctx.fillStyle = FURNITURE_COLORS.cauldronDark
  ctx.beginPath()
  ctx.ellipse(cx, y + h * 0.55, w * 0.32, h * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body highlight (left side)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.ellipse(cx - w * 0.15, y + h * 0.5, w * 0.08, h * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()

  // Rim — visible top ellipse (3/4 view)
  ctx.fillStyle = FURNITURE_COLORS.metalDark
  ctx.beginPath()
  ctx.ellipse(cx, y + h * 0.33, w * 0.33, h * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  // Inner rim
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.ellipse(cx, y + h * 0.33, w * 0.28, h * 0.06, 0, 0, Math.PI * 2)
  ctx.fill()

  // Bubbling green liquid surface
  ctx.fillStyle = FURNITURE_COLORS.cauldronGreen
  ctx.beginPath()
  ctx.ellipse(cx, y + h * 0.35, w * 0.25, h * 0.05, 0, 0, Math.PI * 2)
  ctx.fill()

  // Bubbles
  const bubblePhase = frame * 0.15
  for (let i = 0; i < 3; i++) {
    const bx = cx + Math.sin(bubblePhase + i * 2.1) * w * 0.12
    const by = y + h * 0.3 - Math.abs(Math.sin(bubblePhase * 0.7 + i * 1.5)) * h * 0.12
    const br = 2 + Math.sin(bubblePhase + i) * 1
    ctx.fillStyle = `rgba(68, 170, 85, ${0.4 + Math.sin(bubblePhase + i) * 0.2})`
    ctx.beginPath()
    ctx.arc(bx, by, br, 0, Math.PI * 2)
    ctx.fill()
  }

  // Rising green motes when ghost is active
  if (isActive) {
    for (let i = 0; i < 4; i++) {
      const phase = (frame * 0.06 + i * 1.57) % (Math.PI * 2)
      const life = (phase / (Math.PI * 2)) // 0→1 lifecycle
      const moteX = cx + Math.sin(phase * 3 + i) * w * 0.18
      const moteY = y + h * 0.3 - life * h * 0.35
      const alpha = life < 0.2 ? life * 5 : life > 0.8 ? (1 - life) * 5 : 1
      ctx.fillStyle = `rgba(102, 255, 136, ${alpha * 0.6})`
      ctx.fillRect(Math.round(moteX), Math.round(moteY), 2, 2)
    }
  }
}

function drawHauntedPainting(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2
  const bottomY = y + h * 0.82

  // Shadow (on wall behind — wider, subtle)
  drawShadow(ctx, cx, bottomY, w * 0.35, h * 0.04)

  // Frame — 3/4 with visible side thickness
  const frameW = w * 0.7
  const frameH = h * 0.55
  const frameX = cx - frameW / 2
  const frameY = y + h * 0.12
  const depth = w * 0.04

  // Frame front
  ctx.fillStyle = FURNITURE_COLORS.frameGold
  ctx.fillRect(frameX, frameY, frameW, frameH)
  // Frame right side (depth)
  ctx.fillStyle = '#a08828'
  ctx.beginPath()
  ctx.moveTo(frameX + frameW, frameY)
  ctx.lineTo(frameX + frameW + depth, frameY - depth)
  ctx.lineTo(frameX + frameW + depth, frameY + frameH - depth)
  ctx.lineTo(frameX + frameW, frameY + frameH)
  ctx.closePath()
  ctx.fill()
  // Frame top (depth)
  ctx.fillStyle = '#d8c040'
  ctx.beginPath()
  ctx.moveTo(frameX, frameY)
  ctx.lineTo(frameX + depth, frameY - depth)
  ctx.lineTo(frameX + frameW + depth, frameY - depth)
  ctx.lineTo(frameX + frameW, frameY)
  ctx.closePath()
  ctx.fill()

  // Canvas
  ctx.fillStyle = FURNITURE_COLORS.canvasBeige
  ctx.fillRect(frameX + w * 0.05, frameY + h * 0.05, frameW - w * 0.1, frameH - h * 0.1)

  // Portrait silhouette
  ctx.fillStyle = '#2a2a2a'
  ctx.beginPath()
  ctx.arc(cx, frameY + frameH * 0.4, w * 0.1, 0, Math.PI * 2)
  ctx.fill()
  // Shoulders
  ctx.beginPath()
  ctx.ellipse(cx, frameY + frameH * 0.7, w * 0.18, h * 0.08, 0, 0, Math.PI)
  ctx.fill()

  // Glowing red eyes
  ctx.fillStyle = '#ff4444'
  ctx.fillRect(cx - 5, frameY + frameH * 0.37, 3, 2)
  ctx.fillRect(cx + 2, frameY + frameH * 0.37, 3, 2)

  // Easel legs
  ctx.strokeStyle = FURNITURE_COLORS.woodDark
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - w * 0.2, frameY + frameH)
  ctx.lineTo(cx - w * 0.25, y + h * 0.92)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + w * 0.2, frameY + frameH)
  ctx.lineTo(cx + w * 0.25, y + h * 0.92)
  ctx.stroke()
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2
  const bottomY = y + h * 0.95

  // Shadow
  drawShadow(ctx, cx, bottomY, w * 0.38, h * 0.05)

  const shelfW = w * 0.75
  const shelfH = h * 0.85
  const shelfX = cx - shelfW / 2
  const shelfY = y + h * 0.05
  const sideW = w * 0.1 // visible right side depth

  // Right side panel (3/4 perspective — darker)
  ctx.fillStyle = FURNITURE_COLORS.woodDark
  ctx.beginPath()
  ctx.moveTo(shelfX + shelfW, shelfY)
  ctx.lineTo(shelfX + shelfW + sideW, shelfY - h * 0.03)
  ctx.lineTo(shelfX + shelfW + sideW, shelfY + shelfH - h * 0.03)
  ctx.lineTo(shelfX + shelfW, shelfY + shelfH)
  ctx.closePath()
  ctx.fill()

  // Front face
  ctx.fillStyle = FURNITURE_COLORS.wood
  ctx.fillRect(shelfX, shelfY, shelfW, shelfH)

  // Top surface (lighter, visible from above)
  ctx.fillStyle = FURNITURE_COLORS.woodLight
  ctx.beginPath()
  ctx.moveTo(shelfX, shelfY)
  ctx.lineTo(shelfX + sideW, shelfY - h * 0.03)
  ctx.lineTo(shelfX + shelfW + sideW, shelfY - h * 0.03)
  ctx.lineTo(shelfX + shelfW, shelfY)
  ctx.closePath()
  ctx.fill()

  // Shelves (3 rows) with books
  const shelfColors = ['#8b4513', '#654321', '#a0522d', '#6b3410', '#7a4a2a', '#556b2f', '#8b0000', '#4a3728', '#2f4f4f']
  for (let row = 0; row < 3; row++) {
    const rowY = shelfY + h * (0.06 + row * 0.27)

    // Shelf plank (with 3/4 top visible)
    const plankY = rowY + h * 0.22
    ctx.fillStyle = FURNITURE_COLORS.woodLight
    ctx.fillRect(shelfX + w * 0.02, plankY, shelfW - w * 0.04, 3)
    // Plank top surface
    ctx.fillStyle = '#8a6a4a'
    ctx.beginPath()
    ctx.moveTo(shelfX + w * 0.02, plankY)
    ctx.lineTo(shelfX + w * 0.04, plankY - 2)
    ctx.lineTo(shelfX + shelfW, plankY - 2)
    ctx.lineTo(shelfX + shelfW - w * 0.02, plankY)
    ctx.closePath()
    ctx.fill()

    // Books — slightly varied heights with tiny top surfaces
    for (let b = 0; b < 5; b++) {
      const bookColor = shelfColors[(row * 5 + b) % shelfColors.length]
      const bw = w * 0.1 + (b % 3) * 1.5
      const bh = h * 0.16 + (b % 2) * 3
      const bookX = shelfX + w * 0.05 + b * w * 0.14
      const bookY = plankY - bh

      // Book front
      ctx.fillStyle = bookColor
      ctx.fillRect(bookX, bookY, bw, bh)
      // Book top (lighter)
      ctx.fillStyle = lightenHex(bookColor, 0.25)
      ctx.fillRect(bookX, bookY, bw, 2)
      // Book spine line
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(bookX, bookY + bh * 0.3, bw, 1)
    }
  }

  // Side trim
  ctx.fillStyle = FURNITURE_COLORS.woodDark
  ctx.fillRect(shelfX, shelfY, 2, shelfH)
  ctx.fillRect(shelfX + shelfW - 2, shelfY, 2, shelfH)
}

function drawCoffin(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2
  const bottomY = y + h * 0.92

  // Shadow
  drawShadow(ctx, cx, bottomY, w * 0.28, h * 0.05)

  // Coffin body — 3/4 hexagonal box
  const coffinH = h * 0.12 // height of the box sides
  const topY = y + h * 0.3

  // Side face (visible bottom portion of the 3D box)
  ctx.fillStyle = '#2a1a0e'
  ctx.beginPath()
  ctx.moveTo(cx - w * 0.12, topY + h * 0.55)
  ctx.lineTo(cx + w * 0.12, topY + h * 0.55)
  ctx.lineTo(cx + w * 0.28, topY + h * 0.35)
  ctx.lineTo(cx + w * 0.28, topY + h * 0.35 + coffinH)
  ctx.lineTo(cx + w * 0.12, topY + h * 0.55 + coffinH)
  ctx.lineTo(cx - w * 0.12, topY + h * 0.55 + coffinH)
  ctx.lineTo(cx - w * 0.28, topY + h * 0.35 + coffinH)
  ctx.lineTo(cx - w * 0.28, topY + h * 0.35)
  ctx.closePath()
  ctx.fill()

  // Lid top surface (lighter — the visible top in 3/4 view)
  ctx.fillStyle = FURNITURE_COLORS.coffinLid
  ctx.beginPath()
  ctx.moveTo(cx - w * 0.12, topY)
  ctx.lineTo(cx + w * 0.12, topY)
  ctx.lineTo(cx + w * 0.28, topY + h * 0.18)
  ctx.lineTo(cx + w * 0.28, topY + h * 0.35)
  ctx.lineTo(cx + w * 0.12, topY + h * 0.55)
  ctx.lineTo(cx - w * 0.12, topY + h * 0.55)
  ctx.lineTo(cx - w * 0.28, topY + h * 0.35)
  ctx.lineTo(cx - w * 0.28, topY + h * 0.18)
  ctx.closePath()
  ctx.fill()

  // Lid center line
  ctx.strokeStyle = FURNITURE_COLORS.coffin
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, topY)
  ctx.lineTo(cx, topY + h * 0.55)
  ctx.stroke()

  // Cross
  ctx.fillStyle = FURNITURE_COLORS.metal
  ctx.fillRect(cx - 1.5, topY + h * 0.12, 3, h * 0.18)
  ctx.fillRect(cx - 5, topY + h * 0.17, 10, 3)

  // Wood grain highlights
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(cx - w * 0.2, topY + h * 0.12)
  ctx.lineTo(cx - w * 0.2, topY + h * 0.48)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + w * 0.2, topY + h * 0.12)
  ctx.lineTo(cx + w * 0.2, topY + h * 0.48)
  ctx.stroke()
}

function drawPiano(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2
  const bottomY = y + h * 0.92

  // Shadow
  drawShadow(ctx, cx, bottomY, w * 0.38, h * 0.05)

  // Legs
  ctx.fillStyle = FURNITURE_COLORS.woodDark
  ctx.fillRect(x + w * 0.1, y + h * 0.72, 3, h * 0.18)
  ctx.fillRect(x + w * 0.85, y + h * 0.72, 3, h * 0.18)
  ctx.fillRect(x + w * 0.48, y + h * 0.75, 3, h * 0.15)

  // Piano body — 3/4 box
  const bodyW = w * 0.82
  const bodyH = h * 0.38
  const bodyX = cx - bodyW / 2
  const bodyY = y + h * 0.3
  const sideW = w * 0.08

  // Front face
  ctx.fillStyle = FURNITURE_COLORS.woodDark
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH)

  // Right side
  ctx.fillStyle = '#2a1808'
  ctx.beginPath()
  ctx.moveTo(bodyX + bodyW, bodyY)
  ctx.lineTo(bodyX + bodyW + sideW, bodyY - h * 0.03)
  ctx.lineTo(bodyX + bodyW + sideW, bodyY + bodyH - h * 0.03)
  ctx.lineTo(bodyX + bodyW, bodyY + bodyH)
  ctx.closePath()
  ctx.fill()

  // Top surface
  ctx.fillStyle = FURNITURE_COLORS.wood
  ctx.beginPath()
  ctx.moveTo(bodyX, bodyY)
  ctx.lineTo(bodyX + sideW, bodyY - h * 0.03)
  ctx.lineTo(bodyX + bodyW + sideW, bodyY - h * 0.03)
  ctx.lineTo(bodyX + bodyW, bodyY)
  ctx.closePath()
  ctx.fill()

  // Open lid (angled up from back)
  ctx.fillStyle = FURNITURE_COLORS.woodLight
  ctx.beginPath()
  ctx.moveTo(bodyX + w * 0.05, bodyY)
  ctx.lineTo(bodyX + w * 0.12, bodyY - h * 0.18)
  ctx.lineTo(bodyX + bodyW - w * 0.05, bodyY - h * 0.18)
  ctx.lineTo(bodyX + bodyW - w * 0.05, bodyY)
  ctx.closePath()
  ctx.fill()
  // Lid underside (darker)
  ctx.fillStyle = '#4a3018'
  ctx.beginPath()
  ctx.moveTo(bodyX + w * 0.12, bodyY - h * 0.18)
  ctx.lineTo(bodyX + w * 0.14, bodyY - h * 0.16)
  ctx.lineTo(bodyX + bodyW - w * 0.07, bodyY - h * 0.16)
  ctx.lineTo(bodyX + bodyW - w * 0.05, bodyY - h * 0.18)
  ctx.closePath()
  ctx.fill()

  // Keys (on the front face)
  const keysY = bodyY + bodyH - h * 0.18
  const keysW = bodyW * 0.8
  const keysX = bodyX + bodyW * 0.1

  // White keys
  ctx.fillStyle = FURNITURE_COLORS.ivory
  ctx.fillRect(keysX, keysY, keysW, h * 0.12)
  // Key separator lines
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'
  ctx.lineWidth = 0.5
  for (let k = 0; k < 8; k++) {
    const kx = keysX + k * (keysW / 8)
    ctx.beginPath()
    ctx.moveTo(kx, keysY)
    ctx.lineTo(kx, keysY + h * 0.12)
    ctx.stroke()
  }
  // Black keys
  ctx.fillStyle = '#111'
  for (let k = 0; k < 5; k++) {
    const kx = keysX + k * (keysW / 5) + keysW / 10
    ctx.fillRect(kx, keysY, keysW / 14, h * 0.07)
  }
}

/**
 * Lighten a hex color by a factor.
 */
function lightenHex(hex: string, amount: number): string {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return hex
  const r = Math.min(255, Math.round(parseInt(match[1], 16) + 255 * amount))
  const g = Math.min(255, Math.round(parseInt(match[2], 16) + 255 * amount))
  const b = Math.min(255, Math.round(parseInt(match[3], 16) + 255 * amount))
  return `rgb(${r},${g},${b})`
}
