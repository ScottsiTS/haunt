import { NextResponse } from 'next/server'
import { getAuthCreds } from '@/lib/auth'
import { tigerListServices, tigerQueryService, type TigerCreds, type TigerService } from '@/lib/tiger-api'
import { ghostList, ghostSql } from '@/lib/ghost-mcp'
import { parseSizeToBytes } from '@/lib/ghost-client'
import type { HauntGhost, DatabaseStats } from '@/lib/types'

const isDev = process.env.NODE_ENV === 'development'

// --- Tiger Cloud path (production, authenticated users) ---

function mapStatus(status: string): HauntGhost['status'] {
  switch (status.toUpperCase()) {
    case 'READY': return 'running'
    case 'PAUSED': return 'paused'
    case 'CONFIGURING':
    case 'QUEUED': return 'creating'
    default: return 'error'
  }
}

async function fetchStatsTiger(
  creds: TigerCreds,
  host: string,
  port: number
): Promise<DatabaseStats | null> {
  try {
    const [activityResult, cacheResult, tableResult] = await Promise.all([
      tigerQueryService(creds, host, port,
        `SELECT coalesce(sum(calls), 0), coalesce(sum(total_exec_time), 0), coalesce(sum(rows), 0) FROM pg_stat_statements`),
      tigerQueryService(creds, host, port,
        `SELECT coalesce(round(100.0 * count(*) FILTER (WHERE usagecount > 0) / nullif(count(*), 0), 2), 0) FROM pg_buffercache`),
      tigerQueryService(creds, host, port,
        `SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema', '_timescaledb_catalog', '_timescaledb_config', '_timescaledb_internal', '_timescaledb_cache')`),
    ])
    return {
      totalCalls: Number(activityResult[0]?.[0] ?? 0),
      totalExecTimeMs: Number(activityResult[0]?.[1] ?? 0),
      totalRows: Number(activityResult[0]?.[2] ?? 0),
      cacheHitPct: Number(cacheResult[0]?.[0] ?? 0),
      tableCount: Number(tableResult[0]?.[0] ?? 0),
    }
  } catch {
    return null
  }
}

async function getTigerGhosts(creds: TigerCreds): Promise<HauntGhost[]> {
  const services = await tigerListServices(creds)
  return Promise.all(
    services.map(async (svc: TigerService) => {
      const status = mapStatus(svc.status)
      const stats = status === 'running'
        ? await fetchStatsTiger(creds, svc.spec.hostname, svc.spec.port)
        : null
      return {
        id: svc.id,
        name: svc.name,
        sizeBytes: svc.resources.storage_gb * 1024 * 1024 * 1024,
        status,
        stats,
      }
    })
  )
}

// --- Ghost MCP bridge path (dev) ---

async function fetchStatsGhost(dbId: string): Promise<DatabaseStats | null> {
  try {
    // Ghost MCP bridge returns one value per query, so split into separate queries
    const [callsResult, execResult, rowsResult, cacheResult, tableResult] = await Promise.all([
      ghostSql(dbId, `SELECT coalesce(sum(calls), 0) FROM pg_stat_statements`),
      ghostSql(dbId, `SELECT coalesce(sum(total_exec_time), 0) FROM pg_stat_statements`),
      ghostSql(dbId, `SELECT coalesce(sum(rows), 0) FROM pg_stat_statements`),
      ghostSql(dbId, `SELECT coalesce(round(100.0 * count(*) FILTER (WHERE usagecount > 0) / nullif(count(*), 0), 2), 0) FROM pg_buffercache`),
      ghostSql(dbId, `SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema', '_timescaledb_catalog', '_timescaledb_config', '_timescaledb_internal', '_timescaledb_cache')`),
    ])
    return {
      totalCalls: Number(callsResult.rows[0]?.[0] ?? 0),
      totalExecTimeMs: Number(execResult.rows[0]?.[0] ?? 0),
      totalRows: Number(rowsResult.rows[0]?.[0] ?? 0),
      cacheHitPct: Number(cacheResult.rows[0]?.[0] ?? 0),
      tableCount: Number(tableResult.rows[0]?.[0] ?? 0),
    }
  } catch {
    return null
  }
}

async function getGhostMcpGhosts(): Promise<HauntGhost[]> {
  const { databases } = await ghostList()
  return Promise.all(
    databases.map(async (db) => {
      const stats = db.status === 'running' ? await fetchStatsGhost(db.id) : null
      return {
        id: db.id,
        name: db.name,
        sizeBytes: parseSizeToBytes(db.size),
        status: db.status as HauntGhost['status'],
        stats,
      }
    })
  )
}

// --- Route handler ---

export async function GET(request: Request) {
  try {
    // In dev without creds, use Ghost MCP bridge
    const creds = getAuthCreds(request)
    if (!creds && isDev) {
      const ghosts = await getGhostMcpGhosts()
      return NextResponse.json({ ghosts })
    }
    if (!creds) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const ghosts = await getTigerGhosts(creds)
    return NextResponse.json({ ghosts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch databases'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
