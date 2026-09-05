import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/** Páginas estáticas servidas en su propia ruta, además de la landing. */
const STATIC_PAGES = ['privacidad', 'terminos']

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'app-route',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const path = req.url?.split('?')[0].split('#')[0] ?? ''
          if (path === '/app' || path.startsWith('/app/')) {
            const qs = req.url?.slice(path.length) ?? ''
            req.url = '/app/index.html' + qs
          } else {
            // En producción Vercel sirve el index.html del directorio; en dev hay
            // que mapearlo a mano para que /privacidad y /terminos funcionen igual.
            const page = STATIC_PAGES.find(p => path === `/${p}` || path === `/${p}/`)
            if (page) req.url = `/${page}/index.html`
          }
          next()
        })
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
        ...Object.fromEntries(
          STATIC_PAGES.map(p => [p, resolve(__dirname, `${p}/index.html`)])
        ),
      },
    },
  },
})
