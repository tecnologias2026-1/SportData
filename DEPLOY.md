# 🚀 SportData — Guía de Despliegue

## Arquitectura

```
Netlify (frontend estático)  →  Render (backend Node.js + DB JSON)
      index.html, CSS, JS          /api/auth, /api/products
```

---

## Paso 1 — Subir el Backend a Render

### Opción A: Desde GitHub (recomendado)
1. Sube **todo el proyecto** a un repositorio en GitHub
2. Ve a [render.com](https://render.com) → **New Web Service**
3. Conecta tu repo de GitHub
4. Configura:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### Variables de entorno en Render:
| Variable | Valor |
|----------|-------|
| `PORT` | `10000` (Render lo pone automáticamente) |
| `JWT_SECRET` | Una clave larga y aleatoria |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | La URL de Netlify (la pones después) |

5. Haz clic en **Deploy**
6. Copia la URL que te da Render → algo como `https://sportdata-api.onrender.com`

> ⚠️ La DB (sportdata.json) se crea automáticamente en Render al registrar el primer usuario.
> **Importante:** en el plan gratuito de Render, el servidor "duerme" después de 15 min de inactividad y el archivo JSON se puede borrar al reiniciar. Para datos permanentes usa el plan pagado o un disco persistente en Render.

---

## Paso 2 — Configurar el Frontend

### Edita `js/config.js`
Cambia la URL de Render que obtuviste en el paso anterior:

```js
// js/config.js
window.SPORTDATA_API_URL = 'https://sportdata-api.onrender.com';  // ← tu URL real
```

---

## Paso 3 — Subir el Frontend a Netlify

### Opción A: Arrastrar y soltar (más fácil)
1. Ve a [netlify.com](https://netlify.com) → **Add new site** → **Deploy manually**
2. Arrastra **la carpeta raíz del proyecto** (no la carpeta `backend`)
3. Netlify te da una URL tipo `https://random-name.netlify.app`

### Opción B: Desde GitHub
1. En Netlify → **New site from Git**
2. Conecta tu repo
3. Configura:
   - **Base directory**: *(vacío, raíz del repo)*
   - **Publish directory**: `.`
   - **Build command**: *(vacío)*

---

## Paso 4 — Conectar todo

1. Copia tu URL de Netlify (ej: `https://mi-sportdata.netlify.app`)
2. Ve a Render → tu servicio → **Environment**
3. Actualiza `FRONTEND_URL` con esa URL
4. Render hará un redeploy automático

---

## Resumen de archivos importantes

| Archivo | Para qué |
|---------|----------|
| `js/config.js` | URL del backend (Render) |
| `netlify.toml` | Configuración de Netlify |
| `backend/render.yaml` | Configuración de Render |
| `backend/.env` | Variables locales (NO subir a Git) |

---

## Prueba local

```bash
cd backend
npm install
node server.js
```
Abre `http://localhost:3000`

