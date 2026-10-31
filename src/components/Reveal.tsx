import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Retardo en ms para escalonar la entrada de bloques hermanos. */
  delay?: number
  className?: string
  variant?: 'up' | 'fade'
}

/**
 * Revela su contenido cuando entra en el viewport. Si el usuario pidió reducir
 * movimiento (o el navegador no soporta IntersectionObserver) el contenido se
 * muestra de inmediato, sin animación.
 */
export function Reveal({ children, delay = 0, className = '', variant = 'up' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -32px 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${shown ? 'in' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
