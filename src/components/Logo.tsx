import type { CSSProperties } from 'react'
import logoLight from '/logo.png'
import logoDark from '/logo-dark.png'

/**
 * El logotipo lleva el nombre en gris oscuro, que sobre el tema oscuro no se
 * lee. Antes se resolvía con `brightness(0) invert(1)`, que lo dejaba todo
 * blanco y se comía el degradado del icono —y encima lo hacía invisible en el
 * tema claro, porque el fondo ahí también es claro—.
 *
 * Así que hay dos ficheros, uno por tema, y los intercambia el CSS: sin estado
 * ni parpadeo al cargar, que es lo que pasaría leyendo el tema desde React.
 */
export default function Logo({ height, style, className = '' }: {
  height: number
  style?: CSSProperties
  className?: string
}) {
  const common: CSSProperties = { height, width: 'auto', ...style }
  return (
    <>
      <img src={logoLight} alt="Osmin" className={`osmin-logo osmin-logo--light ${className}`} style={common} />
      <img src={logoDark} alt="" aria-hidden="true" className={`osmin-logo osmin-logo--dark ${className}`} style={common} />
    </>
  )
}
