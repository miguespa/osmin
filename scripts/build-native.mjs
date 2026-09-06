/**
 * Ensambla dist-native/ a partir de dist/, para empaquetar con Capacitor.
 *
 * El build web es multipágina: la raíz es la landing de marketing y la app vive
 * en /app. Capacitor, en cambio, carga siempre el index.html de la raíz de su
 * webDir, así que aquí la app pasa a ser la raíz y la landing se descarta: en
 * un binario instalado desde la App Store no pinta nada.
 *
 * Los assets conservan su ruta absoluta (/assets/...) porque en Capacitor la
 * raíz del bundle se sirve como /, así que resuelven sin tocar nada.
 */
import { cp, rm, mkdir, access } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const out = join(root, 'dist-native')

const exists = async p => { try { await access(p); return true } catch { return false } }

if (!(await exists(join(dist, 'app', 'index.html')))) {
  console.error('[build-native] falta dist/app/index.html — ejecuta primero `npm run build`')
  process.exit(1)
}

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

// La app pasa a ser la raíz.
await cp(join(dist, 'app', 'index.html'), join(out, 'index.html'))
await cp(join(dist, 'assets'), join(out, 'assets'), { recursive: true })

// Páginas legales y logo, si están: Apple exige la política accesible y
// conviene poder enlazarla desde dentro de la app sin salir al navegador.
for (const extra of ['privacidad', 'terminos', 'logo.png']) {
  if (await exists(join(dist, extra))) {
    await cp(join(dist, extra), join(out, extra), { recursive: true })
  }
}

console.log('[build-native] dist-native/ listo')
