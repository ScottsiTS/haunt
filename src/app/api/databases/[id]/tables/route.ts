import { NextResponse } from 'next/server'
import { getAuthCreds } from '@/lib/auth'
import { tigerListServices, tigerQueryService } from '@/lib/tiger-api'
import { ghostSql } from '@/lib/ghost-mcp'

const isDev = process.env.NODE_ENV === 'development'

const SYSTEM_SCHEMAS = `'pg_catalog','information_schema','_timescaledb_catalog','_timescaledb_config','_timescaledb_internal','_timescaledb_cache'`

const TABLES_QUERY = `
SELECT
  t.schemaname || '.' || t.tablename AS name,
  pg_total_relation_size(quote_ident(t.schemaname) || '.' || quote_ident(t.tablename)) AS size_bytes,
  COALESCE(s.n_live_tup, 0) AS row_count
FROM pg_tables t
LEFT JOIN pg_stat_user_tables s
  ON s.schemaname = t.schemaname AND s.relname = t.tablename
WHERE t.schemaname NOT IN (${SYSTEM_SCHEMAS})
ORDER BY size_bytes DESC
`

export interface TableInfo {
  name: string
  sizeBytes: number
  rowCount: number
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = getAuthCreds(request)
  const { id } = await params

  try {
    if (!creds && isDev) {
      // Ghost MCP bridge — single-column limitation means we need individual queries
      // First get schema.table pairs
      const namesResult = await ghostSql(id,
        `SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname NOT IN (${SYSTEM_SCHEMAS}) ORDER BY tablename`)
      const tables: TableInfo[] = []
      for (const row of namesResult.rows) {
        const qualifiedName = row[0] // e.g. "atrium.customer_mrr"
        const [schema, table] = qualifiedName.split('.')
        const [sizeResult, countResult] = await Promise.all([
          ghostSql(id, `SELECT pg_total_relation_size('"${schema}"."${table}"')`),
          ghostSql(id, `SELECT count(*) FROM "${schema}"."${table}"`),
        ])
        tables.push({
          name: qualifiedName,
          sizeBytes: Number(sizeResult.rows[0]?.[0] ?? 0),
          rowCount: Number(countResult.rows[0]?.[0] ?? 0),
        })
      }
      tables.sort((a, b) => b.sizeBytes - a.sizeBytes)
      return NextResponse.json({ tables })
    }

    if (!creds) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const services = await tigerListServices(creds)
    const svc = services.find((s) => s.id === id)
    if (!svc) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const rows = await tigerQueryService(creds, svc.spec.hostname, svc.spec.port, TABLES_QUERY)
    const tables: TableInfo[] = rows.map((r) => ({
      name: r[0],
      sizeBytes: Number(r[1]),
      rowCount: Number(r[2]),
    }))
    return NextResponse.json({ tables })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
  }
}
