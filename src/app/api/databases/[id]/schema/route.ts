import { NextResponse } from 'next/server'
import { getAuthCreds } from '@/lib/auth'
import { tigerListServices, tigerQueryService } from '@/lib/tiger-api'
import { ghostSchema } from '@/lib/ghost-mcp'

const isDev = process.env.NODE_ENV === 'development'

const SCHEMA_QUERY = `
SELECT
  'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
  string_agg(column_name || ' ' || data_type, ', ') || ');'
FROM pg_tables t
JOIN information_schema.columns c
  ON c.table_schema = t.schemaname AND c.table_name = t.tablename
WHERE t.schemaname NOT IN ('pg_catalog', 'information_schema', '_timescaledb_catalog', '_timescaledb_config', '_timescaledb_internal', '_timescaledb_cache')
GROUP BY t.schemaname, t.tablename
ORDER BY t.tablename
`

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const creds = getAuthCreds(request)
  const { id } = await params

  try {
    // Dev without creds: use Ghost MCP bridge
    if (!creds && isDev) {
      const schema = await ghostSchema(id)
      return NextResponse.json({ schema })
    }
    if (!creds) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const services = await tigerListServices(creds)
    const svc = services.find((s) => s.id === id)
    if (!svc) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const rows = await tigerQueryService(creds, svc.spec.hostname, svc.spec.port, SCHEMA_QUERY)
    const schema = rows.map((r) => r[0]).join('\n\n')
    return NextResponse.json({ schema })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schema' }, { status: 500 })
  }
}
