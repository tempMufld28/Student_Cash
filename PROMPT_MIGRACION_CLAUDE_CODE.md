# Prompt para Claude Code — Migración Student-Cash a GitHub + Vercel + Supabase + PWA

> Instrucciones de uso: antes de pegarlo en Claude Code, reemplaza cada bloque `[DECIDIR: ...]` con tu elección. No se lo des con las decisiones abiertas — obligarás al agente a asumir y asumirá mal.

---

## Contexto del proyecto

Soy el dueño del proyecto **Student-Cash**, una aplicación web de gestión financiera personal para estudiantes. Stack actual (abril 2026):

- **Frontend:** Vite + React 18 + Tailwind + react-router-dom + recharts + lucide-react + date-fns
- **Backend:** Node.js + Express + SQLite (`sqlite3`/`sqlite`) + JWT (`jsonwebtoken`) + `bcryptjs`
- **Hosting actual:** Firebase Hosting (sólo estático, sin Firestore/Auth/Functions)
- **Repo:** monorepo con `backend/`, `frontend/` y `package.json` raíz orquestando ambos con `concurrently`

## Objetivo

Llevar la app a producción con el stack final:

- **Repositorio:** GitHub (control de versiones + CI implícito vía Vercel)
- **Hosting:** Vercel con auto-deploy en cada push a `main`
- **Base de datos:** Supabase (Postgres administrado)
- **Modo:** PWA instalable con soporte offline

No es sólo una migración técnica: es el lanzamiento. Las decisiones arquitectónicas que tomemos ahora definen la forma del producto en producción.

---

## Decisiones arquitectónicas ya tomadas

1. **Autenticación:** Supabase Auth nativo con reset masivo de contraseñas. Es el camino más limpio para aprovechar RLS. Aceptamos el trade-off del reseteo.
2. **Destino del backend Express:** Eliminar Express por completo. El frontend consumirá supabase-js directo usando RLS. Cero backend que mantener.
3. **Datos existentes:** Base vacía en producción, no hay datos que migrar. Iniciaremos con un clean slate.
4. **Alcance PWA:** Instalable + offline shell + caché de lectura para las últimas transacciones vistas (estrategia StaleWhileRevalidate). Las mutaciones requieren red obligatoria, mostrando un aviso si no hay conexión.
5. **Estructura del repo:** Monorepo actual en un solo repo GitHub. Eliminaremos la carpeta backend/ en el proceso, por lo que todo quedará como un proyecto frontend estándar en la raíz.

---

## Trabajo esperado, por fases

Trabaja fase por fase. Al final de cada fase detente, resume cambios y espera mi confirmación antes de continuar. No commitees ni pushees sin confirmación explícita.

### Fase 0 — Auditoría previa

- Lee `backend/`, `frontend/` y `package.json` raíz.
- Lista endpoints Express actuales con método, ruta, auth requerida y tablas que tocan.
- Lista el esquema SQLite actual (tablas, columnas, tipos, constraints, índices).
- Reporta hallazgos en un `MIGRATION_AUDIT.md` antes de modificar código.

### Fase 1 — Supabase (esquema y políticas)

- Genera migraciones SQL en `supabase/migrations/` traduciendo el esquema SQLite a Postgres, respetando tipos (`INTEGER` → `bigint`/`int`, fechas → `timestamptz`, booleanos reales en vez de `0/1`).
- Añade índices equivalentes.
- Si la decisión de auth es Supabase Auth: configura `auth.users` como fuente de identidad y usa `user_id uuid references auth.users(id)` en tablas de dominio. Diseña **políticas RLS** por tabla para que cada usuario sólo vea/modifique sus filas.
- Si la decisión es JWT propio: mantén tabla `users` local con `password_hash`, sin RLS (o RLS permisiva con service role), y documenta el riesgo.
- Entrega un `supabase/README.md` con pasos para levantar el proyecto (CLI de Supabase, `supabase link`, `supabase db push`).

### Fase 2 — Backend

Según la decisión 2:

- **(a) Eliminar Express:** reescribe llamadas del frontend usando `@supabase/supabase-js`. Elimina `backend/`. Variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` en el cliente.
- **(b) Portar a Vercel Serverless:** mueve cada endpoint a `api/<recurso>.js` con firma `export default async function handler(req, res)`. Reemplaza `sqlite3` por `@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY` (sólo en server-side). Elimina el servidor Express persistente y `concurrently`. Actualiza CORS y manejo de `req.body`.
- **(c) Híbrido:** documenta la línea divisoria y justifícala.

En todos los casos: sin `sqlite3` en `package.json`, sin archivos `.db` en el repo, sin `data/` con estado.

### Fase 3 — PWA

- Instala y configura `vite-plugin-pwa` con `registerType: 'autoUpdate'`.
- Crea `manifest.webmanifest` con nombre, short_name, `start_url`, `display: standalone`, `theme_color`, `background_color` e íconos (192x192, 512x512, 512x512 maskable). Si no tengo íconos, genera placeholders vectoriales a partir del lucide-react existente y deja TODO para reemplazar.
- Configura estrategia de service worker según decisión 4. Por defecto: precache del shell (`NetworkFirst` para HTML, `CacheFirst` para assets hasheados, `StaleWhileRevalidate` para llamadas `GET` a Supabase).
- Añade prompt de instalación (`beforeinstallprompt`) con UI mínima.
- Verifica con Lighthouse que la app pase auditoría PWA (instalable + offline-capable).

### Fase 4 — Vercel + GitHub

- Crea `.gitignore` que excluya `node_modules`, `.env*`, `dist/`, `*.db`, `*.sqlite`.
- Crea `vercel.json` con:
  - `buildCommand` del frontend
  - `outputDirectory` correcto
  - `rewrites` para SPA fallback (`/((?!api).*)` → `/index.html`) si no hay Express
  - Sin el hack `firebase.json`
- Documenta variables de entorno requeridas en `.env.example` (sin valores reales): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (sólo si aplica), `JWT_SECRET` (sólo si aplica).
- Elimina `firebase.json`, `.firebaserc` y cualquier script de deploy a Firebase del `package.json`.
- Inicializa repo git (si no existe), crea rama `main`, prepara mensaje de commit inicial `chore: migrate to Vercel + Supabase + PWA`.
- Entrega un `DEPLOY.md` con: cómo conectar el repo a Vercel, qué variables poner en el dashboard de Vercel, cómo configurar el proyecto de Supabase, cómo correr las migraciones contra producción.

### Fase 5 — Verificación

- Corre el frontend localmente contra Supabase de staging y valida login, CRUD de las entidades principales y visualización offline (según decisión 4).
- Ejecuta Lighthouse y reporta scores (Performance, PWA, Best Practices).
- Lista pendientes conocidos y riesgos que no se cerraron en esta iteración.

---

## Reglas de trabajo

- No inventes librerías ni versiones. Si dudas de una API, búscala.
- No hagas refactors cosméticos fuera del alcance de la migración.
- Si detectas que alguna de las decisiones `[DECIDIR]` tiene una consecuencia que no consideré, para y avísame antes de elegir por mí.
- Mantén commits pequeños y con mensaje convencional (`feat:`, `chore:`, `refactor:`, `docs:`).
- Cero pelusas en la documentación. Profesional, directo, sin adulaciones.
- Al terminar cada fase, resume en viñetas qué se cambió y qué archivos fueron tocados.
