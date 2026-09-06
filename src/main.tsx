import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

/**
 * El formulario de acceso se monta aquí dentro en vez de redirigir al portal
 * alojado de Clerk. En el binario nativo el WebView sirve desde un
 * esquema propio, así que una navegación a un dominio externo se la
 * queda el sistema y la abre en Safari: la sesión se quedaría en ese navegador
 * y la app nunca se enteraría de que el usuario ha entrado.
 *
 * `routing="virtual"` mantiene todo el flujo en memoria, sin tocar la URL, que
 * es lo que conviene cuando no hay barra de direcciones.
 */
// No se puede mirar el protocolo: el WebView se configura con iosScheme https,
// así que en nativo el origen también es https. Capacitor lo sabe de primera mano.
const isNative = Capacitor.isNativePlatform()
const APP_URL = isNative ? '/' : '/app'

// WKWebView pinta encima del teclado su barra de «campo anterior / siguiente /
// hecho». Es una ayuda de navegador dentro de formularios web y delata que
// debajo hay un WebView, así que en nativo se oculta.
if (isNative) {
  void import('@capacitor/keyboard')
    .then(({ Keyboard }) => Keyboard.setAccessoryBarVisible({ isVisible: false }))
    .catch(err => console.error('[Osmin] no se pudo ocultar el accessory bar:', err))
}

/**
 * El tema y el acento viven en Supabase y no se conocen hasta después de
 * iniciar sesión, así que App.tsx los deja cacheados en local y aquí se
 * reaplican antes del primer pintado. Sin esto la pantalla de acceso sale
 * siempre en claro, desentonando con el resto de la app.
 */
try {
  const theme = localStorage.getItem('osmin_theme')
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme
  const accent = localStorage.getItem('osmin_accent')
  if (accent) document.documentElement.style.setProperty('--accent', accent)
} catch { /* almacenamiento no disponible */ }

/** Lee un token del tema ya aplicado, para no duplicar la paleta de index.css. */
const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/**
 * En nativo se ocultan los botones sociales enteros, y con ellos su separador.
 * Todos hacen OAuth por redirección, y esa navegación se le escapa al WebView:
 * iOS la abre en Safari y la sesión se queda allí. Queda el email con código,
 * que funciona entero dentro de la app.
 *
 * Apple tuvo aquí un botón propio contra `oauth_token_apple`, que Clerk solo
 * acepta desde sus SDK nativos y rechaza con 403 desde el SDK web por mucho que
 * la app esté registrada. El componente sigue en el repo, sin usar, junto al
 * plugin de Swift y el entitlement, para cuando se retome por redirección.
 * En la web sí funciona, y ahí se muestra con normalidad.
 */
const SIGN_IN_APPEARANCE = {
  variables: {
    colorPrimary: token('--accent'),
    colorBackground: token('--surface'),
    colorText: token('--text'),
    colorTextSecondary: token('--text-muted'),
    colorInputBackground: token('--surface-alt'),
    colorInputText: token('--text'),
    colorNeutral: token('--text'),
    colorBorder: token('--line'),
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  ...(isNative
    ? { elements: { socialButtons: { display: 'none' }, dividerRow: { display: 'none' } } }
    : {}),
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={esES}
      signInFallbackRedirectUrl={APP_URL}
      signUpFallbackRedirectUrl={APP_URL}
    >
      <SignedIn>
        <App />
      </SignedIn>
      <SignedOut>
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-app)',
            padding: 'max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))',
          }}
        >
          <SignIn routing="virtual" appearance={SIGN_IN_APPEARANCE} />
        </div>
      </SignedOut>
    </ClerkProvider>
  </StrictMode>
)
