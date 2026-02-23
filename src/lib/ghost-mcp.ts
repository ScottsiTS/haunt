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
  const res = await fetch(`${GHOST_API_URL}/api/ghost/list`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Ghost list failed: ${res.status}`)
  return res.json()
}

export async function ghostSql(id: string, query: string): Promise<{ rows: string[][] }> {
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
