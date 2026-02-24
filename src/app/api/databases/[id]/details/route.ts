import { NextResponse } from 'next/server'
import { getAuthCreds } from '@/lib/auth'
import { tigerListServices, tigerQueryService } from '@/lib/tiger-api'
import { ghostSql } from '@/lib/ghost-mcp'

const isDev = process.env.NODE_ENV === 'development'

const SYSTEM_SCHEMAS = `'pg_catalog','information_schema','_timescaledb_catalog','_timescaledb_config','_timescaledb_internal','_timescaledb_cache'`

// Helper: run a single-value query via Ghost MCP bridge
async function ghostVal(id: string, query: string): Promise<string> {
  const r = await ghostSql(id, query)
  return r.rows[0]?.[0] ?? ''
}

async function fetchDetailsGhost(id: string) {
  // Tables (individual queries due to bridge single-column limitation)
  const namesResult = await ghostSql(id,
    `SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname NOT IN (${SYSTEM_SCHEMAS}) ORDER BY tablename`)
  const tables = []
  for (const row of namesResult.rows) {
    const [schema, table] = row[0].split('.')
    const [sizeResult, countResult] = await Promise.all([
      ghostSql(id, `SELECT pg_total_relation_size('"${schema}"."${table}"')`),
      ghostSql(id, `SELECT count(*) FROM "${schema}"."${table}"`),
    ])
    tables.push({
      name: table,
      sizeBytes: Number(sizeResult.rows[0]?.[0] ?? 0),
      rowCount: Number(countResult.rows[0]?.[0] ?? 0),
    })
  }
  tables.sort((a, b) => b.sizeBytes - a.sizeBytes)

  // Connections
  const [activeConns, idleConns, maxConns] = await Promise.all([
    ghostVal(id, `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'`),
    ghostVal(id, `SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'`),
    ghostVal(id, `SELECT setting FROM pg_settings WHERE name = 'max_connections'`),
  ])

  // DB age + version
  const [pgVersion, dbCreated] = await Promise.all([
    ghostVal(id, `SELECT version()`),
    ghostVal(id, `SELECT pg_postmaster_start_time()`),
  ])

  // Top queries by total exec time
  const topQueries = []
  const topResult = await ghostSql(id,
    `SELECT query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5`)
  for (const row of topResult.rows) {
    const q = row[0]
    const [callsR, avgR] = await Promise.all([
      ghostVal(id, `SELECT calls FROM pg_stat_statements WHERE query = '${q.replace(/'/g, "''")}'`),
      ghostVal(id, `SELECT round(mean_exec_time::numeric, 2) FROM pg_stat_statements WHERE query = '${q.replace(/'/g, "''")}'`),
    ])
    topQueries.push({ query: q, calls: Number(callsR || 0), avgTimeMs: Number(avgR || 0) })
  }

  return {
    tables,
    connections: { active: Number(activeConns), idle: Number(idleConns), max: Number(maxConns) },
    pgVersion: pgVersion.split(' ').slice(0, 2).join(' '),
    startedAt: dbCreated,
    topQueries,
  }
}

async function fetchDetailsTiger(creds: Parameters<typeof tigerQueryService>[0], host: string, port: number) {
  const query = (sql: string) => tigerQueryService(creds, host, port, sql)

  const [tablesRows, connRows, versionRows, startRows, topRows] = await Promise.all([
    query(`
      SELECT t.tablename, pg_total_relation_size(quote_ident(t.schemaname) || '.' || quote_ident(t.tablename)),
             COALESCE(s.n_live_tup, 0)
      FROM pg_tables t LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.schemaname AND s.relname = t.tablename
      WHERE t.schemaname NOT IN (${SYSTEM_SCHEMAS}) ORDER BY 2 DESC`),
    query(`SELECT count(*) FILTER (WHERE state='active'), count(*) FILTER (WHERE state='idle'), (SELECT setting FROM pg_settings WHERE name='max_connections') FROM pg_stat_activity`),
    query(`SELECT version()`),
    query(`SELECT pg_postmaster_start_time()`),
    query(`SELECT query, calls, round(mean_exec_time::numeric, 2) FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5`),
  ])

  return {
    tables: tablesRows.map(r => ({ name: r[0], sizeBytes: Number(r[1]), rowCount: Number(r[2]) })),
    connections: { active: Number(connRows[0]?.[0] ?? 0), idle: Number(connRows[0]?.[1] ?? 0), max: Number(connRows[0]?.[2] ?? 0) },
    pgVersion: (versionRows[0]?.[0] ?? '').split(' ').slice(0, 2).join(' '),
    startedAt: startRows[0]?.[0] ?? '',
    topQueries: topRows.map(r => ({ query: r[0], calls: Number(r[1]), avgTimeMs: Number(r[2]) })),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = getAuthCreds(request)
  const { id } = await params

  try {
    if (!creds && isDev) {
      const details = await fetchDetailsGhost(id)
      return NextResponse.json(details)
    }
    if (!creds) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const services = await tigerListServices(creds)
    const svc = services.find((s) => s.id === id)
    if (!svc) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const details = await fetchDetailsTiger(creds, svc.spec.hostname, svc.spec.port)
    return NextResponse.json(details)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 })
  }
}
