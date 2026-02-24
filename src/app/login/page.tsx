'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [projectId, setProjectId] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, accessKey, secretKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Authentication failed')
        return
      }
      router.push('/')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: '#12121e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#e0e0f0',
    fontFamily: 'monospace',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <main style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a14',
      fontFamily: 'monospace',
      color: '#e0e0f0',
    }}>
      <div style={{
        width: 380,
        padding: 32,
        background: '#0f0f1a',
        border: '1px solid #1e1e30',
        borderRadius: 12,
        boxShadow: '0 0 60px rgba(100, 80, 200, 0.08)',
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: 4,
          letterSpacing: 4,
        }}>
          HAUNT
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#6a6a8a',
          fontSize: 12,
          marginBottom: 28,
        }}>
          Connect your Tiger Cloud databases
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: '#8888aa', marginBottom: 4, display: 'block' }}>
              Project ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#8888aa', marginBottom: 4, display: 'block' }}>
              Access Key (Client ID)
            </label>
            <input
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#8888aa', marginBottom: 4, display: 'block' }}>
              Secret Key (Client Secret)
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ color: '#ff4466', fontSize: 12, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 0',
              background: loading ? '#2a2a3e' : '#4a3a8a',
              color: '#e0e0f0',
              border: 'none',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              letterSpacing: 1,
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Connecting...' : 'Enter the Mansion'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 11,
          color: '#4a4a6a',
        }}>
          Get credentials from{' '}
          <a
            href="https://console.cloud.timescale.com/dashboard/services"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#7a6ab8' }}
          >
            Tiger Cloud Console
          </a>
        </p>
      </div>
    </main>
  )
}
