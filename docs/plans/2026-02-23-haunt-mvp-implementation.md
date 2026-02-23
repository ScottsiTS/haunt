# Haunt MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone Next.js app that visualizes Ghost databases as animated pixel art ghosts in a haunted mansion, where visual properties (size, expression, glow, speed) reflect live database stats.

**Architecture:** Next.js 15 App Router with API routes proxying to the Ghost MCP server. Frontend renders a pixel art mansion on a Canvas 2D element with per-ghost sprite state machines. Polls backend every 10s for fresh stats.

**Tech Stack:** Next.js 15, TypeScript, Canvas 2D API, Tailwind CSS (for non-canvas UI only), Vitest + React Testing Library

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`
- Create: `vitest.config.ts`

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/scottsilverman/haunt
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*" --use-npm
```

**Step 2: Add vitest**

Run:
```bash
cd /Users/scottsilverman/haunt
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Step 3: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 4: Add test script to package.json**

Add to scripts: `"test": "vitest run", "test:watch": "vitest"`

**Step 5: Init git repo and commit**

Run:
```bash
cd /Users/scottsilverman/haunt
git init
git add -A
git commit -m "chore: scaffold Next.js 15 project with vitest"
```

---

## Task 2: Ghost MCP Types and Data Layer

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/ghost-client.ts`
- Create: `src/lib/__tests__/ghost-client.test.ts`

**Step 1: Define types**

Create `src/lib/types.ts`:
```typescript
// Raw data from Ghost MCP
export interface GhostDatabase {
  id: string
  name: string
  size: string // e.g. "339MB"
  status: 'running' | 'paused' | 'creating' | 'error'
}

// Stats we compute per-database
export interface DatabaseStats {
  totalCalls: number
  totalExecTimeMs: number
  totalRows: number
  cacheHitPct: number
  tableCount: number
}

// Merged data for the frontend
export interface HauntGhost {
  id: string
  name: string
  sizeBytes: number
  status: GhostDatabase['status']
  stats: DatabaseStats | null // null if paused or unreachable
}

// Ghost sprite visual state
export type GhostState = 'idle' | 'active' | 'sleeping' | 'distressed'

// Canvas ghost with rendering info
export interface GhostSprite {
  ghost: HauntGhost
  state: GhostState
  x: number
  y: number
  frame: number
  scale: number // 0.5-2.0 based on relative size
  glowIntensity: number // 0-1 based on query activity
}
```

**Step 2: Write failing test for parseSizeToBytes**

Create `src/lib/__tests__/ghost-client.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseSizeToBytes, computeGhostState } from '../ghost-client'

describe('parseSizeToBytes', () => {
  it('parses MB', () => {
    expect(parseSizeToBytes('339MB')).toBe(339 * 1024 * 1024)
  })

  it('parses GB', () => {
    expect(parseSizeToBytes('1GB')).toBe(1024 * 1024 * 1024)
  })

  it('parses KB', () => {
    expect(parseSizeToBytes('512KB')).toBe(512 * 1024)
  })

  it('returns 0 for unparseable', () => {
    expect(parseSizeToBytes('unknown')).toBe(0)
  })
})

describe('computeGhostState', () => {
  it('returns sleeping when paused', () => {
    expect(computeGhostState('paused', null)).toBe('sleeping')
  })

  it('returns idle when no stats', () => {
    expect(computeGhostState('running', null)).toBe('idle')
  })

  it('returns active when calls > 100', () => {
    expect(computeGhostState('running', {
      totalCalls: 500,
      totalExecTimeMs: 100,
      totalRows: 1000,
      cacheHitPct: 95,
      tableCount: 5,
    })).toBe('active')
  })

  it('returns distressed when cache hit < 50%', () => {
    expect(computeGhostState('running', {
      totalCalls: 500,
      totalExecTimeMs: 100,
      totalRows: 1000,
      cacheHitPct: 30,
      tableCount: 5,
    })).toBe('distressed')
  })

  it('returns idle when low activity', () => {
    expect(computeGhostState('running', {
      totalCalls: 10,
      totalExecTimeMs: 5,
      totalRows: 20,
      cacheHitPct: 95,
      tableCount: 2,
    })).toBe('idle')
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd /Users/scottsilverman/haunt && npx vitest run src/lib/__tests__/ghost-client.test.ts`
Expected: FAIL — module not found

**Step 4: Implement ghost-client**

