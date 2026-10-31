/**
 * Respeta la preferencia del sistema "reducir movimiento": si está activa,
 * los gráficos de Recharts se dibujan sin animación. Además permite capturar
 * pantallas estáticas (p. ej. Edge headless con --force-prefers-reduced-motion).
 */
export const ANIMATE =
  typeof window === 'undefined' ||
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
