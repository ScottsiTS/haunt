import type { HauntGhost } from './types'

export const MOCK_GHOSTS: HauntGhost[] = [
  {
    id: 'mock00001a',
    name: 'atrium',
    sizeBytes: 339 * 1024 * 1024,
    status: 'running',
    stats: { totalCalls: 876, totalExecTimeMs: 12500, totalRows: 45000, cacheHitPct: 92, tableCount: 8 },
  },
  {
    id: 'mock00002b',
    name: 'cbb-betting',
    sizeBytes: 255 * 1024 * 1024,
    status: 'running',
    stats: { totalCalls: 2340, totalExecTimeMs: 8900, totalRows: 120000, cacheHitPct: 12, tableCount: 15 },
  },
  {
    id: 'mock00003c',
    name: 'staging',
    sizeBytes: 50 * 1024 * 1024,
    status: 'paused',
    stats: null,
  },
  {
    id: 'mock00004d',
    name: 'analytics',
    sizeBytes: 1024 * 1024 * 1024,
    status: 'running',
    stats: { totalCalls: 50, totalExecTimeMs: 300, totalRows: 500, cacheHitPct: 98, tableCount: 3 },
  },
]