Create `src/lib/ghost-client.ts`:
```typescript
import type { GhostDatabase, DatabaseStats, HauntGhost, GhostState } from './types'

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
  return 0.5 + ratio * 1.5 // Maps 0->0.5, 1->2.0
}

export function computeGlowIntensity(stats: DatabaseStats | null): number {
  if (!stats || stats.totalCalls === 0) return 0
  // Normalize: 0 calls = 0 glow, 1000+ calls = full glow
  return Math.min(1, stats.totalCalls / 1000)
}
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/scottsilverman/haunt && npx vitest run src/lib/__tests__/ghost-client.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
cd /Users/scottsilverman/haunt
git add src/lib/types.ts src/lib/ghost-client.ts src/lib/__tests__/ghost-client.test.ts
git commit -m "feat: add Ghost data types and state computation helpers"
```

---

## Task 3: API Routes — Ghost MCP Proxy

**Files:**
- Create: `src/app/api/databases/route.ts`
- Create: `src/app/api/databases/[id]/schema/route.ts`
- Create: `src/lib/ghost-mcp.ts`

The Ghost MCP server is accessed via the `@anthropic-ai/sdk` MCP client. For the MVP, we'll use a simpler approach: the backend makes HTTP calls to a small server that wraps the Ghost MCP tools — but since this is a demo/dev tool, we'll **hardcode the Ghost MCP tool calls using the `pg` library with connection strings from `ghost_connect`**.

**Step 1: Install pg**

Run:
```bash
cd /Users/scottsilverman/haunt
npm install pg
npm install -D @types/pg
```

**Step 2: Create Ghost MCP wrapper**

Create `src/lib/ghost-mcp.ts`:
```typescript
// Ghost MCP connection layer
// In production this would use the MCP protocol.
// For MVP, we call the Ghost MCP server's HTTP endpoint or use env vars.

const GHOST_API_URL = process.env.GHOST_API_URL || 'http://localhost:3001'

export interface GhostListResponse {
  databases: Array<{
    id: string
    name: string
    size: string
    status: string
  }>
}

export async function ghostList(): Promise<GhostListResponse> {
  const res = await fetch(`${GHOST_API_URL}/api/ghost/list`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Ghost list failed: ${res.status}`)
  return res.json()
}

export async function ghostSql(
  id: string,
  query: string
): Promise<{ rows: string[][] }> {
  const res = await fetch(`${GHOST_API_URL}/api/ghost/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, query }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Ghost SQL failed: ${res.status}`)
  const data = await res.json()
  return { rows: data.result_sets?.[0]?.rows ?? [] }
}

