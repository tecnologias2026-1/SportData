# SportData — Backend

Backend Node.js + Express + SQLite para SportData.  
Mismo patrón que ChipSail: **sin MySQL, sin compilación, sin archivos PHP**.

## Stack

- **Node.js 22+** (SQLite nativo via `node:sqlite`)
- **Express** para las rutas
- **bcryptjs** para contraseñas
- **jsonwebtoken** para sesiones JWT

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Registro de usuario |
| `POST` | `/api/auth/login` | Inicio de sesión |
| `GET`  | `/api/auth/me` | Usuario actual (JWT) |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `POST` | `/api/auth/forgot-password` | Solicitar código de recuperación |
| `POST` | `/api/auth/verify-reset-code` | Verificar código |
| `POST` | `/api/auth/reset-password` | Cambiar contraseña |
| `GET`  | `/api/products` | Productos (con filtros) |
| `GET`  | `/api/health` | Health check |

## Despliegue en Render

1. Sube **solo la carpeta `backend/`** a un repositorio Git (o el repo completo)
2. En Render → New Web Service → conecta el repo
3. **Root Directory:** `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Node Version:** `22` (en Environment → agregar `NODE_VERSION=22`)
7. Agrega las variables de entorno:
   - `JWT_SECRET` → un secreto largo y aleatorio
   - `JWT_EXPIRES_IN` → `7d`
   - `ALLOWED_ORIGIN` → URL exacta de tu frontend en Netlify (ej: `https://mi-sportdata.netlify.app`)

## Variables de entorno

Copia `env.example` a `.env` para desarrollo local:

```bash
cp env.example .env
```

## Desarrollo local

```bash
npm install
npm run dev   # Node 22+ requerido
```

## Base de datos

Se crea automáticamente en `database/sportdata.db` al primer arranque.  
En Render usa la misma ruta (el disco del servicio persiste entre deploys normales).

## Frontend

El frontend llama al backend via `js/api-config.js`:
- **Localhost:** `http://localhost:3000`
- **Producción:** la URL de Render que configures en `API_URL`

Asegúrate de actualizar `API_URL` en `js/api-config.js` con tu URL real de Render.
