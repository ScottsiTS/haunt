'use client'

import { useEffect, useState } from 'react'
import { formatBytes } from '@/lib/ghost-client'
import { COLORS } from '@/lib/constants'
import type { HauntGhost } from '@/lib/types'

interface TableInfo { name: string; sizeBytes: number; rowCount: number }
interface TopQuery { query: string; calls: number; avgTimeMs: number }
interface Details {
  tables: TableInfo[]
  connections: { active: number; idle: number; max: number }
  pgVersion: string
  startedAt: string
  topQueries: TopQuery[]
}

interface GhostDexProps {
  ghost: HauntGhost
  onClose: () => void
}

interface StatDef { label: string; value: number; max: number; color: string; display: string }

function StatBar({ label, value, max, color, display }: StatDef) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 72, fontSize: 10, color: COLORS.textSecondary, textAlign: 'right', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 10, background: '#12121e', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ width: 64, fontSize: 10, color: '#fff', textAlign: 'right', flexShrink: 0 }}>
        {display}
      </span>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: '#6a6a8a', marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#1e1e30', margin: '0 0 12px' }} />
}

function formatUptime(startedAt: string): string {
  if (!startedAt) return 'unknown'
  const start = new Date(startedAt)
  const diff = Date.now() - start.getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((diff % 3600000) / 60000)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function truncateQuery(q: string, maxLen = 80): string {
  const clean = q.replace(/\s+/g, ' ').trim()
  return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean
}

const STATUS_COLORS: Record<string, string> = {
  running: '#a8ff78', paused: '#636e72', creating: '#ffeaa7', error: '#ff6b6b',
}
const BADGE_BG: Record<string, string> = {
  running: '#2d5a1e', paused: '#3a3a4a', creating: '#5a4a1e', error: '#5a1e1e',
}

export function GhostDex({ ghost, onClose }: GhostDexProps) {
  const [details, setDetails] = useState<Details | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setDetails(null)
    fetch(`/api/databases/${ghost.id}/details`)
      .then((r) => r.json())
      .then((d) => setDetails(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ghost.id])

  const stats = ghost.stats
  const statDefs: StatDef[] = stats ? [
    { label: 'QUERIES', value: stats.totalCalls, max: Math.max(stats.totalCalls, 1), color: '#5d5fef', display: stats.totalCalls.toLocaleString() },
    { label: 'ROWS', value: stats.totalRows, max: Math.max(stats.totalRows, 1), color: '#3478f6', display: stats.totalRows.toLocaleString() },
    { label: 'CACHE HIT', value: stats.cacheHitPct, max: 100, color: stats.cacheHitPct > 80 ? '#54b87c' : stats.cacheHitPct > 50 ? '#ffeaa7' : '#ff6b6b', display: `${stats.cacheHitPct}%` },
    { label: 'EXEC TIME', value: stats.totalExecTimeMs / 1000, max: Math.max(stats.totalExecTimeMs / 1000, 1), color: '#a8dff5', display: `${(stats.totalExecTimeMs / 1000).toFixed(1)}s` },
    { label: 'TABLES', value: stats.tableCount, max: Math.max(stats.tableCount, 50), color: '#b0c0fb', display: String(stats.tableCount) },
  ] : []

  const maxTableSize = details?.tables ? Math.max(...details.tables.map(t => t.sizeBytes), 1) : 1

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 360, height: '100vh',
      background: '#0d0d18', borderLeft: '1px solid #1e1e30', zIndex: 200,
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      animation: 'slideIn 0.2s ease-out', boxShadow: '-4px 0 30px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #1e1e30', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{ghost.name}</span>
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: BADGE_BG[ghost.status] ?? '#2a2a3e', color: STATUS_COLORS[ghost.status] ?? '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            {ghost.status}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6a8a', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>
          x
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px 20px' }}>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: COLORS.textSecondary, marginBottom: 14 }}>
          <span>Size: <span style={{ color: '#fff' }}>{formatBytes(ghost.sizeBytes)}</span></span>
          <span>ID: <span style={{ color: '#fff' }}>{ghost.id}</span></span>
        </div>

        {/* DB Info */}
        {details && (
          <>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: COLORS.textSecondary, marginBottom: 14 }}>
              <span>{details.pgVersion}</span>
              <span>Uptime: <span style={{ color: '#fff' }}>{formatUptime(details.startedAt)}</span></span>
            </div>
          </>
        )}

        {/* Stats */}
        <SectionHeader>Stats</SectionHeader>
        {stats ? statDefs.map(s => <StatBar key={s.label} {...s} />) : (
          <div style={{ color: '#636e72', fontSize: 11, fontStyle: 'italic', marginBottom: 8 }}>No stats (paused)</div>
        )}

        <div style={{ height: 12 }} />
        <Divider />

        {/* Connections */}
        {details && (
          <>
            <SectionHeader>Connections</SectionHeader>
            <div style={{ display: 'flex', gap: 20, fontSize: 11, marginBottom: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#a8ff78' }}>{details.connections.active}</div>
                <div style={{ color: '#6a6a8a', fontSize: 9, marginTop: 2 }}>ACTIVE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#ffeaa7' }}>{details.connections.idle}</div>
                <div style={{ color: '#6a6a8a', fontSize: 9, marginTop: 2 }}>IDLE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.textSecondary }}>{details.connections.max}</div>
                <div style={{ color: '#6a6a8a', fontSize: 9, marginTop: 2 }}>MAX</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 6, background: '#12121e', borderRadius: 3, marginTop: 8 }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${((details.connections.active + details.connections.idle) / details.connections.max) * 100}%`,
                    background: `linear-gradient(90deg, #a8ff78 ${(details.connections.active / (details.connections.active + details.connections.idle || 1)) * 100}%, #ffeaa7 0%)`,
                  }} />
                </div>
                <div style={{ fontSize: 9, color: '#6a6a8a', marginTop: 3, textAlign: 'right' }}>
                  {details.connections.active + details.connections.idle}/{details.connections.max}
                </div>
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* Top Queries */}
        {details && details.topQueries.length > 0 && (
          <>
            <SectionHeader>Slowest Queries</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {details.topQueries.map((q, i) => (
                <div key={i} style={{ background: '#12121e', borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#c8d0e0', lineHeight: 1.4, wordBreak: 'break-all' }}>
                    {truncateQuery(q.query)}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 9, color: '#6a6a8a' }}>
                    <span>{q.calls.toLocaleString()} calls</span>
                    <span>avg {q.avgTimeMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Tables */}
        {loading ? (
          <div style={{ color: '#636e72', fontSize: 11, fontStyle: 'italic' }}>Loading...</div>
        ) : details && details.tables.length > 0 ? (
          <>
            <SectionHeader>Tables ({details.tables.length})</SectionHeader>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0 6px', color: '#6a6a8a', fontWeight: 500, fontSize: 10 }}>Name</th>
                  <th style={{ textAlign: 'right', padding: '4px 0 6px', color: '#6a6a8a', fontWeight: 500, fontSize: 10, width: 65 }}>Rows</th>
                  <th style={{ textAlign: 'right', padding: '4px 0 6px', color: '#6a6a8a', fontWeight: 500, fontSize: 10, width: 55 }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {details.tables.map(t => {
                  const pct = (t.sizeBytes / maxTableSize) * 100
                  return (
                    <tr key={t.name} style={{ borderBottom: '1px solid #12121e' }}>
                      <td style={{ padding: '5px 0', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: -4, width: `${pct}%`, height: '100%', background: 'rgba(93,95,239,0.08)', borderRadius: 2 }} />
                        <span style={{ position: 'relative', color: '#c8d0e0' }}>{t.name}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '5px 0', color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>
                        {t.rowCount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '5px 0', color: '#6a6a8a', whiteSpace: 'nowrap' }}>
                        {formatBytes(t.sizeBytes)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <SectionHeader>Tables</SectionHeader>
            <div style={{ color: '#636e72', fontSize: 11, fontStyle: 'italic' }}>No tables</div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
