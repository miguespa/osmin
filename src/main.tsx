import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App'
import AppleSignInButton from './components/AppleSignInButton'

import logoDark from '/logo-dark.png'

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

// Los avisos programados no sobreviven a una reinstalación, así que al arrancar
// se comprueba que el que dice la preferencia sigue en pie.
if (isNative) {
  void import('./lib/reminder').then(({ restoreReminder }) => restoreReminder())
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
 * El acceso va siempre en oscuro, sea cual sea el tema que tenga guardado el
 * usuario: es la portada de la app y conviene que quien la abre por primera vez
 * vea siempre lo mismo. Los valores son los de html[data-theme="dark"] en
 * index.css; se repiten aquí porque el tema del documento puede ser el claro.
 *
 * El acento sí se respeta, que es lo único que cada uno personaliza y sobrevive
 * en localStorage entre sesiones.
 */
const DARK = {
  bg: '#16161A',
  surface: '#1E1E22',
  surfaceAlt: '#232328',
  text: '#ECEAE4',
  textMuted: '#82807A',
  line: '#2C2C32',
}

/**
 * En nativo se ocultan los botones sociales que pinta Clerk, y con ellos su
 * separador. Todos hacen OAuth por redirección, y esa navegación se le escapa
 * al WebView: iOS la abre en Safari y la sesión se queda allí.
 *
 * Apple no se pierde por eso: lo pinta AppleSignInButton, que pide la
 * autorización al sistema y canjea el token sin navegar a ningún sitio. Lo que
 * sí queda fuera en nativo es Google, que necesita su propio SDK nativo.
 * En la web se muestran los dos con normalidad.
 */
const SIGN_IN_APPEARANCE = {
  variables: {
    colorPrimary: token('--accent') || '#C97A2A',
    colorBackground: DARK.surface,
    colorText: DARK.text,
    colorTextSecondary: DARK.textMuted,
    colorInputBackground: DARK.surfaceAlt,
    colorInputText: DARK.text,
    colorNeutral: DARK.text,
    colorBorder: DARK.line,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  elements: {
    // La tarjeta ya va dentro de un bloque que trae su propio encabezado.
    header: { display: 'none' },
    // El enlace de Clerk entre acceso y registro apunta al portal alojado, o sea
    // que en el binario nativo se salía a Safari: la cuenta se creaba allí, la
    // sesión se quedaba en el navegador y al volver seguías sin haber entrado.
    // Se oculta y debajo se pinta uno propio que solo cambia de componente.
    footerAction: { display: 'none' },
    // En nativo se van los sociales enteros, y con ellos su separador.
    ...(isNative ? { socialButtons: { display: 'none' }, dividerRow: { display: 'none' } } : {}),
  },
}

/**
 * Acceso y registro, los dos dentro de la app.
 *
 * `routing="virtual"` mantiene cada formulario en memoria, sin tocar la URL ni
 * navegar a ningún sitio, así que el alta entera —correo, contraseña y código de
 * verificación— ocurre sin salir del WebView. Al terminar, Clerk activa la
 * sesión y `<SignedIn>` se encarga del resto: no hace falta redirección.
 */
function Acceso() {
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar')

  return (
    <>
      {/* Va arriba, donde Clerk pone los suyos en la web, para que las dos
          plataformas ofrezcan el mismo orden. */}
      {isNative && (
        <>
          <AppleSignInButton />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '18px 0',
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: 12,
              color: DARK.textMuted,
            }}
          >
            <span style={{ flex: 1, height: 1, background: DARK.line }} />
            o
            <span style={{ flex: 1, height: 1, background: DARK.line }} />
          </div>
        </>
      )}

      {modo === 'entrar'
        ? <SignIn routing="virtual" appearance={SIGN_IN_APPEARANCE} />
        : <SignUp routing="virtual" appearance={SIGN_IN_APPEARANCE} />}

      <p
        style={{
          margin: '18px 0 0',
          textAlign: 'center',
          fontFamily: "'Inter', -apple-system, sans-serif",
          fontSize: 13,
          color: DARK.textMuted,
        }}
      >
        {modo === 'entrar' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
        <button
          type="button"
          onClick={() => setModo(m => (m === 'entrar' ? 'registro' : 'entrar'))}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            font: 'inherit',
            cursor: 'pointer',
            color: token('--accent') || '#C97A2A',
            fontWeight: 600,
          }}
        >
          {modo === 'entrar' ? 'Crear una' : 'Entrar'}
        </button>
      </p>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      // El marcador que trae la traducción no cabe en la anchura del móvil y
      // se corta a media palabra.
      localization={{ ...esES, formFieldInputPlaceholder__emailAddress: 'tucorreo@ejemplo.com' }}
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
            background: DARK.bg,
            padding: 'max(32px, env(safe-area-inset-top)) 22px max(32px, env(safe-area-inset-bottom))',
          }}
        >
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ textAlign: 'center' }}>
              {/* Siempre la versión para oscuro: este bloque no sigue al tema. */}
              <img
                src={logoDark}
                alt="Osmin"
                style={{ height: 38, width: 'auto', display: 'inline-block' }}
              />
              <p
                style={{
                  margin: '16px 0 0',
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: DARK.textMuted,
                }}
              >
                Tu vida en orden.
                <br />
                Hábitos, metas y diario.
              </p>
            </div>

            <div style={{ marginTop: 26 }}>
              <Acceso />
            </div>
          </div>
        </div>
      </SignedOut>
    </ClerkProvider>
  </StrictMode>
)
