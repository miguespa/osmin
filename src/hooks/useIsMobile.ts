import { useState, useEffect } from 'react'

// Breakpoint compartido con los media queries de index.css
export const MOBILE_BREAKPOINT = 768

/**
 * Devuelve true cuando el viewport es de tamaño móvil (<= 768px).
 * Reactivo a rotación y resize vía matchMedia.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const query = `(max-width: ${breakpoint}px)`
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
