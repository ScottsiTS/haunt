import pg from 'pg'

export interface TigerCreds {
  projectId: string
  accessKey: string
  secretKey: string
}

export interface TigerService {
  id: string
  name: string
  status: string // READY, PAUSED, CONFIGURING, QUEUED, etc.
  spec: {
    hostname: string
    port: number
  }
  resources: {
    millicpu: number
    memory_gb: number
    storage_gb: number
  }
}

/**
 * List all services in a Tiger Cloud project.
 */
export async function tigerListServices(creds: TigerCreds): Promise<TigerService[]> {
  const auth = Buffer.from(`${creds.accessKey}:${creds.secretKey}`).toString('base64')
  const res = await fetch(
    `https://console.cloud.timescale.com/api/v1/projects/${creds.projectId}/services`,
    {
      headers: { Authorization: `Bearer ${auth}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Tiger API ${res.status}: ${text}`)
  }
  return res.json()
}

/**
 * Run a SQL query against a Tiger Cloud service via direct pg connection.
 */
export async function tigerQueryService(
  creds: TigerCreds,
  host: string,
  port: number,
  query: string
): Promise<string[][]> {
  const client = new pg.Client({
    host,
    port,
    user: 'tsdbadmin',
    password: creds.secretKey,
    database: 'tsdb',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  })
  try {
    await client.connect()
    const result = await client.query(query)
    return result.rows.map((row: Record<string, unknown>) => Object.values(row).map(String))
  } finally {
    await client.end().catch(() => {})
  }
}
