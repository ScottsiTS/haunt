import express from 'express'

const app = express()
app.use(express.json())

// Mock data matching real Ghost MCP format
const MOCK_DATABASES = [
  { id: 'iakkywkuq4', name: 'atrium', size: '339MB', status: 'running' },
  { id: 'vrfdoy5q4i', name: 'cbb-betting-model', size: '255MB', status: 'running' },
  { id: 'mock00003c', name: 'staging', size: '50MB', status: 'paused' },
  { id: 'mock00004d', name: 'analytics', size: '1GB', status: 'running' },
]

// Mock stats responses
const MOCK_STATS: Record<string, { activity: string[][]; cache: string[][]; tables: string[][] }> = {
  'iakkywkuq4': {
    activity: [['876', '12500', '45000']],
    cache: [['92.00']],
    tables: [['8']],
  },
  'vrfdoy5q4i': {
    activity: [['2340', '8900', '120000']],
    cache: [['12.53']],
    tables: [['15']],
  },
  'mock00004d': {
    activity: [['50', '300', '500']],
    cache: [['98.00']],
    tables: [['3']],
  },
}

const DEFAULT_STATS = {
  activity: [['0', '0', '0']],
  cache: [['0']],
  tables: [['0']],
}

app.get('/api/ghost/list', (_req, res) => {
  res.json({ databases: MOCK_DATABASES })
})

app.post('/api/ghost/sql', (req, res) => {
  const { id, query } = req.body
  const stats = MOCK_STATS[id] ?? DEFAULT_STATS

  let rows: string[][] = []
  if (query.includes('pg_stat_statements')) {
    rows = stats.activity
  } else if (query.includes('pg_buffercache')) {
    rows = stats.cache
  } else if (query.includes('information_schema.tables')) {
    rows = stats.tables
  }

  res.json({ result_sets: [{ rows, columns: [] }] })
})

app.post('/api/ghost/schema', (req, res) => {
  const { id } = req.body
  res.json({ schema: `Schema for database ${id}` })
})

const PORT = process.env.BRIDGE_PORT || 3001

app.listen(PORT, () => {
  console.log(`Ghost MCP bridge running on http://localhost:${PORT}`)
})
