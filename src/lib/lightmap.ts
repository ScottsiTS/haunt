/**
 * Light map system — draws additive lights onto an overlay canvas,
 * then composites onto the main canvas with 'multiply' blend to create
 * atmospheric darkness with warm/cool light pools.
 */

let lightCanvas: OffscreenCanvas | null = null
let lightCtx: OffscreenCanvasRenderingContext2D | null = null

export interface LightSource {
  x: number
  y: number
  radius: number
  color: string // hex like '#ffbb44'
  intensity: number // 0-1
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return hex + a
}

/**
 * Prepare the light map canvas (reuses between frames).
 * Fills with a dark ambient base — areas without light stay dim.
 */
export function prepareLightMap(w: number, h: number) {
  if (!lightCanvas || lightCanvas.width !== w || lightCanvas.height !== h) {
    lightCanvas = new OffscreenCanvas(w, h)
    lightCtx = lightCanvas.getContext('2d')
  }
  if (!lightCtx) return
  // Dark ambient base — very subtle, just enough to make lights pop
  lightCtx.globalCompositeOperation = 'source-over'
  lightCtx.fillStyle = 'rgba(0,0,0,0.10)'
  lightCtx.fillRect(0, 0, w, h)
}

/**
 * Punch a light hole into the dark overlay using 'lighter' composite.
 */
export function addLight(source: LightSource) {
  if (!lightCtx) return
  lightCtx.globalCompositeOperation = 'lighter'
  const gradient = lightCtx.createRadialGradient(
    source.x, source.y, 0,
    source.x, source.y, source.radius
  )
  gradient.addColorStop(0, hexAlpha(source.color, Math.min(1, source.intensity * 1.2)))
  gradient.addColorStop(0.3, hexAlpha(source.color, source.intensity * 0.7))
  gradient.addColorStop(0.7, hexAlpha(source.color, source.intensity * 0.25))
  gradient.addColorStop(1, hexAlpha(source.color, 0))
  lightCtx.fillStyle = gradient
  lightCtx.beginPath()
  lightCtx.arc(source.x, source.y, source.radius, 0, Math.PI * 2)
  lightCtx.fill()
}

/**
 * Composite the light map onto the main canvas using 'multiply'.
 * Dark areas darken the scene; lit areas pass through.
 */
export function compositeLightMap(mainCtx: CanvasRenderingContext2D) {
  if (!lightCanvas) return
  mainCtx.save()
  mainCtx.globalCompositeOperation = 'multiply'
  mainCtx.drawImage(lightCanvas, 0, 0)
  mainCtx.restore()
}
