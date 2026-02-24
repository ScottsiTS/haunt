import type { GhostDatabase, DatabaseStats, GhostState } from './types'

export function parseSizeToBytes(size: string): number {
  const match = size.match(/^([\d.]+)\s*(KB|MB|GB|TB)$/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  const multipliers: Record<string, number> = {
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  }
  return Math.round(value * (multipliers[unit] ?? 0))
}

export function computeGhostState(
  status: GhostDatabase['status'],
  stats: DatabaseStats | null
): GhostState {
  if (status === 'paused') return 'sleeping'
  if (!stats) return 'idle'
  if (stats.cacheHitPct < 50) return 'distressed'
  if (stats.totalCalls > 100) return 'active'
  return 'idle'
}

export function computeGhostScale(sizeBytes: number, maxSizeBytes: number): number {
  if (maxSizeBytes === 0) return 1
  const ratio = sizeBytes / maxSizeBytes
  return 0.7 + ratio * 0.3 // Maps 0->0.7, 1->1.0 — ghosts look small inside cells
}

export function computeGlowIntensity(stats: DatabaseStats | null): number {
  if (!stats || stats.totalCalls === 0) return 0
  return Math.min(1, stats.totalCalls / 1000)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`
}
