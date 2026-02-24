'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MansionCanvas } from '@/components/MansionCanvas'

export default function Home() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/check')
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) router.replace('/login')
        else setAuthed(true)
      })
      .catch(() => router.replace('/login'))
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  if (!authed) return null

  return (
    <main style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a12',
      overflow: 'hidden',
    }}>
      <button
        onClick={handleLogout}
        style={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 100,
          background: 'rgba(15, 15, 26, 0.8)',
          border: '1px solid #2a2a3e',
          borderRadius: 6,
          color: '#6a6a8a',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '5px 10px',
          cursor: 'pointer',
        }}
      >
        logout
      </button>
      <MansionCanvas />
    </main>
  )
}