export async function ghostSchema(id: string): Promise<string> {
  const res = await fetch(`${GHOST_API_URL}/api/ghost/schema`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Ghost schema failed: ${res.status}`)
  return res.text()
}
```

**Step 3: Create databases API route**

Create `src/app/api/databases/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { ghostList, ghostSql } from '@/lib/ghost-mcp'
import { parseSizeToBytes, computeGhostState, computeGhostScale, computeGlowIntensity } from '@/lib/ghost-client'
import type { HauntGhost, DatabaseStats } from '@/lib/types'

async function fetchStats(dbId: string): Promise<DatabaseStats | null> {
  try {
    const [activityResult, cacheResult, tableResult] = await Promise.all([
      ghostSql(dbId, `
        SELECT coalesce(sum(calls), 0) as total_calls,
               coalesce(sum(total_exec_time), 0) as total_exec_time_ms,
               coalesce(sum(rows), 0) as total_rows
        FROM pg_stat_statements
      `),
      ghostSql(dbId, `
        SELECT coalesce(
          round(100.0 * count(*) FILTER (WHERE usagecount > 0) / nullif(count(*), 0), 2),
          0
        ) as cache_hit_pct
        FROM pg_buffercache
      `),
      ghostSql(dbId, `
        SELECT count(*) as table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `),
    ])

    return {
      totalCalls: Number(activityResult.rows[0]?.[0] ?? 0),
      totalExecTimeMs: Number(activityResult.rows[0]?.[1] ?? 0),
      totalRows: Number(activityResult.rows[0]?.[2] ?? 0),
      cacheHitPct: Number(cacheResult.rows[0]?.[0] ?? 0),
      tableCount: Number(tableResult.rows[0]?.[0] ?? 0),
    }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const { databases } = await ghostList()

    const ghosts: HauntGhost[] = await Promise.all(
      databases.map(async (db) => {
        const stats = db.status === 'running' ? await fetchStats(db.id) : null
        return {
          id: db.id,
          name: db.name,
          sizeBytes: parseSizeToBytes(db.size),
          status: db.status as HauntGhost['status'],
          stats,
        }
      })
    )

    return NextResponse.json({ ghosts })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch databases' },
      { status: 500 }
    )
  }
}
```

**Step 4: Create schema API route**

Create `src/app/api/databases/[id]/schema/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { ghostSchema } from '@/lib/ghost-mcp'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schema = await ghostSchema(id)
    return NextResponse.json({ schema })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schema' }, { status: 500 })
  }
}
```

**Step 5: Commit**

```bash
cd /Users/scottsilverman/haunt
git add src/lib/ghost-mcp.ts src/app/api/
git commit -m "feat: add API routes proxying Ghost MCP for database stats"
```

---

## Task 4: Ghost MCP Bridge Server

Since the Ghost MCP is an MCP server (not a REST API), we need a small bridge that exposes it as HTTP endpoints that our Next.js API routes can call.

**Files:**
- Create: `server/bridge.ts`
- Create: `server/package.json`

**Step 1: Create bridge server**

Create `server/package.json`:
```json
{
  "name": "haunt-ghost-bridge",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "npx tsx bridge.ts"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "tsx": "^4.19.0"
  }
}
```

Create `server/bridge.ts`:
```typescript
import express from 'express'

// This bridge wraps the Ghost MCP CLI commands as HTTP endpoints.
// It shells out to the Ghost MCP server tools.
// In production, this could use the MCP SDK client directly.

const app = express()
app.use(express.json())

const GHOST_MCP_COMMAND = process.env.GHOST_MCP_COMMAND || 'npx ghost-mcp'

// For MVP: we'll use the ghost MCP tools through their Node SDK
// The Ghost MCP server exposes: ghost_list, ghost_sql, ghost_schema, ghost_connect
// We import and call them directly

let ghostTools: Record<string, Function> | null = null

async function initGhost() {
  // Dynamic import of the ghost MCP module
  // The actual integration depends on Ghost's MCP SDK
  // For now, we provide a mock that returns test data
  // Replace with real Ghost MCP client when available
  console.log('Ghost MCP bridge starting...')
  console.log('Configure GHOST_API_TOKEN env var for authentication')
}

// List databases
app.get('/api/ghost/list', async (_req, res) => {
  try {
    // TODO: Replace with real Ghost MCP client call
    // For development, return mock data matching Ghost's format
    res.json({
      databases: [
        { id: 'demo123456', name: 'demo-db', size: '100MB', status: 'running' },
      ],
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to list databases' })
  }
})

// Execute SQL
app.post('/api/ghost/sql', async (req, res) => {
  try {
    const { id, query } = req.body
    // TODO: Replace with real Ghost MCP client call
    res.json({
      result_sets: [{ rows: [], columns: [] }],
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute SQL' })
  }
})

// Get schema
app.post('/api/ghost/schema', async (req, res) => {
  try {
    const { id } = req.body
    // TODO: Replace with real Ghost MCP client call
    res.json({ schema: 'No tables' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schema' })
  }
})

const PORT = process.env.BRIDGE_PORT || 3001

app.listen(PORT, () => {
  console.log(`Ghost MCP bridge running on http://localhost:${PORT}`)
  initGhost()
})
```

**Step 2: Commit**

```bash
cd /Users/scottsilverman/haunt
git add server/
git commit -m "feat: add Ghost MCP bridge server (mock for development)"
```

---

## Task 5: Pixel Art Sprite Sheet and Constants

**Files:**
- Create: `src/lib/sprites.ts`
- Create: `src/lib/constants.ts`
- Create: `src/lib/__tests__/sprites.test.ts`

**Step 1: Define rendering constants**

Create `src/lib/constants.ts`:
```typescript
// Sprite dimensions
export const SPRITE_SIZE = 16 // Base sprite pixels
export const SPRITE_SCALE = 4 // Render at 4x
export const RENDERED_SIZE = SPRITE_SIZE * SPRITE_SCALE // 64px on screen

// Mansion layout
export const ROOM_WIDTH = 200 // pixels
export const ROOM_HEIGHT = 180 // pixels
export const ROOM_PADDING = 20
export const ROOMS_PER_ROW = 3

