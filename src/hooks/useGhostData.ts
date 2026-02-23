'use client'

import { useState, useEffect, useCallback } from 'react'
import type { HauntGhost } from '@/lib/types'
import { POLL_INTERVAL } from '@/lib/constants'
import { MOCK_GHOSTS } from '@/lib/mock-data'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export function useGhostData() {
  const [ghosts, setGhosts] = useState<HauntGhost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGhosts = useCallback(async () => {
    if (USE_MOCK) {
      setGhosts(MOCK_GHOSTS)
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/databases')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setGhosts(data.ghosts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGhosts()
    if (!USE_MOCK) {
      const interval = setInterval(fetchGhosts, POLL_INTERVAL)
      return () => clearInterval(interval)
    }
  }, [fetchGhosts])

  return { ghosts, error, loading, refetch: fetchGhosts }
}
