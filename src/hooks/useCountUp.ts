import { useEffect, useRef, useState } from 'react'

/**
 * Interpola un número cuando cambia de valor (por ejemplo al cambiar de año).
 * Con `prefers-reduced-motion` devuelve el valor final sin animar.
 */
export function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = useState(value)
  const current = useRef(value)
  const frame = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !Number.isFinite(value)) {
      current.current = value
      setDisplay(value)
      return
    }

    const from = current.current
    if (from === value) return

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (value - from) * eased
      current.current = next
      setDisplay(next)
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else current.current = value
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [value, duration])

  return display
}
