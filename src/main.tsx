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
          <SignIn routing="virtual" appearance={{ variables: { colorPrimary: '#C97A2A' } }} />
        </div>
      </SignedOut>
    </ClerkProvider>
  </StrictMode>
)
