# Osmin

Habit tracker y diario mensual. Registra hábitos diarios, escribe highlights de cada día y consulta tus estadísticas del mes.

## Stack

- HTML + CSS + JavaScript puro (sin build step)
- React 18 + Babel Standalone vía CDN
- Datos 100% locales — `localStorage`, sin backend

## Estructura

```
landing-a.html   Landing page principal
login.html       Pantalla de acceso
Osmin.html       App principal
account.html     Panel de cuenta
app.jsx          Shell de la app + estado global
data.jsx         Modelo de datos y helpers
table-layout.jsx Vista tabla mensual
journal-layout.jsx Vista bitácora
overview.jsx     Vista de highlights y estadísticas
tweaks-panel.jsx Panel de ajustes visuales
```

## Desarrollo local

```bash
python3 -m http.server 8080
# Abrir http://localhost:8080/landing-a.html
```

## Despliegue

Conecta el repositorio a [Vercel](https://vercel.com). No requiere configuración adicional — `vercel.json` ya incluye las cabeceras de seguridad.
