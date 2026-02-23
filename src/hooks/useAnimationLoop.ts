'use client'

import { useRef, useEffect, useCallback } from 'react'
import { FRAME_RATE } from '@/lib/constants'

export function useAnimationLoop(callback: (frame: number) => void) {
  const frameRef = useRef(0)
  const lastTimeRef = useRef(0)
  const rafRef = useRef<number>(0)

  const animate = useCallback(
    (timestamp: number) => {
      const elapsed = timestamp - lastTimeRef.current
      if (elapsed > 1000 / FRAME_RATE) {
        frameRef.current++
        lastTimeRef.current = timestamp
        callback(frameRef.current)
      }
      rafRef.current = requestAnimationFrame(animate)
    },
    [callback]
  )

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate])
}