// Animation
export const FRAME_RATE = 8 // frames per second for sprite animation
export const BOB_AMPLITUDE = 4 // pixels of vertical bob
export const POLL_INTERVAL = 10_000 // 10 seconds

// Colors (haunted mansion palette)
export const COLORS = {
  background: '#0a0a12',
  roomFloor: '#1a1a2e',
  roomWall: '#16213e',
  wallTrim: '#2a2a4a',
  candleFlame: '#ffaa33',
  candleGlow: 'rgba(255, 170, 51, 0.15)',
  ghostDefault: '#c8d6e5',
  ghostGlow: '#a8ff78',
  ghostDistressed: '#ff6b6b',
  ghostSleeping: '#636e72',
  textPrimary: '#dfe6e9',
  textSecondary: '#b2bec3',
  badgeBg: '#2d3436',
  particle: '#ffeaa7',
} as const
```

**Step 2: Write failing test for sprite data**

Create `src/lib/__tests__/sprites.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { GHOST_SPRITES, getGhostFrame } from '../sprites'

describe('GHOST_SPRITES', () => {
  it('has all 4 states', () => {
    expect(Object.keys(GHOST_SPRITES)).toEqual(
      expect.arrayContaining(['idle', 'active', 'sleeping', 'distressed'])
    )
  })

  it('each state has at least 2 frames', () => {
    for (const state of Object.keys(GHOST_SPRITES) as Array<keyof typeof GHOST_SPRITES>) {
      expect(GHOST_SPRITES[state].length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('getGhostFrame', () => {
  it('cycles through frames', () => {
    const frame0 = getGhostFrame('idle', 0)
    const frame1 = getGhostFrame('idle', 1)
    expect(frame0).toBeDefined()
    expect(frame1).toBeDefined()
  })

  it('wraps frame index', () => {
    const frameCount = GHOST_SPRITES.idle.length
    const wrapped = getGhostFrame('idle', frameCount)
    const first = getGhostFrame('idle', 0)
    expect(wrapped).toEqual(first)
  })
})
```

**Step 3: Run test to verify it fails**

Run: `cd /Users/scottsilverman/haunt && npx vitest run src/lib/__tests__/sprites.test.ts`
Expected: FAIL

**Step 4: Implement sprite data**

Create `src/lib/sprites.ts`:
```typescript
import type { GhostState } from './types'

// 16x16 pixel art ghost sprites stored as 2D arrays
// 0 = transparent, 1 = outline, 2 = body fill, 3 = eye, 4 = mouth, 5 = highlight
type SpriteFrame = number[][]

// Ghost sprite frames per state
// Each ghost is a classic Pac-Man-style ghost shape
export const GHOST_SPRITES: Record<GhostState, SpriteFrame[]> = {
  idle: [
    // Frame 0: neutral, tail left
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,2,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: neutral, tail right
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,2,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,0,1,2,2,1,0,1,2,2,1,0,1,2,2,1],
      [0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0],
    ],
  ],
  active: [
    // Frame 0: happy, eyes arched up
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,5,2,2,2,2,5,5,2,2,2,1,0],
      [1,2,2,2,3,3,2,2,2,2,3,3,2,2,2,1],
      [1,2,2,3,2,2,2,2,2,3,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,4,2,2,2,4,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,4,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: happy, slight squish
    [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,5,5,2,2,2,2,5,5,2,2,2,1,0],
      [1,2,2,2,3,3,2,2,2,2,3,3,2,2,2,1],
      [1,2,2,3,2,2,2,2,2,3,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,4,2,2,2,4,2,2,2,2,2,1],
      [1,2,2,2,2,2,4,4,4,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,0,1,2,2,1,0,1,2,2,1,0,1,2,2,1],
      [0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0],
    ],
  ],
  sleeping: [
    // Frame 0: eyes closed
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [1,2,2,3,3,3,2,2,2,3,3,3,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: eyes closed (identical — sleeping doesn't animate much)
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [1,2,2,3,3,3,2,2,2,3,3,3,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
  ],
  distressed: [
    // Frame 0: squiggly mouth, worried eyes
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,5,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,4,2,4,2,4,2,4,2,2,2,2,1],
      [1,2,2,2,2,4,2,4,2,4,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
    // Frame 1: shake offset (rendered with x+1 offset, same sprite)
    [
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
      [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
      [0,1,2,2,5,2,2,2,2,2,5,2,2,2,1,0],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,3,3,2,2,2,2,3,3,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,4,2,4,2,4,2,2,2,2,2,1],
      [1,2,2,2,4,2,4,2,4,2,4,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,2,1,0,1,2,2,1,0,1,2,2,1,0,1],
      [0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],
    ],
  ],
}

export function getGhostFrame(state: GhostState, frameIndex: number): SpriteFrame {
  const frames = GHOST_SPRITES[state]
  return frames[frameIndex % frames.length]
}
```

**Step 5: Run tests**

Run: `cd /Users/scottsilverman/haunt && npx vitest run src/lib/__tests__/sprites.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
cd /Users/scottsilverman/haunt
git add src/lib/sprites.ts src/lib/constants.ts src/lib/__tests__/sprites.test.ts
git commit -m "feat: add pixel art ghost sprites and rendering constants"
```

---

## Task 6: Canvas Renderer — Ghost Drawing

**Files:**
- Create: `src/lib/renderer.ts`
- Create: `src/lib/__tests__/renderer.test.ts`

**Step 1: Write failing test for drawGhostSprite**

Create `src/lib/__tests__/renderer.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { spriteColorMap, computeBobOffset } from '../renderer'
import { COLORS } from '../constants'

describe('spriteColorMap', () => {
  it('maps 0 to transparent', () => {
    expect(spriteColorMap(0, COLORS.ghostDefault, 0)).toBe('transparent')
  })

  it('maps 1 to outline (#000)', () => {
    expect(spriteColorMap(1, COLORS.ghostDefault, 0)).toBe('#111122')
  })

  it('maps 2 to body color', () => {
    expect(spriteColorMap(2, COLORS.ghostDefault, 0)).toBe(COLORS.ghostDefault)
  })

  it('maps 3 to eye color', () => {
    expect(spriteColorMap(3, COLORS.ghostDefault, 0)).toBe('#2d3436')
  })
})

describe('computeBobOffset', () => {
  it('returns 0 at frame 0', () => {
    expect(computeBobOffset(0, 4)).toBeCloseTo(0, 0)
  })

  it('returns value within amplitude range', () => {
    for (let f = 0; f < 60; f++) {
      const offset = computeBobOffset(f, 4)
      expect(Math.abs(offset)).toBeLessThanOrEqual(4)
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/scottsilverman/haunt && npx vitest run src/lib/__tests__/renderer.test.ts`
Expected: FAIL

**Step 3: Implement renderer**

Create `src/lib/renderer.ts`:
```typescript
import { SPRITE_SCALE, BOB_AMPLITUDE, COLORS, ROOM_WIDTH, ROOM_HEIGHT, ROOM_PADDING, ROOMS_PER_ROW } from './constants'
import { getGhostFrame } from './sprites'
import type { GhostSprite } from './types'

export function spriteColorMap(
  value: number,
  bodyColor: string,
  glowIntensity: number
): string {
  switch (value) {
    case 0: return 'transparent'
    case 1: return '#111122' // outline
    case 2: return bodyColor
    case 3: return '#2d3436' // eyes
    case 4: return '#636e72' // mouth
    case 5: return mixColor(bodyColor, '#ffffff', 0.4) // highlight
    default: return bodyColor
  }
}

function mixColor(base: string, mix: string, amount: number): string {
  // Simple color mixing — returns a lighter version for highlights
  return base // Simplified for MVP; real mixing would parse hex
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
    bobOffset = computeBobOffset(globalFrame * 2, BOB_AMPLITUDE) // Faster bob
  } else if (sprite.state === 'idle') {
    bobOffset = computeBobOffset(globalFrame, BOB_AMPLITUDE)
  } else if (sprite.state === 'distressed') {
    bobOffset = (globalFrame % 2 === 0 ? 2 : -2) // Shake
  }
  // sleeping: no bob

  const drawX = sprite.x
  const drawY = sprite.y + bobOffset

  // Draw glow behind ghost
  if (sprite.glowIntensity > 0) {
    const glowRadius = 40 * sprite.scale * sprite.glowIntensity
    const gradient = ctx.createRadialGradient(
      drawX + (8 * scale), drawY + (8 * scale),
      0,
      drawX + (8 * scale), drawY + (8 * scale),
      glowRadius
    )
    const glowColor = sprite.state === 'distressed' ? COLORS.ghostDistressed : COLORS.ghostGlow
    gradient.addColorStop(0, glowColor + '44')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(
      drawX - glowRadius, drawY - glowRadius,
      16 * scale + glowRadius * 2, 16 * scale + glowRadius * 2
    )
  }

  // Determine body color
  let bodyColor = COLORS.ghostDefault
  if (sprite.state === 'sleeping') bodyColor = COLORS.ghostSleeping
  if (sprite.state === 'distressed') bodyColor = COLORS.ghostDistressed
  if (sprite.state === 'active') bodyColor = mixGhostColor(COLORS.ghostDefault, COLORS.ghostGlow, sprite.glowIntensity)

  // Draw sprite pixel by pixel
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const color = spriteColorMap(frame[y][x], bodyColor, sprite.glowIntensity)
      if (color === 'transparent') continue
      ctx.fillStyle = color
      ctx.fillRect(
        drawX + x * scale,
        drawY + y * scale,
        scale,
        scale
      )
    }
  }

  // Draw name above ghost
  ctx.fillStyle = COLORS.textPrimary
  ctx.font = `${10 * sprite.scale}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(
    sprite.ghost.name,
    drawX + 8 * scale,
    drawY - 8
  )

  // Draw table count badge
  if (sprite.ghost.stats) {
    const badgeText = `${sprite.ghost.stats.tableCount} tables`
    ctx.fillStyle = COLORS.badgeBg
    const textWidth = ctx.measureText(badgeText).width
    ctx.fillRect(
      drawX + 8 * scale - textWidth / 2 - 4,
      drawY + 17 * scale,
      textWidth + 8,
      14
    )
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = '10px monospace'
    ctx.fillText(badgeText, drawX + 8 * scale, drawY + 17 * scale + 11)
  }
}

function mixGhostColor(base: string, target: string, amount: number): string {
  if (amount <= 0) return base
  if (amount >= 1) return target
  // Parse hex colors and interpolate
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
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

export function drawRoom(
  ctx: CanvasRenderingContext2D,
  roomIndex: number,
  totalRooms: number
) {
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

  // Candle (left side of room)
  drawCandle(ctx, x + 15, y + 12)

  // Candle (right side of room)
  drawCandle(ctx, x + ROOM_WIDTH - 25, y + 12)

  return { x: x + ROOM_WIDTH / 2 - 32, y: y + 40 }
}

function drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Candle body
  ctx.fillStyle = '#dfe6e9'
  ctx.fillRect(x, y + 4, 4, 8)

  // Flame (flickers via random offset)
  const flicker = Math.random() * 2 - 1
  ctx.fillStyle = COLORS.candleFlame
  ctx.fillRect(x + flicker, y, 4, 4)

  // Glow
  const gradient = ctx.createRadialGradient(x + 2, y + 2, 0, x + 2, y + 2, 15)
  gradient.addColorStop(0, COLORS.candleGlow)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(x - 13, y - 13, 30, 30)
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  sprite: GhostSprite,
  globalFrame: number,
  scale: number
) {
  const cx = sprite.x + 8 * SPRITE_SCALE * sprite.scale
  const cy = sprite.y

  if (sprite.state === 'sleeping') {
    // Zzz particles
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
    // Sparkle particles
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
    // Sweat drops
    const dropY = cy + 8 + (globalFrame % 20)
    ctx.fillStyle = '#74b9ff'
    ctx.globalAlpha = 1 - (globalFrame % 20) / 20
    ctx.fillRect(cx + 28, dropY, 3, 5)
    ctx.fillRect(cx - 12, dropY + 5, 3, 5)
    ctx.globalAlpha = 1
  }
}
```

**Step 4: Run tests**

Run: `cd /Users/scottsilverman/haunt && npx vitest run src/lib/__tests__/renderer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
cd /Users/scottsilverman/haunt
git add src/lib/renderer.ts src/lib/__tests__/renderer.test.ts
git commit -m "feat: add Canvas 2D ghost renderer with room drawing and particles"
```

---

## Task 7: MansionCanvas React Component

**Files:**
- Create: `src/components/MansionCanvas.tsx`
- Create: `src/hooks/useGhostData.ts`
- Create: `src/hooks/useAnimationLoop.ts`

**Step 1: Create data fetching hook**

Create `src/hooks/useGhostData.ts`:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { HauntGhost } from '@/lib/types'
import { POLL_INTERVAL } from '@/lib/constants'

export function useGhostData() {
  const [ghosts, setGhosts] = useState<HauntGhost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGhosts = useCallback(async () => {
    try {
      const res = await fetch('/api/databases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setGhosts(data.ghosts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGhosts()
    const interval = setInterval(fetchGhosts, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchGhosts])

  return { ghosts, error, loading, refetch: fetchGhosts }
}
```

**Step 2: Create animation loop hook**

Create `src/hooks/useAnimationLoop.ts`:
```typescript
'use client'

import { useRef, useEffect, useCallback } from 'react'
import { FRAME_RATE } from '@/lib/constants'

export function useAnimationLoop(
  callback: (frame: number) => void
) {
  const frameRef = useRef(0)
  const lastTimeRef = useRef(0)
  const rafRef = useRef<number>(0)

  const animate = useCallback(
    (timestamp: number) => {
      const elapsed = timestamp - lastTimeRef.current
      if (elapsed > 1000 / FRAME_RATE) {
        frameRef.current++
        lastTimeRef.current = timestamp
        callback(frameRef.current)
      }
      rafRef.current = requestAnimationFrame(animate)
    },
    [callback]
  )

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])
}
```

**Step 3: Create MansionCanvas component**

Create `src/components/MansionCanvas.tsx`:
```typescript
'use client'

import { useRef, useCallback, useMemo } from 'react'
import { useGhostData } from '@/hooks/useGhostData'
import { useAnimationLoop } from '@/hooks/useAnimationLoop'
import { drawRoom, drawGhost, drawParticles } from '@/lib/renderer'
import { computeGhostState, computeGhostScale, computeGlowIntensity } from '@/lib/ghost-client'
import { COLORS, ROOM_WIDTH, ROOM_HEIGHT, ROOM_PADDING, ROOMS_PER_ROW, SPRITE_SCALE } from '@/lib/constants'
import type { GhostSprite } from '@/lib/types'

export function MansionCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ghosts, error, loading } = useGhostData()
  const spriteFrameRef = useRef<Map<string, number>>(new Map())

  // Compute canvas dimensions based on ghost count
  const { width, height } = useMemo(() => {
    const count = Math.max(ghosts.length, 1)
    const cols = Math.min(count, ROOMS_PER_ROW)
    const rows = Math.ceil(count / ROOMS_PER_ROW)
    return {
      width: cols * (ROOM_WIDTH + ROOM_PADDING) + ROOM_PADDING,
      height: rows * (ROOM_HEIGHT + ROOM_PADDING) + ROOM_PADDING,
    }
  }, [ghosts.length])

  // Find max size for relative scaling
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

      // Clear
      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw rooms and ghosts
      ghosts.forEach((ghost, i) => {
        const roomPos = drawRoom(ctx, i, ghosts.length)

        // Update sprite frame counter
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
        drawParticles(ctx, sprite, globalFrame, sprite.scale)
      })

      // Draw title
      ctx.fillStyle = COLORS.textPrimary
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`HAUNT — ${ghosts.length} ghost${ghosts.length !== 1 ? 's' : ''}`, 10, height - 10)
    },
    [ghosts, maxSizeBytes, height]
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
      style={{
        imageRendering: 'pixelated',
        background: COLORS.background,
      }}
    />
  )
}
```

**Step 4: Commit**

```bash
cd /Users/scottsilverman/haunt
git add src/components/MansionCanvas.tsx src/hooks/
git commit -m "feat: add MansionCanvas component with animation loop and data polling"
```

---

## Task 8: Main Page and Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update globals.css**

Replace `src/app/globals.css` with:
```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  background: #0a0a12;
  color: #dfe6e9;
  font-family: 'Courier New', monospace;
  overflow-x: hidden;
}

canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

**Step 2: Update layout.tsx**

Replace `src/app/layout.tsx` with:
```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Haunt — Ghost DB Dashboard',
  description: 'See your Ghost databases as pixel art ghosts in a haunted mansion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**Step 3: Update page.tsx**

Replace `src/app/page.tsx` with:
```typescript
import { MansionCanvas } from '@/components/MansionCanvas'

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <h1 style={{
        fontFamily: 'monospace',
        fontSize: '2rem',
        letterSpacing: '0.3em',
        marginBottom: '1rem',
        color: '#dfe6e9',
        textTransform: 'uppercase',
      }}>
        Haunt
      </h1>
      <p style={{
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        color: '#b2bec3',
        marginBottom: '2rem',
      }}>
        your ghost databases, alive
      </p>
      <MansionCanvas />
    </main>
  )
}
```

**Step 4: Verify app builds**

Run: `cd /Users/scottsilverman/haunt && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
cd /Users/scottsilverman/haunt
git add src/app/layout.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: add Haunt main page with mansion layout"
```

---

## Task 9: Dev Environment with Mock Data

For local development without a Ghost MCP bridge, provide mock data so the canvas renders immediately.

**Files:**
- Create: `src/lib/mock-data.ts`
- Modify: `src/hooks/useGhostData.ts`
- Create: `.env.local`

**Step 1: Create mock data**

Create `src/lib/mock-data.ts`:
```typescript
import type { HauntGhost } from './types'

export const MOCK_GHOSTS: HauntGhost[] = [
  {
    id: 'mock00001a',
    name: 'atrium',
    sizeBytes: 339 * 1024 * 1024,
    status: 'running',
    stats: {
      totalCalls: 876,
      totalExecTimeMs: 12500,
      totalRows: 45000,
      cacheHitPct: 92,
      tableCount: 8,
    },
  },
  {
    id: 'mock00002b',
    name: 'cbb-betting',
    sizeBytes: 255 * 1024 * 1024,
    status: 'running',
    stats: {
      totalCalls: 2340,
      totalExecTimeMs: 8900,
      totalRows: 120000,
      cacheHitPct: 12,
      tableCount: 15,
    },
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
    stats: {
      totalCalls: 50,
      totalExecTimeMs: 300,
      totalRows: 500,
      cacheHitPct: 98,
      tableCount: 3,
    },
  },
]
```

**Step 2: Update useGhostData to use mocks in dev**

Modify `src/hooks/useGhostData.ts` — add mock data fallback:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { HauntGhost } from '@/lib/types'
import { POLL_INTERVAL } from '@/lib/constants'
import { MOCK_GHOSTS } from '@/lib/mock-data'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export function useGhostData() {
  const [ghosts, setGhosts] = useState<HauntGhost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGhosts = useCallback(async () => {
    if (USE_MOCK) {
      setGhosts(MOCK_GHOSTS)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/databases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setGhosts(data.ghosts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGhosts()
    if (!USE_MOCK) {
      const interval = setInterval(fetchGhosts, POLL_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [fetchGhosts])

  return { ghosts, error, loading, refetch: fetchGhosts }
}
```

**Step 3: Create .env.local**

Create `.env.local`:
```
NEXT_PUBLIC_USE_MOCK=true
GHOST_API_URL=http://localhost:3001
```

**Step 4: Run the dev server and verify visually**

Run: `cd /Users/scottsilverman/haunt && npm run dev`
Open: `http://localhost:3000`
Expected: See 4 ghosts in mansion rooms — one active (cbb-betting, bright/fast), one distressed (low cache), one sleeping (staging, paused), one idle (analytics, low activity)

**Step 5: Commit**

```bash
cd /Users/scottsilverman/haunt
git add src/lib/mock-data.ts src/hooks/useGhostData.ts .env.local
git commit -m "feat: add mock data mode for local development"
```

---

## Task 10: README and Final Polish

**Files:**
- Create: `README.md`

**Step 1: Write README**

Create `README.md`:
```markdown
# Haunt

> See your Ghost databases as pixel art ghosts in a haunted mansion.

Each database is a ghost. Its size, activity, cache health, and status are reflected as visual properties — no charts, no tables, just ghosts.

## Quick Start

```bash
# Install
npm install

# Run with mock data (no Ghost connection needed)
npm run dev

# Run with real Ghost MCP connection
NEXT_PUBLIC_USE_MOCK=false GHOST_API_URL=http://localhost:3001 npm run dev
```

## How It Works

- **Ghost size** = database size (bigger DB = bigger ghost)
- **Ghost speed** = query activity (busy = fast, idle = slow)
- **Ghost face** = cache hit ratio (happy = healthy, sweating = poor)
- **Ghost state** = running/paused (floating vs sleeping)
- **Table count** = badge below ghost

## Ghost MCP Bridge

Haunt talks to Ghost through a bridge server that wraps the MCP tools as HTTP endpoints:

```bash
cd server
npm install
npm start
```

## Tech Stack

- Next.js 15 (App Router)
- Canvas 2D pixel art rendering
- TypeScript
- Ghost MCP (data source)
```

**Step 2: Commit**

```bash
cd /Users/scottsilverman/haunt
git add README.md
git commit -m "docs: add README with setup instructions"
```
