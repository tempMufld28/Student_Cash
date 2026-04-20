# Supabase — Student-Cash

## Requisitos

- Cuenta en [supabase.com](https://supabase.com)
- Supabase CLI instalado: `npm install -g supabase`

## Setup inicial

```bash
# Desde la raíz del repo
supabase login
supabase link --project-ref <TU_PROJECT_REF>
supabase db push
```

`<TU_PROJECT_REF>` está en Settings → General de tu proyecto en el dashboard.

## Variables de entorno

Crear `frontend/.env.local` (nunca commitear):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Ambos valores están en Settings → API del dashboard.

## Configuración de Auth

En el dashboard: Authentication → Providers → Email
- Deshabilitar "Confirm email" para desarrollo local (re-habilitar en producción).

## Esquema aplicado

`migrations/001_initial_schema.sql` crea:

| Tabla | Descripción |
|---|---|
| `profiles` | Nombre, género y avatar del usuario (ligado a `auth.users`) |
| `transactions` | Transacciones (Gasto/Ingreso) con categoría y fecha |
| `planned_expenses` | Gastos planificados con módulos y colaboradores (jsonb) |

RLS activo en todas las tablas: cada usuario solo accede a sus propias filas.

## Correr migraciones en producción

```bash
supabase db push --linked
```
