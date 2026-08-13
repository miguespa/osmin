# Osmin

Habit tracker y diario mensual. Registra hábitos diarios, escribe highlights de cada día y consulta tus estadísticas del mes.

## Stack

- Vite + React 18 + TypeScript
- Clerk para autenticación
- Supabase (Postgres) para los datos, con RLS por `clerk_user_id()`

## Estructura

```
src/App.tsx               Shell de la app, carga y mutadores por intención
src/data.ts               Modelo de datos y helpers (buildBlankMonth, estadísticas)
src/types.ts              Tipos compartidos
src/lib/supabase.ts       Cliente Supabase con el JWT de Clerk
src/lib/db.ts             Carga y escrituras contra la base de datos
src/hooks/useWriteQueue.ts  Cola de escrituras dirigida por acciones del usuario
src/components/           Vistas (tabla, bitácora, estadísticas, edición, ajustes)
landing-a.html            Landing page principal
login.html                Pantalla de acceso
```

## Cómo se escriben los datos

Esta parte tiene reglas explícitas porque su ausencia costó dos pérdidas de
datos (julio y agosto de 2026), ambas con el mismo patrón: el cliente fabricaba
un estado que el usuario nunca había escrito y lo persistía encima de datos
reales.

**Cada operación de escritura nombra una intención, y solo puede tocar lo que esa
intención implica.** No existe un «guarda el mes entero»:

| RPC | Qué escribe | Garantía |
|---|---|---|
| `create_month` | un mes nuevo completo | **solo inserta**; si el mes ya existe falla con `OSM01` |
| `save_day` | un único día | el mes debe existir; nunca lo crea |
| `save_habits` | el conjunto de hábitos | no puede dejarlo vacío; concurrencia optimista |
| `save_goals` | el conjunto de hitos | concurrencia optimista |
| `delete_month` | borra el mes | guarda copia (`pre-delete`) antes |
| `restore_month_snapshot` | restaura una copia | guarda copia (`pre-restore`) antes |

Las reglas que sostienen esto:

1. **Crear un mes está desacoplado de editar un día.** Son RPC distintas, y la de
   crear jamás sobrescribe. Un estado en blanco fabricado por el cliente no puede
   pisar un mes con contenido: lo rechaza Postgres, no la memoria del cliente.
2. **Las escrituras nacen de acciones del usuario**, no de comparar estados
   (`src/hooks/useWriteQueue.ts`). Si el usuario no edita nada, no se escribe
   nada, por corrupto que esté lo que haya en memoria.
3. **La carga es todo-o-nada** (`fetchAllData`). Un error en cualquiera de las
   seis consultas aborta la carga entera: es preferible una pantalla de error a
   un estado a medias que después se persista.
4. **Si la carga falla, no se inventa estado.** Se muestra un error con reintento.
5. **Todo cambio estructural deja copia** en `month_snapshots`, tabla append-only
   sin FK, para poder recuperar cualquier estado anterior.

### Migraciones SQL

Se aplican desde Supabase → SQL Editor, en orden:

```
supabase-reset-clean.sql             esquema base
supabase-fix-pk.sql                  PK y unique constraints
supabase-fix-month-atomic-save.sql   save_month + month_snapshots (histórico)
supabase-split-write-intents.sql     API de escritura por intención (vigente)
supabase-guard-legacy-save-month.sql guarda temporal sobre save_month
supabase-harden-clerk-user-id.sql    search_path fijo en clerk_user_id()
```

`supabase-restore-august-2026.sql` es un rescate puntual, no una migración.

`supabase-guard-legacy-save-month.sql` es temporal: protege a los clientes aún no
actualizados. Se retira junto con `save_month` cuando el despliegue esté verificado.

## Desarrollo local

```bash
npm install
npm run dev
```

Requiere `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y la clave de Clerk
en el entorno.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # tsc -b && vite build
```

## Despliegue

Conecta el repositorio a [Vercel](https://vercel.com). `vercel.json` ya incluye
las cabeceras de seguridad.
