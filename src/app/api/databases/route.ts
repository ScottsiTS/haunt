import { NextResponse } from 'next/server'
import { ghostList, ghostSql } from '@/lib/ghost-mcp'
import { parseSizeToBytes } from '@/lib/ghost-client'
import type { HauntGhost, DatabaseStats } from '@/lib/types'

async function fetchStats(dbId: string): Promise<DatabaseStats | null> {
  try {
    const [activityResult, cacheResult, tableResult] = await Promise.all([
      ghostSql(
        dbId,
        `SELECT coalesce(sum(calls), 0) as total_calls, coalesce(sum(total_exec_time), 0) as total_exec_time_ms, coalesce(sum(rows), 0) as total_rows FROM pg_stat_statements`
      ),
      ghostSql(
        dbId,
        `SELECT coalesce(round(100.0 * count(*) FILTER (WHERE usagecount > 0) / nullif(count(*), 0), 2), 0) as cache_hit_pct FROM pg_buffercache`
      ),
      ghostSql(
        dbId,
        `SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'`
      ),
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
    return NextResponse.json({ error: 'Failed to fetch databases' }, { status: 500 })
  }
}
