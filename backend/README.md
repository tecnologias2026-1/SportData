# SportData — Backend Node.js

Backend para el sistema de autenticación (login / registro) de SportData.

## 🛠 Tecnologías

| Herramienta | Uso |
|---|---|
| **Node.js** | Entorno de ejecución |
| **Express** | Servidor HTTP |
| **better-sqlite3** | Base de datos local (SQLite) |
| **bcryptjs** | Hash de contraseñas |
| **jsonwebtoken** | Sesiones con JWT |
| **nodemon** | Recarga automática en desarrollo |

---

## 🚀 Instalación y ejecución local (VS Code)

### 1 · Requisitos previos

- [Node.js 18+](https://nodejs.org/) instalado
- Tener el proyecto abierto en VS Code

### 2 · Instalar dependencias

Abre la terminal integrada de VS Code (`Ctrl + ` ` `) y entra a la carpeta backend:

```bash
cd backend
npm install
```

### 3 · Configurar variables de entorno

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Edita `.env` si quieres cambiar el puerto o el secreto JWT.

### 4 · Iniciar el servidor

```bash
# Modo desarrollo (recarga automática)
npm run dev

# Modo producción
npm start
```

Verás en la consola:

```
  ╔══════════════════════════════════════╗
  ║   SportData Backend — Node.js        ║
  ╠══════════════════════════════════════╣
  ║   URL:  http://localhost:3000         ║
  ║   DB:   SQLite (sportdata.db)        ║
  ╚══════════════════════════════════════╝

  ✔  Base de datos SQLite inicializada: sportdata.db
```

### 5 · Abrir el frontend

Con el servidor activo, abre el navegador en:

```
http://localhost:3000
```

> El servidor sirve automáticamente todos los archivos HTML del proyecto.

---

## 📁 Estructura de archivos

```
backend/
├── server.js              ← Punto de entrada
├── package.json
├── .env.example           ← Plantilla de variables de entorno
├── .gitignore
│
├── database/
│   ├── db.js              ← Conexión e inicialización de SQLite
│   ├── script.sql         ← Esquema de referencia
│   └── sportdata.db       ← Archivo DB (se crea automáticamente)
│
├── routes/
│   └── auth.js            ← Endpoints de autenticación
│
├── middleware/
│   └── auth.js            ← Verificación de JWT
│
└── register.js            ← JS del frontend (reemplaza js/register.js)
```

---

## 📡 Endpoints disponibles

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/register` | Crear cuenta nueva | ✗ |
| `POST` | `/api/auth/login` | Iniciar sesión | ✗ |
| `GET` | `/api/auth/me` | Obtener perfil | ✔ JWT |
| `POST` | `/api/auth/logout` | Cerrar sesión | ✔ JWT |
| `GET` | `/api/health` | Estado del servidor | ✗ |

### Ejemplo: Registro

**Request**
```json
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Juan Pérez",
  "email": "juan@email.com",
  "password": "MiPass123"
}
```

**Response 201**
```json
{
  "message": "¡Cuenta creada exitosamente!",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "fullName": "Juan Pérez",
    "email": "juan@email.com"
  }
}
```

### Ejemplo: Login

**Request**
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@email.com",
  "password": "MiPass123"
}
```

**Response 200**
```json
{
  "message": "¡Sesión iniciada correctamente!",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "fullName": "Juan Pérez",
    "email": "juan@email.com"
  }
}
```

---

## 🔧 Paso final: conectar el frontend

Reemplaza el archivo `js/register.js` de tu proyecto con `backend/register.js`:

```bash
# Desde la raíz del proyecto
copy backend\register.js js\register.js     # Windows
cp   backend/register.js js/register.js     # Mac/Linux
```

---

## 🗄 Base de datos

- El archivo `sportdata.db` se crea automáticamente la primera vez que ejecutas el servidor.
- Se guarda en `backend/database/sportdata.db`.
- Puedes inspeccionarlo con la extensión **SQLite Viewer** de VS Code.

---

## ✅ Verificar que funciona

Con el servidor activo, abre en el navegador:

```
http://localhost:3000/api/health
```

Deberías ver:
```json
{ "status": "ok", "message": "SportData API funcionando correctamente" }
```
