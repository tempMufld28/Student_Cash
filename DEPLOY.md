# Deploy — Student-Cash

## Requisitos previos

- Cuenta en [Vercel](https://vercel.com)
- Proyecto en [Supabase](https://supabase.com) con migraciones aplicadas
- Repo en GitHub con este código

---

## 1. Supabase — aplicar migraciones

```bash
npm install -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
```

`PROJECT_REF` está en: Dashboard → Settings → General → Reference ID.

---

## 2. Obtener credenciales de Supabase

Dashboard → Settings → API:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key |

---

## 3. Conectar repo a Vercel

1. Vercel Dashboard → **Add New Project** → importar el repo de GitHub
2. Framework Preset: **Vite**
3. Build Command: `cd frontend && npm install && npm run build`
4. Output Directory: `frontend/dist`
5. Añadir variables de entorno (tab *Environment Variables*):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. **Deploy**

Cada push a `main` dispara deploy automático.

---

## 4. Variables de entorno locales

Copia `.env.example` a `frontend/.env.local` y rellena los valores reales:

```bash
cp .env.example frontend/.env.local
```
