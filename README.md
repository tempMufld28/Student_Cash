# Student-Cash
**Controla tus finanzas de manera simple.**

Aplicación web de gestión financiera diseñada para estudiantes de nivel medio superior. Permite registrar gastos e ingresos, visualizar distribución del dinero en gráficas en tiempo real, planificar gastos futuros y crear metas de ahorro personales.

> Proyecto desarrollado por el **Equipo DHEBOR** para la materia de Desarrollo Web — CECyT No. 5 "Benito Juárez", IPN · 6IV10

---

## app

> _Agrega aquí el link de Vercel cuando lo tengas_

---

## funcionalidades

| Módulo | Descripción |
|---|---|
| **Autenticación** | Registro e inicio de sesión con verificación OTP por correo |
| **Dashboard / Resumen** | Gráficas de distribución de gastos (pastel y barras), comparativa Ingresos vs. Gastos y Resumen Financiero |
| **Gastos** | CRUD completo de transacciones con categoría, monto, fecha y descripción |
| **Planificación** | Registro de gastos futuros con módulos de gasto extra, fechas límite y modo colaborativo |
| **Ahorro** | Creación de metas de ahorro personales o para planes con monto objetivo y fecha límite |
| **Invitaciones** | Recepción y gestión de invitaciones a planes colaborativos de gasto compartido |
| **Perfil** | Edición de nombre, correo, género, contraseña y borrado permanente de cuenta |
| **Modo oscuro** | Tema claro/oscuro propagado globalmente con `useTheme` |

---

## Stack Tecnológico

**Frontend**
- [React.js](https://react.dev) + [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com) + [Lucide React](https://lucide.dev)
- [React Router Dom](https://reactrouter.com) — navegación SPA sin recarga
- Recharts / Chart.js — gráficas analíticas

**Backend & Base de datos**
- [Node.js](https://nodejs.org)
- [Supabase](https://supabase.com) — BaaS: PostgreSQL + autenticación JWT + almacenamiento

**Despliegue**
- [Vercel](https://vercel.com) — hosting serverless con integración continua

**Control de versiones**
- GitHub

---

## Equipo DHEBOR

| Integrante | Rol |
|---|---|
| **Karol Martínez López** | Maquetado general, `Layout.jsx`, estados globales (`useTheme`, `useAuth`) |
| **Miguel Ángel Espinosa Sánchez** | Configuración del backend, esquemas SQL, credenciales de Supabase |
| **Edahí Santiago Sandoval Peña** | UI con Tailwind CSS, componentes del Dashboard, documentación |

---

## Información académica

- **Institución:** CECyT No. 5 "Benito Juárez" — IPN
- **Materia:** Desarrollo Web
- **Profesor:** Alberto Peña Mendoza
- **Grupo:** 6IV10
- **Ciclo:** 2025-2026

---

##  Licencia

Proyecto académico — uso educativo.
